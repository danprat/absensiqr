/**
 * Authentication Routes
 * Handles user registration, login, token refresh, and password reset
 */

import { Hono } from 'hono';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { createDb, type Env } from '../db';
import { 
  schools, 
  users, 
  refreshTokens, 
  passwordResetTokens,
  type NewSchool,
  type NewUser,
  type NewRefreshToken,
  type NewPasswordResetToken
} from '../db/schema';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../lib/password';
import { generateToken, generateRefreshToken, verifyToken } from '../lib/jwt';
import { authMiddleware, getAuthUser } from '../middleware/auth';
import { createEmailService } from '../lib/email';
import { generatePasswordResetEmail, getPasswordResetSubject } from '../emails/password-reset';

const auth = new Hono<{ Bindings: Env }>();

/**
 * Rate limiting store (in-memory for MVP)
 * Format: { [email]: { attempts: number, resetAt: number } }
 */
const loginAttempts = new Map<string, { attempts: number; resetAt: number }>();

/**
 * Rate limiting configuration
 */
const RATE_LIMIT = {
  MAX_ATTEMPTS: 5,
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
};

/**
 * Check and update rate limiting
 */
function checkRateLimit(email: string): { allowed: boolean; remainingAttempts?: number; resetAt?: Date } {
  const now = Date.now();
  const record = loginAttempts.get(email);
  
  // No record or expired
  if (!record || now > record.resetAt) {
    loginAttempts.set(email, { attempts: 1, resetAt: now + RATE_LIMIT.WINDOW_MS });
    return { allowed: true, remainingAttempts: RATE_LIMIT.MAX_ATTEMPTS - 1 };
  }
  
  // Check if limit exceeded
  if (record.attempts >= RATE_LIMIT.MAX_ATTEMPTS) {
    return { 
      allowed: false, 
      resetAt: new Date(record.resetAt)
    };
  }
  
  // Increment attempts
  record.attempts++;
  return { allowed: true, remainingAttempts: RATE_LIMIT.MAX_ATTEMPTS - record.attempts };
}

/**
 * Reset rate limiting for an email
 */
function resetRateLimit(email: string): void {
  loginAttempts.delete(email);
}

