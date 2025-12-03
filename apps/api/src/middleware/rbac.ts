/**
 * Role-Based Access Control (RBAC) Middleware
 * Implements role-based permissions and school access verification
 */

import type { Context, Next, MiddlewareHandler } from 'hono';
import { getAuthUser, type AuthContext } from './auth';

/**
 * User roles in the system
 */
export type UserRole = 'super_admin' | 'school_admin' | 'teacher' | 'student';

/**
 * Require specific roles middleware
 * Must be used after authMiddleware
 * 
 * @param roles - Array of allowed roles
 * @returns Middleware handler
 * 
 * @example
 * app.get('/admin-only', authMiddleware, requireRole(['super_admin', 'school_admin']), handler)
 */
export function requireRole(roles: UserRole[]): MiddlewareHandler<AuthContext> {
  return async (c: Context<AuthContext>, next: Next): Promise<Response | void> => {
    try {
      const user = getAuthUser(c);
      
      if (!roles.includes(user.role as UserRole)) {
        return c.json(
          {
            error: 'Forbidden',
            message: `Access denied. Required roles: ${roles.join(', ')}`,
            requiredRoles: roles,
            userRole: user.role,
          },
          403
        );
      }
      
      await next();
    } catch (error) {
      console.error('Role check error:', error);
      
      return c.json(
        {
          error: 'Forbidden',
          message: 'Access denied',
        },
        403
      );
    }
  };
}

/**
 * Require school access middleware
 * Verifies that the authenticated user belongs to the school specified in the request
 * Must be used after authMiddleware
 * 
 * The school ID can be provided via:
 * 1. Route parameter: /api/schools/:schoolId/...
 * 2. Query parameter: ?schoolId=xxx
 * 3. Request body: { schoolId: "xxx" }
 * 
 * Super admins can access any school
 * 
 * @returns Middleware handler
 * 
 * @example
 * app.get('/schools/:schoolId/students', authMiddleware, requireSchoolAccess(), handler)
 */
export function requireSchoolAccess(): MiddlewareHandler<AuthContext> {
  return async (c: Context<AuthContext>, next: Next): Promise<Response | void> => {
    try {
      const user = getAuthUser(c);
      
      // Super admins can access any school
      if (user.role === 'super_admin') {
        await next();
        return;
      }
      
      // Extract school ID from various sources
      let requestedSchoolId: string | undefined;
      
      // 1. Check route parameter
      requestedSchoolId = c.req.param('schoolId');
      
      // 2. Check query parameter if not found in route
      if (!requestedSchoolId) {
        requestedSchoolId = c.req.query('schoolId');
      }
      
      // 3. Check request body if not found in route or query
      if (!requestedSchoolId) {
        try {
          const body = await c.req.json();
          requestedSchoolId = body.schoolId;
        } catch {
          // Body parsing failed, continue without it
        }
      }
      
      // If no school ID is provided, use the user's school
      // This allows endpoints that don't specify a school ID explicitly
      if (!requestedSchoolId) {
        // Attach user's school to context for convenience
        c.set('schoolId', user.schoolId);
        await next();
        return;
      }
      
      // Verify user belongs to the requested school
      if (requestedSchoolId !== user.schoolId) {
        return c.json(
          {
            error: 'Forbidden',
            message: 'Access denied. You do not have permission to access this school',
          },
          403
        );
      }
      
      // Attach school ID to context
      c.set('schoolId', requestedSchoolId);
      
      await next();
    } catch (error) {
      console.error('School access check error:', error);
      
      return c.json(
        {
          error: 'Forbidden',
          message: 'Access denied',
        },
        403
      );
    }
  };
}

/**
 * Require super admin role
 * Shorthand for requireRole(['super_admin'])
 */
export function requireSuperAdmin(): MiddlewareHandler<AuthContext> {
  return requireRole(['super_admin']);
}

/**
 * Require school admin or higher (super_admin or school_admin)
 * Common pattern for school management endpoints
 */
export function requireSchoolAdmin(): MiddlewareHandler<AuthContext> {
  return requireRole(['super_admin', 'school_admin']);
}

/**
 * Require teacher or higher (super_admin, school_admin, or teacher)
 * Common pattern for attendance and student management endpoints
 */
export function requireTeacher(): MiddlewareHandler<AuthContext> {
  return requireRole(['super_admin', 'school_admin', 'teacher']);
}
