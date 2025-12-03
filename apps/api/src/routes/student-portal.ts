/**
 * Student Portal Routes
 * Self-service portal for students to manage attendance and disputes
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import type { Context, Next, MiddlewareHandler } from 'hono';
import { createDb, type Env } from '../db';
import {
  students,
  attendance,
  attendanceDisputes,
  type NewAttendanceDispute,
} from '../db/schema';
import { hashPassword, verifyPassword } from '../lib/password';
import { generateToken, verifyToken, type TokenPayload } from '../lib/jwt';

/**
 * Student Token Payload - extends base TokenPayload with student-specific fields
 */
export interface StudentTokenPayload extends TokenPayload {
  studentId: string;
  studentNumber: string;
  role: 'student';
}

/**
 * Student context variables
 */
export interface StudentAuthVariables {
  student: StudentTokenPayload;
}

/**
 * Extended context with authenticated student
 */
export interface StudentAuthContext {
  Bindings: Env;
  Variables: StudentAuthVariables;
}

/**
 * Initialize router with type-safe environment
 */
const app = new Hono<{ Bindings: Env }>();

/**
 * ZOD VALIDATION SCHEMAS
 */

// Student login request
const studentLoginSchema = z.object({
  studentNumber: z.string().min(1, 'Student number is required'),
  pin: z.string().length(6, 'PIN must be exactly 6 digits').regex(/^\d{6}$/, 'PIN must contain only digits'),
});

// Student PIN setup/change request
const setupPinSchema = z.object({
  newPin: z.string().length(6, 'PIN must be exactly 6 digits').regex(/^\d{6}$/, 'PIN must contain only digits'),
  confirmPin: z.string().length(6, 'PIN must be exactly 6 digits').regex(/^\d{6}$/, 'PIN must contain only digits'),
});

// Submit dispute request
const submitDisputeSchema = z.object({
  attendanceId: z.string().uuid('Invalid attendance ID'),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(1000, 'Reason must not exceed 1000 characters'),
});

// Get attendance history query parameters
const getAttendanceHistorySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD').optional(),
  status: z.enum(['hadir', 'alpha', 'izin', 'sakit']).optional(),
  limit: z.string().regex(/^\d+$/).optional().default('30'),
  offset: z.string().regex(/^\d+$/).optional().default('0'),
});

/**
 * MIDDLEWARE
 */

/**
 * Student authentication middleware
 * Verifies student JWT token and attaches student info to context
 */
export const studentAuthMiddleware: MiddlewareHandler<StudentAuthContext> = async (
  c: Context<StudentAuthContext>,
  next: Next
): Promise<Response | void> => {
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

    // Verify that the token is for a student role
    const payload = result.payload as StudentTokenPayload;
    if (payload.role !== 'student') {
      return c.json(
        {
          error: 'Forbidden',
          message: 'Access denied. Student credentials required.',
        },
        403
      );
    }

    // Verify student still exists and is active
    const db = createDb(c.env);
    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.id, payload.studentId))
      .limit(1);

    if (!student || !student.isActive) {
      return c.json(
        {
          error: 'Forbidden',
          message: 'Student account not found or inactive',
        },
        403
      );
    }

    // Attach student info to context
    c.set('student', payload);

    await next();
  } catch (error) {
    console.error('Student authentication error:', error);

    return c.json(
      {
        error: 'Unauthorized',
        message: 'Authentication failed',
      },
      401
    );
  }
};

/**
 * Get authenticated student from context
 */
function getAuthStudent(c: Context<StudentAuthContext>): StudentTokenPayload {
  const student = c.get('student');

  if (!student) {
    throw new Error('Student not authenticated');
  }

  return student;
}

/**
 * ROUTES
 */

/**
 * POST /api/student/login
 * Student login with student number and PIN
 */
