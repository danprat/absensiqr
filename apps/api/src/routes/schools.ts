/**
 * School Management Routes
 * Handles school registration, approval, and management operations
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { createDb, type Env } from '../db';
import { schools, users, type NewSchool, type NewUser } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { requireSuperAdmin, requireSchoolAdmin } from '../middleware/rbac';
import { tenantMiddleware, getSchoolId, getTenantContext } from '../middleware/tenant';
import { hashPassword } from '../lib/password';
import { createEmailService } from '../lib/email';
import {
  generateSchoolRegistrationEmail,
  getSchoolRegistrationSubject,
} from '../emails/school-registration';
import {
  generateSchoolApprovedEmail,
  getSchoolApprovedSubject,
} from '../emails/school-approved';
import { validateSchoolHours, type SchoolHours } from '../lib/timezone';

/**
 * Initialize router with type-safe environment
 */
const app = new Hono<{ Bindings: Env }>();

/**
 * SUBDOMAIN VALIDATION
 */

// Reserved system subdomains that cannot be used by schools
const RESERVED_SUBDOMAINS = [
  'api',
  'www',
  'admin',
  'super-admin',
  'app',
  'dashboard',
  'auth',
  'login',
  'register',
  'support',
  'help',
  'docs',
  'blog',
  'mail',
  'email',
];

/**
 * Validate subdomain format and check if it's reserved
 * 
 * @param subdomain - Subdomain string to validate
 * @returns Validation result with errors if any
 */
function validateSubdomain(subdomain: string): {
  valid: boolean;
  error?: string;
} {
  // Check length
  if (subdomain.length < 3 || subdomain.length > 50) {
    return {
      valid: false,
      error: 'Subdomain must be between 3 and 50 characters',
    };
  }
  
  // Check format: alphanumeric and hyphens only, must start and end with alphanumeric
  const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
  
  if (!subdomainRegex.test(subdomain.toLowerCase())) {
    return {
      valid: false,
      error: 'Subdomain can only contain lowercase letters, numbers, and hyphens, and must start and end with alphanumeric characters',
    };
  }
  
  // Check if reserved
  if (RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase())) {
    return {
      valid: false,
      error: 'This subdomain is reserved and cannot be used',
    };
  }
  
  return { valid: true };
}

/**
 * Check if subdomain is already taken
 * 
 * @param db - Database instance
 * @param subdomain - Subdomain to check
 * @param excludeSchoolId - Optional school ID to exclude (for updates)
 * @returns True if available, false if taken
 */
async function isSubdomainAvailable(
  db: ReturnType<typeof createDb>,
  subdomain: string,
  excludeSchoolId?: string
): Promise<boolean> {
  const existing = await db
    .select()
    .from(schools)
    .where(eq(schools.subdomain, subdomain.toLowerCase()))
    .limit(1);
  
  if (existing.length === 0) {
    return true;
  }
  
  // If updating, allow if it's the same school
  if (excludeSchoolId && existing[0]!.id === excludeSchoolId) {
    return true;
  }
  
  return false;
}

/**
 * ZOD VALIDATION SCHEMAS
 */

// School hours schedule validation
const dayScheduleSchema = z.object({
  start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:mm'),
  end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:mm'),
});

const schoolHoursSchema = z.object({
  monday: dayScheduleSchema.optional(),
  tuesday: dayScheduleSchema.optional(),
  wednesday: dayScheduleSchema.optional(),
  thursday: dayScheduleSchema.optional(),
  friday: dayScheduleSchema.optional(),
  saturday: dayScheduleSchema.optional(),
  sunday: dayScheduleSchema.optional(),
}).refine(
  (data) => {
    // At least one day must be defined
    return Object.values(data).some(day => day !== undefined);
  },
  { message: 'At least one school day must be defined' }
);

// School registration request
const schoolRegistrationSchema = z.object({
  schoolName: z.string().min(3, 'School name must be at least 3 characters').max(255),
  subdomain: z.string().min(3).max(50),
  adminName: z.string().min(3, 'Admin name must be at least 3 characters').max(255),
  adminEmail: z.string().email('Invalid email format'),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters'),
  timezone: z.enum(['WIB', 'WITA', 'WIT'], {
    errorMap: () => ({ message: 'Timezone must be WIB, WITA, or WIT' }),
  }),
  maxStudents: z.number().int().min(10).max(10000).optional().default(100),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  schoolHours: schoolHoursSchema.optional(),
});