/**
 * POST /api/auth/register
 * Register a new school with admin user
 */
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const { 
      schoolName, 
      subdomain, 
      adminName, 
      adminEmail, 
      password,
      primaryColor,
      timezone = 'WIB'
    } = body;
    
    // Validate required fields
    if (!schoolName || !subdomain || !adminName || !adminEmail || !password) {
      return c.json(
        {
          error: 'Validation Error',
          message: 'Missing required fields',
          required: ['schoolName', 'subdomain', 'adminName', 'adminEmail', 'password'],
        },
        400
      );
    }
    
    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return c.json(
        {
          error: 'Validation Error',
          message: 'Password does not meet requirements',
          errors: passwordValidation.errors,
        },
        400
      );
    }
    
    // Validate subdomain format (lowercase alphanumeric and hyphens only)
    const subdomainRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
    if (!subdomainRegex.test(subdomain)) {
      return c.json(
        {
          error: 'Validation Error',
          message: 'Subdomain must contain only lowercase letters, numbers, and hyphens',
        },
        400
      );
    }
    
    const db = createDb(c.env);
    
    // Check if subdomain already exists
    const existingSchool = await db
      .select()
      .from(schools)
      .where(eq(schools.subdomain, subdomain))
      .limit(1);
    
    if (existingSchool.length > 0) {
      return c.json(
        {
          error: 'Conflict',
          message: 'Subdomain already taken',
        },
        409
      );
    }
    
    // Check if admin email already exists in any school
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);
    
    if (existingUser.length > 0) {
      return c.json(
        {
          error: 'Conflict',
          message: 'Email already registered',
        },
        409
      );
    }
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Create school
    const newSchool: NewSchool = {
      name: schoolName,
      subdomain,
      status: 'pending', // Pending approval by super admin
      ...(primaryColor && { primaryColor }),
      timezone: timezone as 'WIB' | 'WITA' | 'WIT',
    };
    
    const [createdSchool] = await db.insert(schools).values(newSchool).returning();
    
    if (!createdSchool) {
      return c.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to create school',
        },
        500
      );
    }
    
    // Create admin user
    const newUser: NewUser = {
      schoolId: createdSchool.id,
      email: adminEmail,
      passwordHash,
      name: adminName,
      role: 'school_admin',
      isActive: true,
    };
    
    const [createdUser] = await db.insert(users).values(newUser).returning();
    
    if (!createdUser) {
      return c.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to create user',
        },
        500
      );
    }
    
    // Generate tokens
    const jwtSecret = c.env.JWT_SECRET;
    const accessToken = await generateToken(
      {
        userId: createdUser.id,
        schoolId: createdSchool.id,
        role: createdUser.role,
        email: createdUser.email,
      },
      jwtSecret,
      '7d' // 7 days
    );
    
    const refreshToken = await generateRefreshToken(createdUser.id, jwtSecret);
    
    // Store refresh token in database
    const newRefreshToken: NewRefreshToken = {
      userId: createdUser.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };
    
    await db.insert(refreshTokens).values(newRefreshToken);
    
    return c.json(
      {
        message: 'Registration successful. Your school is pending approval.',
        school: {
          id: createdSchool.id,
          name: createdSchool.name,
          subdomain: createdSchool.subdomain,
          status: createdSchool.status,
        },
        user: {
          id: createdUser.id,
          name: createdUser.name,
          email: createdUser.email,
          role: createdUser.role,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 7 * 24 * 60 * 60, // seconds
        },
      },
      201
    );
  } catch (error) {
    console.error('Registration error:', error);
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to register school',
      },
      500
    );
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;
    
    // Validate required fields
    if (!email || !password) {
      return c.json(
        {
          error: 'Validation Error',
          message: 'Email and password are required',
        },
        400
      );
    }
    
    // Check rate limiting
    const rateCheck = checkRateLimit(email);
    if (!rateCheck.allowed) {
      const minutesRemaining = Math.ceil((rateCheck.resetAt!.getTime() - Date.now()) / 60000);
      return c.json(
        {
          error: 'Too Many Requests',
          message: `Too many login attempts. Please try again in ${minutesRemaining} minutes.`,
          retryAfter: rateCheck.resetAt,
        },
        429
      );
    }
    
    const db = createDb(c.env);
    
    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    if (!user) {
      return c.json(
        {
          error: 'Unauthorized',
          message: 'Invalid email or password',
        },
        401
      );
    }
    
    // Check if user is active
    if (!user.isActive) {
      return c.json(
        {
          error: 'Forbidden',
          message: 'Account is disabled',
        },
        403
      );
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    
    if (!isValidPassword) {
      return c.json(
        {
          error: 'Unauthorized',
          message: 'Invalid email or password',
          remainingAttempts: rateCheck.remainingAttempts,
        },
        401
      );
    }
    
    // Reset rate limiting on successful login
    resetRateLimit(email);
    
    // Get school info
    const [school] = await db
      .select()
      .from(schools)
      .where(eq(schools.id, user.schoolId))
      .limit(1);
    
    if (!school) {
      return c.json(
        {
          error: 'Internal Server Error',
          message: 'School not found',
        },
        500
      );
    }
    
    // Check school status
    if (school.status === 'suspended') {
      return c.json(
        {
          error: 'Forbidden',
          message: 'School account is suspended',
        },
        403
      );
    }
    
    // Generate tokens
    const jwtSecret = c.env.JWT_SECRET;
    const accessToken = await generateToken(
      {
        userId: user.id,
        schoolId: user.schoolId,
        role: user.role,
        email: user.email,
      },
      jwtSecret,
      '7d' // 7 days
    );
    
    const refreshToken = await generateRefreshToken(user.id, jwtSecret);
    
    // Store refresh token in database
    const newRefreshToken: NewRefreshToken = {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };
    
    await db.insert(refreshTokens).values(newRefreshToken);
    
    return c.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
      },
      school: {
        id: school.id,
        name: school.name,
        subdomain: school.subdomain,
        status: school.status,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 7 * 24 * 60 * 60, // seconds
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to login',
      },
      500
    );
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
auth.post('/refresh', async (c) => {
  try {
    const body = await c.req.json();
    const { refreshToken: token } = body;
    
    if (!token) {
      return c.json(
        {
          error: 'Validation Error',
          message: 'Refresh token is required',
        },
        400
      );
    }
    
    const db = createDb(c.env);
    const jwtSecret = c.env.JWT_SECRET;
    
    // Verify refresh token
    const result = await verifyToken(token, jwtSecret);
    
    if (!result.valid || !result.payload) {
      return c.json(
        {
          error: 'Unauthorized',
          message: 'Invalid or expired refresh token',
        },
        401
      );
    }
    
    // Check if refresh token exists in database and is not revoked
    const [storedToken] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.token, token),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, new Date())
        )
      )
      .limit(1);
    
    if (!storedToken) {
      return c.json(
        {
          error: 'Unauthorized',
          message: 'Refresh token is invalid or has been revoked',
        },
        401
      );
    }
    
    // Get user info
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, storedToken.userId))
      .limit(1);
    
    if (!user || !user.isActive) {
      return c.json(
        {
          error: 'Unauthorized',
          message: 'User not found or inactive',
        },
        401
      );
    }
    
    // Generate new access token
    const accessToken = await generateToken(
      {
        userId: user.id,
        schoolId: user.schoolId,
        role: user.role,
        email: user.email,
      },
      jwtSecret,
      '7d' // 7 days
    );
    
    return c.json({
      message: 'Token refreshed successfully',
      tokens: {
        accessToken,
        expiresIn: 7 * 24 * 60 * 60, // seconds
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to refresh token',
      },
      500
    );
  }
});

