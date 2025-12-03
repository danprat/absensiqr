/**
 * Dispute Management Routes
 * Handles teacher dispute resolution for attendance records
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, sql, inArray, type SQL } from 'drizzle-orm';
import { createDb } from '../db';
import {
  attendanceDisputes,
  attendance,
  students,
  teacherClasses,
} from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { requireTeacher } from '../middleware/rbac';
import {
  tenantMiddleware,
  getTenantContext,
  type TenantContext,
} from '../middleware/tenant';

/**
 * Initialize router with type-safe environment
 */
const app = new Hono<TenantContext>();

/**
 * Apply authentication and tenant middleware to all routes
 */
app.use('*', authMiddleware);
app.use('*', tenantMiddleware());

/**
 * ZOD VALIDATION SCHEMAS
 */

// Query parameters for listing disputes
const listDisputesQuerySchema = z.object({
  status: z
    .enum(['pending', 'approved', 'rejected', 'all'])
    .optional()
    .default('all'),
  page: z.string().regex(/^\d+$/).optional().default('1'),
  limit: z.string().regex(/^\d+$/).optional().default('20'),
});

// Update dispute status request
const updateDisputeSchema = z.object({
  status: z.enum(['approved', 'rejected'], {
    errorMap: () => ({ message: "Status must be 'approved' or 'rejected'" }),
  }),
  teacherNotes: z
    .string()
    .min(1, 'Teacher notes are required')
    .max(1000, 'Teacher notes must not exceed 1000 characters')
    .optional(),
});

/**
 * HELPER FUNCTIONS
 */

/**
 * Get teacher's assigned classes
 */
async function getTeacherAssignedClasses(
  db: ReturnType<typeof createDb>,
  teacherId: string,
  schoolId: string
): Promise<string[]> {
  const classes = await db
    .select({ className: teacherClasses.className })
    .from(teacherClasses)
    .where(
      and(
        eq(teacherClasses.teacherId, teacherId),
        eq(teacherClasses.schoolId, schoolId)
      )
    );

  return classes.map((c) => c.className);
}

/**
 * Check if teacher has access to dispute based on student's class
 */
async function verifyTeacherDisputeAccess(
  db: ReturnType<typeof createDb>,
  teacherId: string,
  schoolId: string,
  studentId: string
): Promise<{ hasAccess: boolean; studentClass?: string }> {
  // Get student's class
  const [student] = await db
    .select({ class: students.class })
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
    .limit(1);

  if (!student) {
    return { hasAccess: false };
  }

  // Get teacher's assigned classes
  const assignedClasses = await getTeacherAssignedClasses(
    db,
    teacherId,
    schoolId
  );

  // Check if student's class is in teacher's assigned classes
  const hasAccess = assignedClasses.includes(student.class);

  return { hasAccess, studentClass: student.class };
}

/**
 * ROUTES
 */

/**
 * GET /api/disputes
 * List disputes for teacher's assigned classes
 */
