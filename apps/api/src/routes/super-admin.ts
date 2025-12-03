/**
 * Super Admin Routes
 * Platform-wide management and monitoring for super administrators
 */

import { Hono } from 'hono';
import { eq, and, sql, desc } from 'drizzle-orm';
import { createDb, type Env } from '../db';
import {
  schools,
  users,
  students,
  attendance,
  auditLogs,
} from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { requireSuperAdmin } from '../middleware/rbac';

const superAdmin = new Hono<{ Bindings: Env }>();

// All super admin routes require authentication and super_admin role
superAdmin.use('*', authMiddleware);
superAdmin.use('*', requireSuperAdmin());

/**
 * GET /api/super-admin/stats
 * Get platform-wide statistics
 */
superAdmin.get('/stats', async (c) => {
  try {
    const db = createDb(c.env);
    
    // Get current date for today's calculations
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Calculate start of current week (Monday)
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday is 0
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    const weekStart = startOfWeek.toISOString().split('T')[0];
    
    // Count total schools by status
    const schoolStats = await db
      .select({
        status: schools.status,
        count: sql<number>`count(*)::int`,
      })
      .from(schools)
      .groupBy(schools.status);
    
    // Parse school stats
    const totalSchools = schoolStats.reduce((sum, stat) => sum + stat.count, 0);
    const activeSchools = schoolStats.find((s) => s.status === 'active')?.count ?? 0;
    const pendingSchools = schoolStats.find((s) => s.status === 'pending')?.count ?? 0;
    const suspendedSchools = schoolStats.find((s) => s.status === 'suspended')?.count ?? 0;
    
    // Count total users
    const [userCount] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(users);
    
    const totalUsers = userCount?.count ?? 0;
    
    // Count total students
    const [studentCount] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(students);
    
    const totalStudents = studentCount?.count ?? 0;
    
    // Count scans today
    const [scansTodayCount] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(attendance)
      .where(sql`${attendance.date} = ${today}`);
    
    const scansToday = scansTodayCount?.count ?? 0;
    
    // Count scans this week
    const [scansWeekCount] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(attendance)
      .where(sql`${attendance.date} >= ${weekStart}`);
    
    const scansThisWeek = scansWeekCount?.count ?? 0;
    
    return c.json({
      totalSchools,
      activeSchools,
      pendingSchools,
      suspendedSchools,
      totalUsers,
      totalStudents,
      scansToday,
      scansThisWeek,
    });
  } catch (error) {
    console.error('Error fetching super admin stats:', error);
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch platform statistics',
      },
      500
    );
  }
});

/**
 * GET /api/super-admin/schools/pending
 * Get list of schools pending approval
 */