// School update request
const schoolUpdateSchema = z.object({
  name: z.string().min(3).max(255).optional(),
  logoUrl: z.string().url('Invalid URL format').optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  schoolHours: schoolHoursSchema.optional(),
  maxStudents: z.number().int().min(10).max(10000).optional(),
  timezone: z.enum(['WIB', 'WITA', 'WIT']).optional(),
});

/**
 * ROUTES
 */

/**
 * POST /api/schools/register
 * Submit school registration (public endpoint)
 */
app.post('/register', async (c) => {
  try {
    const db = createDb(c.env);
    
    // Parse and validate request body
    const body = await c.req.json();
    const validatedData = schoolRegistrationSchema.parse(body);
    
    // Validate subdomain format
    const subdomainValidation = validateSubdomain(validatedData.subdomain);
    if (!subdomainValidation.valid) {
      return c.json(
        {
          error: 'Validation Error',
          message: subdomainValidation.error,
        },
        400
      );
    }
    
    // Check subdomain availability
    const isAvailable = await isSubdomainAvailable(db, validatedData.subdomain);
    if (!isAvailable) {
      return c.json(
        {
          error: 'Validation Error',
          message: 'Subdomain is already taken',
        },
        400
      );
    }
    
    // Check if admin email already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, validatedData.adminEmail))
      .limit(1);
    
    if (existingUser.length > 0) {
      return c.json(
        {
          error: 'Validation Error',
          message: 'Email is already registered',
        },
        400
      );
    }
    
    // Validate school hours if provided
    if (validatedData.schoolHours) {
      const hoursValidation = validateSchoolHours(validatedData.schoolHours);
      if (!hoursValidation.valid) {
        return c.json(
          {
            error: 'Validation Error',
            message: 'Invalid school hours configuration',
            errors: hoursValidation.errors,
          },
          400
        );
      }
    }
    
    // Prepare default school hours if not provided
    const defaultSchoolHours: SchoolHours = {
      monday: { start: '07:00', end: '15:00' },
      tuesday: { start: '07:00', end: '15:00' },
      wednesday: { start: '07:00', end: '15:00' },
      thursday: { start: '07:00', end: '15:00' },
      friday: { start: '07:00', end: '15:00' },
    };
    
    // Hash admin password
    const passwordHash = await hashPassword(validatedData.adminPassword);
    
    // Create school
    const newSchool: NewSchool = {
      name: validatedData.schoolName,
      subdomain: validatedData.subdomain.toLowerCase(),
      logoUrl: null,
      primaryColor: validatedData.primaryColor || '#3B82F6',
      status: 'pending',
      schoolHours: validatedData.schoolHours || defaultSchoolHours,
      maxStudents: validatedData.maxStudents,
      timezone: validatedData.timezone,
    };
    
    const [school] = await db.insert(schools).values(newSchool).returning();
    
    if (!school) {
      throw new Error('Failed to create school');
    }
    
    // Create admin user
    const newUser: NewUser = {
      schoolId: school.id,
      email: validatedData.adminEmail,
      passwordHash,
      name: validatedData.adminName,
      role: 'school_admin',
      isActive: true,
    };
    
    await db.insert(users).values(newUser);
    
    // Send registration confirmation email
    try {
      const emailService = createEmailService(c.env.RESEND_API_KEY);
      
      const emailHtml = generateSchoolRegistrationEmail({
        schoolName: validatedData.schoolName,
        adminName: validatedData.adminName,
        registrationDate: new Date().toLocaleDateString('id-ID', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      });
      
      await emailService.sendEmail({
        to: validatedData.adminEmail,
        subject: getSchoolRegistrationSubject(),
        html: emailHtml,
      });
    } catch (emailError) {
      console.error('Failed to send registration email:', emailError);
      // Don't fail the registration if email fails
    }
    
    return c.json(
      {
        message: 'School registration submitted successfully',
        school: {
          id: school.id,
          name: school.name,
          subdomain: school.subdomain,
          status: school.status,
        },
      },
      201
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: 'Validation Error',
          message: 'Invalid request data',
          details: error.errors,
        },
        400
      );
    }
    
    console.error('School registration error:', error);
    
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
 * GET /api/schools
 * List all schools (super_admin only)
 */
app.get('/', authMiddleware, requireSuperAdmin(), async (c) => {
  try {
    const db = createDb(c.env);
    
    // Get query parameters for filtering
    const status = c.req.query('status') as 'pending' | 'active' | 'suspended' | undefined;
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);
    
    // Build query
    let query = db.select().from(schools);
    
    if (status) {
      query = query.where(eq(schools.status, status)) as typeof query;
    }
    
    const schoolsList = await query.limit(limit).offset(offset);
    
    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schools)
      .where(status ? eq(schools.status, status) : sql`true`);
    
    return c.json({
      schools: schoolsList,
      pagination: {
        total: countResult?.count || 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('List schools error:', error);
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to retrieve schools',
      },
      500
    );
  }
});

/**
 * GET /api/schools/:id
 * Get school details
 */
app.get('/:id', authMiddleware, tenantMiddleware(), async (c) => {
  try {
    const db = createDb(c.env);
    const schoolId = c.req.param('id');
    const { isSuperAdmin } = getTenantContext(c);
    
    // Non-super admins can only view their own school
    if (!isSuperAdmin) {
      const contextSchoolId = getSchoolId(c);
      if (schoolId !== contextSchoolId) {
        return c.json(
          {
            error: 'Forbidden',
            message: 'Access denied',
          },
          403
        );
      }
    }
    
    const [school] = await db
      .select()
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1);
    
    if (!school) {
      return c.json(
        {
          error: 'Not Found',
          message: 'School not found',
        },
        404
      );
    }
    
    return c.json({ school });
  } catch (error) {
    console.error('Get school error:', error);
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to retrieve school',
      },
      500
    );
  }
});