app.get('/', requireTeacher(), async (c) => {
  try {
    const db = createDb(c.env);
    const { userId, schoolId, userRole } = getTenantContext(c);

    // Parse and validate query parameters
    const query = c.req.query();
    const validatedQuery = listDisputesQuerySchema.parse(query);

    const page = parseInt(validatedQuery.page);
    const limit = Math.min(parseInt(validatedQuery.limit), 100); // Max 100 per page
    const offset = (page - 1) * limit;

    // Get teacher's assigned classes (skip for super_admin and school_admin)
    let assignedClasses: string[] = [];
    if (userRole === 'teacher') {
      assignedClasses = await getTeacherAssignedClasses(db, userId, schoolId);

      if (assignedClasses.length === 0) {
        // Teacher has no assigned classes
        return c.json({
          disputes: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        });
      }
    }

    // Build query conditions
    const conditions: SQL[] = [];

    // For teachers, only show disputes for students in their assigned classes
    if (userRole === 'teacher' && assignedClasses.length > 0) {
      const studentsInClasses = await db
        .select({ id: students.id })
        .from(students)
        .where(
          and(
            eq(students.schoolId, schoolId),
            inArray(students.class, assignedClasses)
          )
        );

      const studentIds = studentsInClasses.map((s) => s.id);

      if (studentIds.length === 0) {
        // No students in teacher's classes
        return c.json({
          disputes: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        });
      }

      conditions.push(inArray(attendanceDisputes.studentId, studentIds));
    } else {
      // For school_admin and super_admin, check school context via student
      conditions.push(
        sql`${attendanceDisputes.studentId} IN (
          SELECT ${students.id} FROM ${students}
          WHERE ${students.schoolId} = ${schoolId}
        )`
      );
    }

    // Filter by status if not 'all'
    if (validatedQuery.status !== 'all') {
      conditions.push(eq(attendanceDisputes.status, validatedQuery.status));
    }

    // Get disputes with student and attendance info
    const disputes = await db
      .select({
        id: attendanceDisputes.id,
        attendanceId: attendanceDisputes.attendanceId,
        studentId: attendanceDisputes.studentId,
        studentName: students.name,
        studentNumber: students.studentNumber,
        studentClass: students.class,
        reason: attendanceDisputes.reason,
        status: attendanceDisputes.status,
        teacherNotes: attendanceDisputes.teacherNotes,
        createdAt: attendanceDisputes.createdAt,
        resolvedAt: attendanceDisputes.resolvedAt,
        attendanceDate: attendance.date,
        attendanceStatus: attendance.status,
      })
      .from(attendanceDisputes)
      .innerJoin(students, eq(attendanceDisputes.studentId, students.id))
      .innerJoin(
        attendance,
        eq(attendanceDisputes.attendanceId, attendance.id)
      )
      .where(and(...conditions))
      .limit(limit)
      .offset(offset)
      .orderBy(attendanceDisputes.createdAt);

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(attendanceDisputes)
      .where(and(...conditions));

    const total = countResult?.count ?? 0;

    return c.json({
      disputes: disputes.map((d) => ({
        id: d.id,
        attendanceId: d.attendanceId,
        student: {
          id: d.studentId,
          name: d.studentName,
          studentNumber: d.studentNumber,
          class: d.studentClass,
        },
        attendance: {
          date: d.attendanceDate,
          status: d.attendanceStatus,
        },
        reason: d.reason,
        status: d.status,
        teacherNotes: d.teacherNotes,
        createdAt: d.createdAt.toISOString(),
        resolvedAt: d.resolvedAt ? d.resolvedAt.toISOString() : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List disputes error:', error);

    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: 'Validation Error',
          message: 'Invalid query parameters',
          details: error.errors,
        },
        400
      );
    }

    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to retrieve disputes',
      },
      500
    );
  }
});

/**
 * GET /api/disputes/:id
 * Get dispute detail with attendance and student info
 */
app.get('/:id', requireTeacher(), async (c) => {
  try {
    const db = createDb(c.env);
    const { userId, schoolId, userRole } = getTenantContext(c);
    const disputeId = c.req.param('id');

    // Get dispute with student and attendance info
    const [dispute] = await db
      .select({
        id: attendanceDisputes.id,
        attendanceId: attendanceDisputes.attendanceId,
        studentId: attendanceDisputes.studentId,
        studentName: students.name,
        studentNumber: students.studentNumber,
        studentClass: students.class,
        studentEmail: students.email,
        studentPhone: students.phone,
        studentPhotoUrl: students.photoUrl,
        reason: attendanceDisputes.reason,
        status: attendanceDisputes.status,
        teacherNotes: attendanceDisputes.teacherNotes,
        createdAt: attendanceDisputes.createdAt,
        resolvedAt: attendanceDisputes.resolvedAt,
        attendanceDate: attendance.date,
        attendanceStatus: attendance.status,
        attendanceScanTime: attendance.scanTime,
        attendanceNotes: attendance.notes,
      })
      .from(attendanceDisputes)
      .innerJoin(students, eq(attendanceDisputes.studentId, students.id))
      .innerJoin(
        attendance,
        eq(attendanceDisputes.attendanceId, attendance.id)
      )
      .where(eq(attendanceDisputes.id, disputeId))
      .limit(1);

    if (!dispute) {
      return c.json(
        {
          error: 'Not Found',
          message: 'Dispute not found',
        },
        404
      );
    }

    // Verify student belongs to school
    const [student] = await db
      .select({ schoolId: students.schoolId })
      .from(students)
      .where(eq(students.id, dispute.studentId))
      .limit(1);

    if (!student || student.schoolId !== schoolId) {
      return c.json(
        {
          error: 'Not Found',
          message: 'Dispute not found',
        },
        404
      );
    }

    // For teachers, verify they have access to this student's class
    if (userRole === 'teacher') {
      const accessCheck = await verifyTeacherDisputeAccess(
        db,
        userId,
        schoolId,
        dispute.studentId
      );

      if (!accessCheck.hasAccess) {
        return c.json(
          {
            error: 'Forbidden',
            message:
              'You can only view disputes for students in your assigned classes',
          },
          403
        );
      }
    }

    return c.json({
      dispute: {
        id: dispute.id,
        attendanceId: dispute.attendanceId,
        student: {
          id: dispute.studentId,
          name: dispute.studentName,
          studentNumber: dispute.studentNumber,
          class: dispute.studentClass,
          email: dispute.studentEmail,
          phone: dispute.studentPhone,
          photoUrl: dispute.studentPhotoUrl,
        },
        attendance: {
          date: dispute.attendanceDate,
          status: dispute.attendanceStatus,
          scanTime: dispute.attendanceScanTime.toISOString(),
          notes: dispute.attendanceNotes,
        },
        reason: dispute.reason,
        status: dispute.status,
        teacherNotes: dispute.teacherNotes,
        createdAt: dispute.createdAt.toISOString(),
        resolvedAt: dispute.resolvedAt ? dispute.resolvedAt.toISOString() : null,
      },
    });
  } catch (error) {
    console.error('Get dispute error:', error);

    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to retrieve dispute',
      },
      500
    );
  }
});

