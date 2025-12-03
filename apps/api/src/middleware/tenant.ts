/**
 * Multi-Tenant Middleware
 * Ensures data isolation between schools and provides tenant-scoped query helpers
 */

import type { Context, Next, MiddlewareHandler } from 'hono';
import { getAuthUser, type AuthContext } from './auth';
import { eq, SQL, and } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

/**
 * Tenant context variables
 */
export interface TenantVariables {
  schoolId: string;
}

/**
 * Extended context with tenant information
 */
export type TenantContext = {
  Bindings: AuthContext['Bindings'];
  Variables: AuthContext['Variables'] & TenantVariables;
};

/**
 * Tenant middleware
 * Extracts school_id from authenticated user and adds it to context
 * Must be used after authMiddleware
 * 
 * Super admins can optionally specify a different school_id via query/body params
 * 
 * @returns Middleware handler
 * 
 * @example
 * app.get('/students', authMiddleware, tenantMiddleware, handler)
 */
export function tenantMiddleware(): MiddlewareHandler<TenantContext> {
  return async (c: Context<TenantContext>, next: Next): Promise<Response | void> => {
    try {
      // Get user from context directly to avoid type issues
      const user = c.get('user');
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Default to user's school
      let schoolId = user.schoolId;
      
      // Super admins can override school_id for cross-tenant operations
      if (user.role === 'super_admin') {
        // Check query parameter first
        const querySchoolId = c.req.query('schoolId');
        if (querySchoolId) {
          schoolId = querySchoolId;
        } else {
          // Check route parameter
          const paramSchoolId = c.req.param('schoolId') || c.req.param('id');
          if (paramSchoolId) {
            schoolId = paramSchoolId;
          }
        }
      }
      
      // Attach school ID to context
      c.set('schoolId', schoolId);
      
      await next();
    } catch (error) {
      console.error('Tenant middleware error:', error);
      
      return c.json(
        {
          error: 'Bad Request',
          message: 'Unable to determine tenant context',
        },
        400
      );
    }
  };
}

/**
 * Get school ID from tenant context
 * Throws error if school ID is not available
 */
export function getSchoolId(c: Context<TenantContext>): string {
  const schoolId = c.get('schoolId');
  
  if (!schoolId) {
    throw new Error('School ID not found in context. Ensure tenantMiddleware is applied.');
  }
  
  return schoolId;
}

/**
 * Create a tenant-scoped query filter
 * Adds school_id constraint to database queries to prevent cross-tenant data access
 * 
 * @param schoolIdColumn - The school_id column from the table schema
 * @param schoolId - The school ID to filter by
 * @param additionalFilters - Optional additional SQL filters to combine with tenant filter
 * @returns SQL query condition
 * 
 * @example
 * const students = await db
 *   .select()
 *   .from(studentsTable)
 *   .where(tenantFilter(studentsTable.schoolId, schoolId));
 * 
 * @example With additional filters
 * const activeStudents = await db
 *   .select()
 *   .from(studentsTable)
 *   .where(tenantFilter(
 *     studentsTable.schoolId,
 *     schoolId,
 *     eq(studentsTable.isActive, true)
 *   ));
 */
export function tenantFilter(
  schoolIdColumn: PgColumn,
  schoolId: string,
  ...additionalFilters: SQL[]
): SQL {
  const schoolFilter = eq(schoolIdColumn, schoolId);
  
  if (additionalFilters.length === 0) {
    return schoolFilter;
  }
  
  return and(schoolFilter, ...additionalFilters) as SQL;
}

/**
 * Verify that an entity belongs to the specified school
 * Useful for authorization checks before performing operations
 * 
 * @param entitySchoolId - The school_id of the entity being accessed
 * @param contextSchoolId - The school_id from the context
 * @param entityType - Type of entity for error message (e.g., 'student', 'teacher')
 * @throws Error if school IDs don't match
 * 
 * @example
 * const student = await db.select().from(studentsTable).where(eq(studentsTable.id, studentId));
 * verifyTenantAccess(student.schoolId, getSchoolId(c), 'student');
 */
export function verifyTenantAccess(
  entitySchoolId: string,
  contextSchoolId: string,
  entityType: string = 'resource'
): void {
  if (entitySchoolId !== contextSchoolId) {
    throw new Error(
      `Access denied. The ${entityType} does not belong to your school.`
    );
  }
}

/**
 * Check if user has super admin privileges
 * Super admins can bypass tenant restrictions
 */
export function isSuperAdmin(c: Context<AuthContext>): boolean {
  const user = getAuthUser(c);
  return user.role === 'super_admin';
}

/**
 * Get tenant-scoped context information
 * Returns both user and school ID for convenience
 */
export function getTenantContext(c: Context<TenantContext>): {
  userId: string;
  schoolId: string;
  userRole: string;
  isSuperAdmin: boolean;
} {
  const user = c.get('user');
  const schoolId = getSchoolId(c);
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  return {
    userId: user.userId,
    schoolId,
    userRole: user.role,
    isSuperAdmin: user.role === 'super_admin',
  };
}
