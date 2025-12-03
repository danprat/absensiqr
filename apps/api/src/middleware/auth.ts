/**
 * Authentication Middleware
 * Extracts and verifies JWT tokens from Authorization header
 */

import type { Context, Next } from 'hono';
import { verifyToken, type TokenPayload } from '../lib/jwt';
import type { Env } from '../db';

/**
 * Auth variables type
 */
export type AuthVariables = {
  user: TokenPayload;
  schoolId?: string;
};

/**
 * Extended context with authenticated user
 */
export interface AuthContext {
  Bindings: Env;
  Variables: AuthVariables;
}

/**
 * Authentication middleware
 * Extracts JWT from Authorization header, verifies it, and attaches user to context
 * Returns 401 if token is missing, invalid, or expired
 */
export async function authMiddleware(
  c: Context<AuthContext>,
  next: Next
): Promise<Response | void> {
  try {
    // Extract token from Authorization header
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader) {
      return c.json(
        {
          error: 'Unauthorized',
          message: 'Authorization header is required',
        },
        401
      );
    }
    
    // Validate Bearer token format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return c.json(
        {
          error: 'Unauthorized',
          message: 'Invalid Authorization header format. Use: Bearer <token>',
        },
        401
      );
    }
    
    const token = parts[1];
    
    if (!token) {
      return c.json(
        {
          error: 'Unauthorized',
          message: 'Token is required',
        },
        401
      );
    }
    
    // Verify token
    const jwtSecret = c.env.JWT_SECRET;
    
    if (!jwtSecret) {
      console.error('JWT_SECRET is not configured');
      return c.json(
        {
          error: 'Internal Server Error',
          message: 'Authentication is not properly configured',
        },
        500
      );
    }
    
    const result = await verifyToken(token, jwtSecret);
    
    if (!result.valid || !result.payload) {
      // Determine if token is expired or invalid
      const isExpired = result.error?.toLowerCase().includes('expired');
      
      return c.json(
        {
          error: 'Unauthorized',
          message: isExpired ? 'Token has expired' : 'Invalid token',
          ...(isExpired && { code: 'TOKEN_EXPIRED' }),
        },
        401
      );
    }
    
    // Attach user to context
    c.set('user', result.payload);
    
    await next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    return c.json(
      {
        error: 'Unauthorized',
        message: 'Authentication failed',
      },
      401
    );
  }
}

/**
 * Type guard to check if context has authenticated user
 */
export function isAuthContext(c: Context): c is Context<AuthContext> {
  return c.get('user') !== undefined;
}

/**
 * Get authenticated user from context
 * Throws error if user is not authenticated (should be used after authMiddleware)
 */
export function getAuthUser(c: Context<AuthContext>): TokenPayload {
  const user = c.get('user');
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  return user;
}