/**
 * PUT /api/disputes/:id
 * Approve or reject dispute
 */
app.put('/:id', requireTeacher(), async (c) => {
  try {
    const db = createDb(c.env);
    const { userId, schoolId, userRole } = getTenantContext(c);
    const disputeId = c.req.param('id');

    // Parse and validate request body
    const body = await c.req.json();
    const validatedData = updateDisputeSchema.parse(body);

    // Get existing dispute
    const [existingDispute] = await db
      .select({
        id: attendanceDisputes.id,
        studentId: attendanceDisputes.studentId,
        status: attendanceDisputes.status,
      })
      .from(attendanceDisputes)
      .where(eq(attendanceDisputes.id, disputeId))
      .limit(1);

    if (!existingDispute) {
      return c.json(
        {
          error: 'Not Found',
          message: 'Dispute not found',
        },
        404
      );
    }

    // Verify student belongs to school
    const [student] = await db
      .select({ schoolId: students.schoolId, class: students.class })
      .from(students)
      .where(eq(students.id, existingDispute.studentId))
      .limit(1);

    if (!student || student.schoolId !== schoolId) {
      return c.json(
        {
          error: 'Not Found',
          message: 'Dispute not found',
        },
        404
      );
    }

    // For teachers, verify they have access to this student's class
    if (userRole === 'teacher') {
      const accessCheck = await verifyTeacherDisputeAccess(
        db,
        userId,
        schoolId,
        existingDispute.studentId
      );

      if (!accessCheck.hasAccess) {
        return c.json(
          {
            error: 'Forbidden',
            message:
              'You can only manage disputes for students in your assigned classes',
          },
          403
        );
      }
    }

    // Check if dispute is already resolved
    if (existingDispute.status !== 'pending') {
      return c.json(
        {
          error: 'Bad Request',
          message: `Dispute is already ${existingDispute.status}`,
        },
        400
      );
    }

    // Update dispute
    const [updatedDispute] = await db
      .update(attendanceDisputes)
      .set({
        status: validatedData.status,
        teacherNotes: validatedData.teacherNotes,
        resolvedAt: sql`now()`,
      })
      .where(eq(attendanceDisputes.id, disputeId))
      .returning();

    if (!updatedDispute) {
      throw new Error('Failed to update dispute');
    }

    // Get full dispute details for response
    const [fullDispute] = await db
      .select({
        id: attendanceDisputes.id,
        attendanceId: attendanceDisputes.attendanceId,
        studentId: attendanceDisputes.studentId,
        studentName: students.name,
        studentNumber: students.studentNumber,
        studentClass: students.class,
        reason: attendanceDisputes.reason,
        status: attendanceDisputes.status,
        teacherNotes: attendanceDisputes.teacherNotes,
        createdAt: attendanceDisputes.createdAt,
        resolvedAt: attendanceDisputes.resolvedAt,
        attendanceDate: attendance.date,
        attendanceStatus: attendance.status,
      })
      .from(attendanceDisputes)
      .innerJoin(students, eq(attendanceDisputes.studentId, students.id))
      .innerJoin(
        attendance,
        eq(attendanceDisputes.attendanceId, attendance.id)
      )
      .where(eq(attendanceDisputes.id, disputeId))
      .limit(1);

    if (!fullDispute) {
      throw new Error('Failed to retrieve updated dispute');
    }

    return c.json({
      message: `Dispute ${validatedData.status} successfully`,
      dispute: {
        id: fullDispute.id,
        attendanceId: fullDispute.attendanceId,
        student: {
          id: fullDispute.studentId,
          name: fullDispute.studentName,
          studentNumber: fullDispute.studentNumber,
          class: fullDispute.studentClass,
        },
        attendance: {
          date: fullDispute.attendanceDate,
          status: fullDispute.attendanceStatus,
        },
        reason: fullDispute.reason,
        status: fullDispute.status,
        teacherNotes: fullDispute.teacherNotes,
        createdAt: fullDispute.createdAt.toISOString(),
        resolvedAt: fullDispute.resolvedAt
          ? fullDispute.resolvedAt.toISOString()
          : null,
      },
    });
  } catch (error) {
    console.error('Update dispute error:', error);

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

    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to update dispute',
      },
      500
    );
  }
});

export default app;
