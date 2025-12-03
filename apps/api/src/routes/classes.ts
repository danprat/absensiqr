/**
 * Classes Routes
 * Handles class listing and statistics
 */

import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { createDb } from '../db';
import { students } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { requireTeacher } from '../middleware/rbac';
import { tenantMiddleware, getSchoolId, type TenantContext } from '../middleware/tenant';

/**
 * Initialize router with type-safe environment
 */
const app = new Hono<TenantContext>();

/**
 * Apply authentication and tenant middleware to all routes
 * Teachers and above can access class endpoints
 */
app.use('*', authMiddleware);
app.use('*', tenantMiddleware());
app.use('*', requireTeacher());

/**
 * GET /api/classes
 * Get list of unique classes with student counts
 */
app.get('/', async (c) => {
  try {
    const db = createDb(c.env);
    const schoolId = getSchoolId(c);
    
    // Get unique classes with student count
    // Only count active students
    const classesWithCounts = await db
      .select({
        name: students.class,
        studentCount: sql<number>`cast(count(*) as integer)`,
      })
      .from(students)
      .where(
        sql`${students.schoolId} = ${schoolId} AND ${students.isActive} = true`
      )
      .groupBy(students.class)
      .orderBy(students.class);
    
    return c.json({
      classes: classesWithCounts.map((c) => ({
        name: c.name,
        studentCount: c.studentCount,
      })),
    });
  } catch (error) {
    console.error('Get classes error:', error);
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to retrieve classes',
      },
      500
    );
  }
});

export default app;