/**
 * PATCH /api/schools/:id
 * Update school settings
 */
app.patch('/:id', authMiddleware, requireSchoolAdmin(), tenantMiddleware(), async (c) => {
  try {
    const db = createDb(c.env);
    const schoolId = c.req.param('id');
    const { isSuperAdmin } = getTenantContext(c);
    
    // Non-super admins can only update their own school
    if (!isSuperAdmin) {
      const contextSchoolId = getSchoolId(c);
      if (schoolId !== contextSchoolId) {
        return c.json(
          {
            error: 'Forbidden',
            message: 'Access denied',
          },
          403
        );
      }
    }
    
    // Verify school exists
    const [existingSchool] = await db
      .select()
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1);
    
    if (!existingSchool) {
      return c.json(
        {
          error: 'Not Found',
          message: 'School not found',
        },
        404
      );
    }
    
    // Parse and validate request body
    const body = await c.req.json();
    const validatedData = schoolUpdateSchema.parse(body);
    
    // Validate school hours if provided
    if (validatedData.schoolHours) {
      const hoursValidation = validateSchoolHours(validatedData.schoolHours);
      if (!hoursValidation.valid) {
        return c.json(
          {
            error: 'Validation Error',
            message: 'Invalid school hours configuration',
            errors: hoursValidation.errors,
          },
          400
        );
      }
    }
    
    // Update school
    const [updatedSchool] = await db
      .update(schools)
      .set({
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.logoUrl && { logoUrl: validatedData.logoUrl }),
        ...(validatedData.primaryColor && { primaryColor: validatedData.primaryColor }),
        ...(validatedData.schoolHours && { schoolHours: validatedData.schoolHours }),
        ...(validatedData.maxStudents && { maxStudents: validatedData.maxStudents }),
        ...(validatedData.timezone && { timezone: validatedData.timezone }),
      })
      .where(eq(schools.id, schoolId))
      .returning();
    
    return c.json({
      message: 'School updated successfully',
      school: updatedSchool,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: 'Validation Error',
          message: 'Invalid request data',
          details: error.errors,
        },
        400
      );
    }
    
    console.error('Update school error:', error);
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to update school',
      },
      500
    );
  }
});