/**
 * POST /api/auth/logout
 * Invalidate refresh token
 */
auth.post('/logout', authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const { refreshToken: token } = body;
    
    if (!token) {
      return c.json(
        {
          error: 'Validation Error',
          message: 'Refresh token is required',
        },
        400
      );
    }
    
    const db = createDb(c.env);
    
    // Revoke refresh token
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.token, token));
    
    return c.json({
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to logout',
      },
      500
    );
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset token and send email
 */
auth.post('/forgot-password', async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;
    
    if (!email) {
      return c.json(
        {
          error: 'Validation Error',
          message: 'Email is required',
        },
        400
      );
    }
    
    const db = createDb(c.env);
    
    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    // Always return success to prevent email enumeration
    if (!user) {
      return c.json({
        message: 'If the email exists, a password reset link has been sent',
      });
    }
    
    // Generate random reset token
    const resetToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    // Store reset token
    const newResetToken: NewPasswordResetToken = {
      userId: user.id,
      token: resetToken,
      expiresAt,
    };
    
    await db.insert(passwordResetTokens).values(newResetToken);
    
    // Generate reset link (adjust frontend URL as needed)
    const frontendUrl = c.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
    
    // Send email
    const resendApiKey = c.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not configured');
      return c.json({
        message: 'If the email exists, a password reset link has been sent',
      });
    }
    
    const emailService = createEmailService(resendApiKey);
    const emailHtml = generatePasswordResetEmail({
      userName: user.name,
      resetLink,
      expiryHours: 1,
    });
    
    await emailService.sendEmail({
      to: user.email,
      subject: getPasswordResetSubject(),
      html: emailHtml,
    });
    
    return c.json({
      message: 'If the email exists, a password reset link has been sent',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to process password reset request',
      },
      500
    );
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with valid token
 */
auth.post('/reset-password', async (c) => {
  try {
    const body = await c.req.json();
    const { token, password } = body;
    
    if (!token || !password) {
      return c.json(
        {
          error: 'Validation Error',
          message: 'Token and password are required',
        },
        400
      );
    }
    
    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return c.json(
        {
          error: 'Validation Error',
          message: 'Password does not meet requirements',
          errors: passwordValidation.errors,
        },
        400
      );
    }
    
    const db = createDb(c.env);
    
    // Find valid reset token
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      )
      .limit(1);
    
    if (!resetToken) {
      return c.json(
        {
          error: 'Bad Request',
          message: 'Invalid or expired reset token',
        },
        400
      );
    }
    
    // Hash new password
    const passwordHash = await hashPassword(password);
    
    // Update user password
    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, resetToken.userId));
    
    // Mark token as used
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, resetToken.id));
    
    // Revoke all refresh tokens for this user
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.userId, resetToken.userId));
    
    return c.json({
      message: 'Password reset successful. Please login with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to reset password',
      },
      500
    );
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user info
 */
auth.get('/me', authMiddleware, async (c) => {
  try {
    const user = getAuthUser(c as any);
    
    const db = createDb(c.env);
    
    // Get fresh user data from database
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1);
    
    if (!dbUser) {
      return c.json(
        {
          error: 'Not Found',
          message: 'User not found',
        },
        404
      );
    }
    
    // Get school info
    const [school] = await db
      .select()
      .from(schools)
      .where(eq(schools.id, dbUser.schoolId))
      .limit(1);
    
    return c.json({
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        schoolId: dbUser.schoolId,
        isActive: dbUser.isActive,
        createdAt: dbUser.createdAt,
      },
      school: school ? {
        id: school.id,
        name: school.name,
        subdomain: school.subdomain,
        status: school.status,
        logoUrl: school.logoUrl,
        primaryColor: school.primaryColor,
        timezone: school.timezone,
      } : null,
    });
  } catch (error) {
    console.error('Get user error:', error);
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to get user info',
      },
      500
    );
  }
});

export default auth;