app.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = studentLoginSchema.parse(body);

    const db = createDb(c.env);

    // Find student by student number
    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.studentNumber, validatedData.studentNumber))
      .limit(1);

    if (!student) {
      return c.json(
        {
          error: 'Unauthorized',
          message: 'Invalid student number or PIN',
        },
        401
      );
    }

    // Check if student is active
    if (!student.isActive) {
      return c.json(
        {
          error: 'Forbidden',
          message: 'Student account is inactive',
        },
        403
      );
    }

    // Verify PIN
    const isPinValid = await verifyPassword(validatedData.pin, student.pinHash);

    if (!isPinValid) {
      return c.json(
        {
          error: 'Unauthorized',
          message: 'Invalid student number or PIN',
        },
        401
      );
    }

    // Generate student-specific JWT token
    const jwtSecret = c.env.JWT_SECRET;
    const accessToken = await generateToken(
      {
        userId: student.id,
        schoolId: student.schoolId,
        role: 'student',
        email: student.email || '',
        studentId: student.id,
        studentNumber: student.studentNumber,
      } as StudentTokenPayload,
      jwtSecret,
      '30d' // 30 days for student tokens
    );

    return c.json({
      message: 'Login successful',
      student: {
        id: student.id,
        studentNumber: student.studentNumber,
        name: student.name,
        class: student.class,
        email: student.email,
        photoUrl: student.photoUrl,
      },
      token: accessToken,
      expiresIn: 30 * 24 * 60 * 60, // seconds
    });
  } catch (error) {
    console.error('Student login error:', error);

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
        message: 'Failed to login',
      },
      500
    );
  }
});

/**
 * POST /api/student/setup-pin
 * Setup or change PIN (requires student authentication)
 */
app.post('/setup-pin', studentAuthMiddleware, async (c: Context<StudentAuthContext>) => {
  try {
    const student = getAuthStudent(c);
    const body = await c.req.json();
    const validatedData = setupPinSchema.parse(body);

    // Verify PIN confirmation matches
    if (validatedData.newPin !== validatedData.confirmPin) {
      return c.json(
        {
          error: 'Validation Error',
          message: 'PIN confirmation does not match',
        },
        400
      );
    }

    // Hash new PIN
    const newPinHash = await hashPassword(validatedData.newPin);

    const db = createDb(c.env);

    // Update student PIN
    const [updatedStudent] = await db
      .update(students)
      .set({ pinHash: newPinHash })
      .where(eq(students.id, student.studentId))
      .returning({
        id: students.id,
        studentNumber: students.studentNumber,
        name: students.name,
      });

    if (!updatedStudent) {
      return c.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to update PIN',
        },
        500
      );
    }

    return c.json({
      message: 'PIN updated successfully',
      student: updatedStudent,
    });
  } catch (error) {
    console.error('Setup PIN error:', error);

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
        message: 'Failed to update PIN',
      },
      500
    );
  }
});

/**
 * GET /api/student/attendance
 * Get student's own attendance history
 */
app.get('/attendance', studentAuthMiddleware, async (c: Context<StudentAuthContext>) => {
  try {
    const student = getAuthStudent(c);
    const db = createDb(c.env);

    // Parse and validate query parameters
    const query = getAttendanceHistorySchema.parse({
      startDate: c.req.query('startDate'),
      endDate: c.req.query('endDate'),
      status: c.req.query('status') as 'hadir' | 'alpha' | 'izin' | 'sakit' | undefined,
      limit: c.req.query('limit') || '30',
      offset: c.req.query('offset') || '0',
    });

    const limit = Math.min(parseInt(query.limit), 100);
    const offset = parseInt(query.offset);

    // Build filters - student can ONLY see their own attendance
    const filters = [eq(attendance.studentId, student.studentId)];

    // Filter by date range
    if (query.startDate) {
      filters.push(eq(attendance.date, query.startDate) as any);
    }
    if (query.endDate) {
      filters.push(eq(attendance.date, query.endDate) as any);
    }

    // Filter by status
    if (query.status) {
      filters.push(eq(attendance.status, query.status));
    }

    // Get attendance records
    const attendanceRecords = await db
      .select({
        id: attendance.id,
        date: attendance.date,
        status: attendance.status,
        scanTime: attendance.scanTime,
        notes: attendance.notes,
        syncedFromOffline: attendance.syncedFromOffline,
        createdAt: attendance.createdAt,
      })
      .from(attendance)
      .where(and(...filters))
      .orderBy(desc(attendance.date), desc(attendance.scanTime))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [countResult] = await db
      .select({ count: attendance.id })
      .from(attendance)
      .where(and(...filters));

    const totalCount = Array.isArray(countResult) ? countResult.length : (countResult?.count ? 1 : 0);

    return c.json({
      attendance: attendanceRecords,
      pagination: {
        limit,
        offset,
        totalCount,
        hasMore: offset + attendanceRecords.length < totalCount,
      },
    });
  } catch (error) {
    console.error('Get attendance history error:', error);

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
        message: 'Failed to fetch attendance history',
      },
      500
    );
  }
});