/**
 * PATCH /api/schools/:id/approve
 * Approve school registration (super_admin only)
 */
app.patch('/:id/approve', authMiddleware, requireSuperAdmin(), async (c) => {
  try {
    const db = createDb(c.env);
    const schoolId = c.req.param('id');
    
    // Get school
    const [school] = await db
      .select()
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1);
    
    if (!school) {
      return c.json(
        {
          error: 'Not Found',
          message: 'School not found',
        },
        404
      );
    }
    
    if (school.status !== 'pending') {
      return c.json(
        {
          error: 'Bad Request',
          message: `School is already ${school.status}`,
        },
        400
      );
    }
    
    // Update school status
    const [updatedSchool] = await db
      .update(schools)
      .set({ status: 'active' })
      .where(eq(schools.id, schoolId))
      .returning();
    
    // Get admin user to send email
    const [admin] = await db
      .select()
      .from(users)
      .where(
        sql`${users.schoolId} = ${schoolId} AND ${users.role} = 'school_admin'`
      )
      .limit(1);
    
    // Send approval email
    if (admin) {
      try {
        const emailService = createEmailService(c.env.RESEND_API_KEY);
        
        const baseUrl = c.env.FRONTEND_URL || 'https://app.absensiqr.com';
        const subdomainUrl = `https://${school.subdomain}.absensiqr.com`;
        
        const emailHtml = generateSchoolApprovedEmail({
          schoolName: school.name,
          adminName: admin.name,
          loginUrl: `${baseUrl}/login`,
          subdomainUrl,
          adminEmail: admin.email,
        });
        
        await emailService.sendEmail({
          to: admin.email,
          subject: getSchoolApprovedSubject(),
          html: emailHtml,
        });
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
        // Don't fail the approval if email fails
      }
    }
    
    return c.json({
      message: 'School approved successfully',
      school: updatedSchool,
    });
  } catch (error) {
    console.error('Approve school error:', error);
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to approve school',
      },
      500
    );
  }
});

/**
 * PATCH /api/schools/:id/suspend
 * Suspend school (super_admin only)
 */
app.patch('/:id/suspend', authMiddleware, requireSuperAdmin(), async (c) => {
  try {
    const db = createDb(c.env);
    const schoolId = c.req.param('id');
    
    // Get school
    const [school] = await db
      .select()
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1);
    
    if (!school) {
      return c.json(
        {
          error: 'Not Found',
          message: 'School not found',
        },
        404
      );
    }
    
    if (school.status === 'suspended') {
      return c.json(
        {
          error: 'Bad Request',
          message: 'School is already suspended',
        },
        400
      );
    }
    
    // Update school status
    const [updatedSchool] = await db
      .update(schools)
      .set({ status: 'suspended' })
      .where(eq(schools.id, schoolId))
      .returning();
    
    return c.json({
      message: 'School suspended successfully',
      school: updatedSchool,
    });
  } catch (error) {
    console.error('Suspend school error:', error);
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to suspend school',
      },
      500
    );
  }
});

/**
 * DELETE /api/schools/:id
 * Soft delete school (super_admin only)
 * Note: This implementation marks the school as suspended
 * A real soft delete would require adding a deletedAt timestamp column
 */
app.delete('/:id', authMiddleware, requireSuperAdmin(), async (c) => {
  try {
    const db = createDb(c.env);
    const schoolId = c.req.param('id');
    
    // Verify school exists
    const [school] = await db
      .select()
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1);
    
    if (!school) {
      return c.json(
        {
          error: 'Not Found',
          message: 'School not found',
        },
        404
      );
    }
    
    // For now, mark as suspended (soft delete)
    // In production, you'd want to add a deletedAt column
    await db
      .update(schools)
      .set({ status: 'suspended' })
      .where(eq(schools.id, schoolId));
    
    return c.json({
      message: 'School deleted successfully',
    });
  } catch (error) {
    console.error('Delete school error:', error);
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to delete school',
      },
      500
    );
  }
});

export default app;