superAdmin.get('/schools/pending', async (c) => {
  try {
    const db = createDb(c.env);
    
    // Parse pagination params
    const page = parseInt(c.req.query('page') ?? '1', 10);
    const limit = parseInt(c.req.query('limit') ?? '10', 10);
    
    // Validate pagination
    if (page < 1 || limit < 1 || limit > 100) {
      return c.json(
        {
          error: 'Validation Error',
          message: 'Invalid pagination parameters. Page must be >= 1, limit must be 1-100',
        },
        400
      );
    }
    
    const offset = (page - 1) * limit;
    
    // Get pending schools with admin info
    const pendingSchools = await db
      .select({
        id: schools.id,
        name: schools.name,
        subdomain: schools.subdomain,
        adminEmail: users.email,
        adminName: users.name,
        timezone: schools.timezone,
        createdAt: schools.createdAt,
      })
      .from(schools)
      .innerJoin(users, eq(users.schoolId, schools.id))
      .where(
        and(
          eq(schools.status, 'pending'),
          eq(users.role, 'school_admin')
        )
      )
      .orderBy(desc(schools.createdAt))
      .limit(limit)
      .offset(offset);
    
    // Get total count
    const [totalCount] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(schools)
      .where(eq(schools.status, 'pending'));
    
    const total = totalCount?.count ?? 0;
    
    return c.json({
      schools: pendingSchools.map((school) => ({
        id: school.id,
        name: school.name,
        subdomain: school.subdomain,
        adminEmail: school.adminEmail,
        adminName: school.adminName,
        timezone: school.timezone,
        createdAt: school.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching pending schools:', error);
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch pending schools',
      },
      500
    );
  }
});

/**
 * GET /api/super-admin/schools/:id/details
 * Get detailed information about a specific school
 */
superAdmin.get('/schools/:id/details', async (c) => {
  try {
    const schoolId = c.req.param('id');
    
    if (!schoolId) {
      return c.json(
        {
          error: 'Validation Error',
          message: 'School ID is required',
        },
        400
      );
    }
    
    const db = createDb(c.env);
    
    // Get school details
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
    
    // Get school admin
    const [admin] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(
        and(
          eq(users.schoolId, schoolId),
          eq(users.role, 'school_admin')
        )
      )
      .limit(1);
    
    // Count users by role
    const userCounts = await db
      .select({
        role: users.role,
        count: sql<number>`count(*)::int`,
      })
      .from(users)
      .where(eq(users.schoolId, schoolId))
      .groupBy(users.role);
    
    // Count students
    const [studentCount] = await db
      .select({
        count: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where is_active = true)::int`,
      })
      .from(students)
      .where(eq(students.schoolId, schoolId));
    
    // Count attendance records (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    
    const [attendanceCount] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(attendance)
      .where(
        and(
          eq(attendance.schoolId, schoolId),
          sql`${attendance.date} >= ${thirtyDaysAgoStr}`
        )
      );
    
    return c.json({
      school: {
        id: school.id,
        name: school.name,
        subdomain: school.subdomain,
        status: school.status,
        logoUrl: school.logoUrl,
        primaryColor: school.primaryColor,
        timezone: school.timezone,
        maxStudents: school.maxStudents,
        schoolHours: school.schoolHours,
        createdAt: school.createdAt.toISOString(),
      },
      admin: admin ? {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        isActive: admin.isActive,
        createdAt: admin.createdAt.toISOString(),
      } : null,
      statistics: {
        users: {
          total: userCounts.reduce((sum, stat) => sum + stat.count, 0),
          byRole: Object.fromEntries(
            userCounts.map((stat) => [stat.role, stat.count])
          ),
        },
        students: {
          total: studentCount?.count ?? 0,
          active: studentCount?.active ?? 0,
        },
        attendanceLast30Days: attendanceCount?.count ?? 0,
      },
    });
  } catch (error) {
    console.error('Error fetching school details:', error);
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch school details',
      },
      500
    );
  }
});

/**
 * GET /api/super-admin/activity
 * Get recent platform activity from audit logs
 */
superAdmin.get('/activity', async (c) => {
  try {
    const db = createDb(c.env);
    
    // Parse pagination params
    const page = parseInt(c.req.query('page') ?? '1', 10);
    const limit = parseInt(c.req.query('limit') ?? '20', 10);
    
    // Validate pagination
    if (page < 1 || limit < 1 || limit > 100) {
      return c.json(
        {
          error: 'Validation Error',
          message: 'Invalid pagination parameters. Page must be >= 1, limit must be 1-100',
        },
        400
      );
    }
    
    const offset = (page - 1) * limit;
    
    // Get recent audit logs with school and user info
    const activities = await db
      .select({
        id: auditLogs.id,
        schoolName: schools.name,
        userName: users.name,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .innerJoin(schools, eq(schools.id, auditLogs.schoolId))
      .leftJoin(users, eq(users.id, auditLogs.userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);
    
    // Get total count
    const [totalCount] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(auditLogs);
    
    const total = totalCount?.count ?? 0;
    
    return c.json({
      activities: activities.map((activity) => ({
        id: activity.id,
        schoolName: activity.schoolName,
        userName: activity.userName ?? 'System',
        action: activity.action,
        entityType: activity.entityType,
        entityId: activity.entityId,
        createdAt: activity.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching platform activity:', error);
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch platform activity',
      },
      500
    );
  }
});

export default superAdmin;