/**
 * POST /api/student/disputes
 * Submit an attendance dispute
 */
app.post('/disputes', studentAuthMiddleware, async (c: Context<StudentAuthContext>) => {
  try {
    const student = getAuthStudent(c);
    const body = await c.req.json();
    const validatedData = submitDisputeSchema.parse(body);

    const db = createDb(c.env);

    // Verify that the attendance record exists and belongs to this student
    const [attendanceRecord] = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.id, validatedData.attendanceId),
          eq(attendance.studentId, student.studentId)
        )
      )
      .limit(1);

    if (!attendanceRecord) {
      return c.json(
        {
          error: 'Not Found',
          message: 'Attendance record not found or does not belong to you',
        },
        404
      );
    }

    // Check if a dispute already exists for this attendance record
    const [existingDispute] = await db
      .select()
      .from(attendanceDisputes)
      .where(eq(attendanceDisputes.attendanceId, validatedData.attendanceId))
      .limit(1);

    if (existingDispute) {
      return c.json(
        {
          error: 'Conflict',
          message: 'A dispute already exists for this attendance record',
          dispute: {
            id: existingDispute.id,
            status: existingDispute.status,
            createdAt: existingDispute.createdAt,
          },
        },
        409
      );
    }

    // Create dispute
    const newDispute: NewAttendanceDispute = {
      attendanceId: validatedData.attendanceId,
      studentId: student.studentId,
      reason: validatedData.reason,
      status: 'pending',
    };

    const [createdDispute] = await db
      .insert(attendanceDisputes)
      .values(newDispute)
      .returning();

    if (!createdDispute) {
      return c.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to create dispute',
        },
        500
      );
    }

    return c.json(
      {
        message: 'Dispute submitted successfully',
        dispute: {
          id: createdDispute.id,
          attendanceId: createdDispute.attendanceId,
          reason: createdDispute.reason,
          status: createdDispute.status,
          createdAt: createdDispute.createdAt,
        },
      },
      201
    );
  } catch (error) {
    console.error('Submit dispute error:', error);

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
        message: 'Failed to submit dispute',
      },
      500
    );
  }
});

/**
 * GET /api/student/disputes
 * Get student's own disputes
 */
app.get('/disputes', studentAuthMiddleware, async (c: Context<StudentAuthContext>) => {
  try {
    const student = getAuthStudent(c);
    const db = createDb(c.env);

    // Get all disputes for this student, ordered by creation date (newest first)
    const disputes = await db
      .select({
        id: attendanceDisputes.id,
        attendanceId: attendanceDisputes.attendanceId,
        reason: attendanceDisputes.reason,
        status: attendanceDisputes.status,
        teacherNotes: attendanceDisputes.teacherNotes,
        createdAt: attendanceDisputes.createdAt,
        resolvedAt: attendanceDisputes.resolvedAt,
        // Include related attendance info
        attendanceDate: attendance.date,
        attendanceStatus: attendance.status,
      })
      .from(attendanceDisputes)
      .leftJoin(attendance, eq(attendanceDisputes.attendanceId, attendance.id))
      .where(eq(attendanceDisputes.studentId, student.studentId))
      .orderBy(desc(attendanceDisputes.createdAt));

    return c.json({
      disputes,
      summary: {
        total: disputes.length,
        pending: disputes.filter((d) => d.status === 'pending').length,
        approved: disputes.filter((d) => d.status === 'approved').length,
        rejected: disputes.filter((d) => d.status === 'rejected').length,
      },
    });
  } catch (error) {
    console.error('Get disputes error:', error);

    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch disputes',
      },
      500
    );
  }
});

/**
 * Export routes
 */
export default app;
