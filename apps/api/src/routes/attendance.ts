/**
 * Attendance Routes
 * Handles QR code scanning and attendance recording
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, sql, type SQL } from 'drizzle-orm';
import { createDb } from '../db';
import {
  students,
  attendance,
  teacherClasses,
  schools,
  type NewAttendance,
} from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { requireTeacher } from '../middleware/rbac';
import { tenantMiddleware, getTenantContext, type TenantContext } from '../middleware/tenant';
import { validateAndParseQRCode } from '../lib/qr';
import {
  getSchoolLocalTime,
  isWithinSchoolHours,
  formatInSchoolTimezone,
  getSchoolDate,
  type SchoolHours,
  type TimezoneType,
} from '../lib/timezone';

/**
 * Initialize router with type-safe environment
 */
const app = new Hono<TenantContext>();

/**
 * Apply authentication and tenant middleware to all routes
 * Teachers and above can access attendance endpoints
 */
app.use('*', authMiddleware);
app.use('*', tenantMiddleware());
app.use('*', requireTeacher());

/**
 * ZOD VALIDATION SCHEMAS
 */

// Attendance status enum
const attendanceStatusSchema = z.enum(['hadir', 'alpha', 'izin', 'sakit']);

// Single scan request
const scanRequestSchema = z.object({
  qrCode: z.string().min(1, 'QR code is required'),
  status: attendanceStatusSchema.optional().default('hadir'),
  notes: z.string().max(500).optional(),
  timestamp: z.string().datetime().optional(),
  deviceInfo: z.record(z.any()).optional(),
});

// Single scan item for batch sync
const syncScanItemSchema = z.object({
  qrCode: z.string().min(1, 'QR code is required'),
  status: attendanceStatusSchema,
  notes: z.string().max(500).optional(),
  timestamp: z.string().datetime(),
  deviceInfo: z.record(z.any()).optional(),
});

// Batch sync request
const syncRequestSchema = z.object({
  scans: z.array(syncScanItemSchema).min(1, 'At least one scan is required').max(100, 'Maximum 100 scans per batch'),
});

/**
 * TYPES
 */

interface ScanResponse {
  success: boolean;
  attendanceId?: string;
  student: {
    id: string;
    name: string;
    class: string;
    studentNumber: string;
    photoUrl?: string | null;
  };
  status: 'hadir' | 'alpha' | 'izin' | 'sakit';
  scanTime: string;
  warnings?: string[];
}

interface ConflictDetail {
  qrCode: string;
  reason: string;
  existingRecord?: {
    status: string;
    scanTime: string;
  };
}

interface SyncResponse {
  synced: number;
  failed: number;
  conflicts: ConflictDetail[];
}

/**
 * HELPER FUNCTIONS
 */

/**
 * Validate teacher access to student's class
 */
async function validateTeacherAccess(
  db: ReturnType<typeof createDb>,
  teacherId: string,
  studentClass: string,
  schoolId: string
): Promise<boolean> {
  const [assignment] = await db
    .select()
    .from(teacherClasses)
    .where(
      and(
        eq(teacherClasses.teacherId, teacherId),
        eq(teacherClasses.className, studentClass),
        eq(teacherClasses.schoolId, schoolId)
      )
    )
    .limit(1);
  
  return !!assignment;
}

/**
 * Check if student already has attendance record for today
 */
async function checkDuplicateScan(
  db: ReturnType<typeof createDb>,
  studentId: string,
  date: string,
  schoolId: string
): Promise<{ isDuplicate: boolean; existingRecord?: { status: string; scanTime: string } }> {
  const [existing] = await db
    .select({
      status: attendance.status,
      scanTime: attendance.scanTime,
    })
    .from(attendance)
    .where(
      and(
        eq(attendance.studentId, studentId),
        eq(attendance.date, date),
        eq(attendance.schoolId, schoolId)
      )
    )
    .limit(1);
  
  if (existing) {
    return {
      isDuplicate: true,
      existingRecord: {
        status: existing.status,
        scanTime: existing.scanTime.toISOString(),
      },
    };
  }
  
  return { isDuplicate: false };
}

/**
 * Process a single attendance scan
 */
async function processScan(
  db: ReturnType<typeof createDb>,
  qrCode: string,
  status: 'hadir' | 'alpha' | 'izin' | 'sakit',
  teacherId: string,
  schoolId: string,
  notes?: string,
  timestamp?: string,
  deviceInfo?: Record<string, any>,
  syncedFromOffline: boolean = false
): Promise<ScanResponse> {
  const warnings: string[] = [];
  
  // 1. Parse and validate QR code
  const parsedQR = await validateAndParseQRCode(qrCode);
  
  if (!parsedQR.valid) {
    throw new Error(parsedQR.error || 'Invalid QR code');
  }
  
  // 2. Verify QR code belongs to this school
  if (parsedQR.schoolId !== schoolId) {
    throw new Error('QR code does not belong to this school');
  }
  
  // 3. Fetch student and verify active status
  const [student] = await db
    .select()
    .from(students)
    .where(
      and(
        eq(students.id, parsedQR.studentId),
        eq(students.schoolId, schoolId)
      )
    )
    .limit(1);
  
  if (!student) {
    throw new Error('Student not found');
  }
  
  if (!student.isActive) {
    throw new Error('Student is not active');
  }
  
  // 4. Verify teacher has access to student's class
  const hasAccess = await validateTeacherAccess(db, teacherId, student.class, schoolId);
  
  if (!hasAccess) {
    throw new Error(`Access denied. You are not assigned to class ${student.class}`);
  }
  
  // 5. Get school settings for timezone and hours
  const [school] = await db
    .select()
    .from(schools)
    .where(eq(schools.id, schoolId))
    .limit(1);
  
  if (!school) {
    throw new Error('School not found');
  }
  
  const schoolTimezone = school.timezone as TimezoneType;
  const schoolHours = school.schoolHours as unknown as SchoolHours;
  
  // 6. Determine scan time (use provided timestamp or current time)
  const scanTime = timestamp ? new Date(timestamp) : getSchoolLocalTime(schoolTimezone);
  const scanDate = timestamp 
    ? formatInSchoolTimezone(new Date(timestamp), schoolTimezone, 'date')
    : getSchoolDate(schoolTimezone);
  
  // 7. Check if within school hours (warning only, doesn't block)
  const hoursCheck = isWithinSchoolHours(schoolTimezone, schoolHours, scanTime);
  
  if (!hoursCheck.isWithinHours) {
    if (!hoursCheck.daySchedule) {
      warnings.push(`No school schedule configured for ${hoursCheck.dayName}`);
    } else {
      warnings.push(
        `Outside school hours (${hoursCheck.daySchedule.start} - ${hoursCheck.daySchedule.end}). Current time: ${hoursCheck.currentTimeStr}`
      );
    }
  }
  
  // 8. Check for duplicate scan today
  const duplicateCheck = await checkDuplicateScan(db, student.id, scanDate, schoolId);
  
  if (duplicateCheck.isDuplicate && duplicateCheck.existingRecord) {
    const existingTime = formatInSchoolTimezone(
      new Date(duplicateCheck.existingRecord.scanTime),
      schoolTimezone,
      'time'
    );
    warnings.push(
      `Student already scanned today at ${existingTime} with status: ${duplicateCheck.existingRecord.status}`
    );
  }
  
  // 9. Create attendance record
  const newAttendance: NewAttendance = {
    schoolId,
    studentId: student.id,
    teacherId,
    date: scanDate,
    status,
    scanTime,
    notes: notes || null,
    deviceInfo: deviceInfo || null,
    syncedFromOffline,
  };
  
  const [createdAttendance] = await db
    .insert(attendance)
    .values(newAttendance)
    .onConflictDoUpdate({
      target: [attendance.studentId, attendance.date],
      set: {
        status,
        scanTime,
        teacherId,
        notes: notes || null,
        deviceInfo: deviceInfo || null,
        syncedFromOffline,
      },
    })
    .returning();
  
  if (!createdAttendance) {
    throw new Error('Failed to create attendance record');
  }
  
  // 10. Return response
  return {
    success: true,
    attendanceId: createdAttendance.id,
    student: {
      id: student.id,
      name: student.name,
      class: student.class,
      studentNumber: student.studentNumber,
      photoUrl: student.photoUrl,
    },
    status,
    scanTime: createdAttendance.scanTime.toISOString(),
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * ROUTES
 */

/**
 * POST /api/attendance/scan
 * Record attendance from QR code scan
 */
app.post('/scan', async (c) => {
  try {
    const db = createDb(c.env);
    const { userId: teacherId, schoolId } = getTenantContext(c);
    
    // Parse and validate request body
    const body = await c.req.json();
    const validatedData = scanRequestSchema.parse(body);
    
    // Process the scan
    const result = await processScan(
      db,
      validatedData.qrCode,
      validatedData.status,
      teacherId,
      schoolId,
      validatedData.notes,
      validatedData.timestamp,
      validatedData.deviceInfo,
      false // Not from offline sync
    );
    
    return c.json(result, 201);
  } catch (error) {
    console.error('Scan attendance error:', error);
    
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
    
    // Handle specific business logic errors
    if (error instanceof Error) {
      const message = error.message;
      
      // Return appropriate error response based on error type
      if (
        message.includes('Invalid QR code') ||
        message.includes('Student not found') ||
        message.includes('does not belong to this school') ||
        message.includes('not active')
      ) {
        return c.json(
          {
            error: 'Bad Request',
            message,
          },
          400
        );
      } else if (message.includes('Access denied')) {
        return c.json(
          {
            error: 'Forbidden',
            message,
          },
          403
        );
      }
    }
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to record attendance',
      },
      500
    );
  }
});

/**
 * POST /api/attendance/sync
 * Sync multiple offline attendance scans in batch
 */
app.post('/sync', async (c) => {
  try {
    const db = createDb(c.env);
    const { userId: teacherId, schoolId } = getTenantContext(c);
    
    // Parse and validate request body
    const body = await c.req.json();
    const validatedData = syncRequestSchema.parse(body);
    
    const conflicts: ConflictDetail[] = [];
    let syncedCount = 0;
    let failedCount = 0;
    
    // Process each scan
    for (const scan of validatedData.scans) {
      try {
        await processScan(
          db,
          scan.qrCode,
          scan.status,
          teacherId,
          schoolId,
          scan.notes,
          scan.timestamp,
          scan.deviceInfo,
          true // From offline sync
        );
        
        syncedCount++;
      } catch (error) {
        failedCount++;
        
        // Check if there's an existing record to include in conflict details
        let existingRecord: { status: string; scanTime: string } | undefined;
        
        try {
          const parsedQR = await validateAndParseQRCode(scan.qrCode);
          if (parsedQR.valid) {
            const scanDate = formatInSchoolTimezone(
              new Date(scan.timestamp),
              'WIB', // Default timezone for conflict check
              'date'
            );
            
            const duplicateCheck = await checkDuplicateScan(
              db,
              parsedQR.studentId,
              scanDate,
              schoolId
            );
            
            if (duplicateCheck.isDuplicate && duplicateCheck.existingRecord) {
              existingRecord = duplicateCheck.existingRecord;
            }
          }
        } catch {
          // Ignore errors during conflict detail lookup
        }
        
        conflicts.push({
          qrCode: scan.qrCode,
          reason: error instanceof Error ? error.message : 'Unknown error',
          existingRecord,
        });
      }
    }
    
    const response: SyncResponse = {
      synced: syncedCount,
      failed: failedCount,
      conflicts,
    };
    
    // Return 200 if at least one scan was successful, 400 if all failed
    const statusCode = syncedCount > 0 ? 200 : 400;
    return c.json(response, statusCode as 200 | 400);
  } catch (error) {
    console.error('Sync attendance error:', error);
    
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
        message: error instanceof Error ? error.message : 'Failed to sync attendance',
      },
      500
    );
  }
});

/**
 * GET /api/attendance/history
 * Get attendance history with filters
 */
app.get('/history', async (c) => {
  try {
    const db = createDb(c.env);
    const { schoolId, userRole, userId } = getTenantContext(c);
    
    // Parse query parameters
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const classFilter = c.req.query('class');
    const studentId = c.req.query('studentId');
    const status = c.req.query('status');
    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);
    const offset = (page - 1) * limit;
    
    // Build where conditions
    const conditions: any[] = [eq(attendance.schoolId, schoolId)];
    
    if (startDate) {
      conditions.push(sql`${attendance.date} >= ${startDate}`);
    }
    if (endDate) {
      conditions.push(sql`${attendance.date} <= ${endDate}`);
    }
    if (studentId) {
      conditions.push(eq(attendance.studentId, studentId));
    }
    if (status) {
      conditions.push(eq(attendance.status, status as any));
    }
    
    // If teacher, only show classes they're assigned to
    if (userRole === 'teacher') {
      const assignedClasses = await db
        .select({ className: teacherClasses.className })
        .from(teacherClasses)
        .where(
          and(
            eq(teacherClasses.teacherId, userId),
            eq(teacherClasses.schoolId, schoolId)
          )
        );
      
      const classNames = assignedClasses.map((tc) => tc.className);
      if (classNames.length > 0) {
        conditions.push(sql`${students.class} = ANY(${classNames})`);
      }
    }
    
    // Apply class filter
    if (classFilter) {
      conditions.push(eq(students.class, classFilter));
    }
    
    // Query with joins
    const records = await db
      .select({
        id: attendance.id,
        date: attendance.date,
        status: attendance.status,
        scanTime: attendance.scanTime,
        notes: attendance.notes,
        syncedFromOffline: attendance.syncedFromOffline,
        student: {
          id: students.id,
          name: students.name,
          class: students.class,
          studentNumber: students.studentNumber,
          photoUrl: students.photoUrl,
        },
      })
      .from(attendance)
      .innerJoin(students, eq(attendance.studentId, students.id))
      .where(and(...conditions))
      .orderBy(sql`${attendance.date} DESC, ${attendance.scanTime} DESC`)
      .limit(limit)
      .offset(offset);
    
    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(attendance)
      .innerJoin(students, eq(attendance.studentId, students.id))
      .where(and(...conditions));
    
    const count = countResult[0]?.count ?? 0;
    
    return c.json({
      data: records,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Get attendance history error:', error);
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
 * GET /api/attendance/summary
 * Get attendance summary/statistics for a date range
 */
app.get('/summary', async (c) => {
  try {
    const db = createDb(c.env);
    const { schoolId, userRole, userId } = getTenantContext(c);
    
    // Parse query parameters
    const startDate = c.req.query('startDate') || getSchoolDate('WIB');
    const endDate = c.req.query('endDate') || getSchoolDate('WIB');
    const classFilter = c.req.query('class');
    
    // Build where conditions
    const conditions: any[] = [
      eq(attendance.schoolId, schoolId),
      sql`${attendance.date} >= ${startDate}`,
      sql`${attendance.date} <= ${endDate}`,
    ];
    
    // If teacher, only show classes they're assigned to
    let classConditions: SQL[] = [];
    if (userRole === 'teacher') {
      const assignedClasses = await db
        .select({ className: teacherClasses.className })
        .from(teacherClasses)
        .where(
          and(
            eq(teacherClasses.teacherId, userId),
            eq(teacherClasses.schoolId, schoolId)
          )
        );
      
      const classNames = assignedClasses.map((tc) => tc.className);
      if (classNames.length > 0) {
        classConditions.push(sql`${students.class} = ANY(${classNames})`);
      }
    }
    
    // Apply class filter
    if (classFilter) {
      classConditions.push(eq(students.class, classFilter) as unknown as SQL);
    }
    
    // Get status breakdown
    const statusCounts = await db
      .select({
        status: attendance.status,
        count: sql<number>`count(*)::int`,
      })
      .from(attendance)
      .innerJoin(students, eq(attendance.studentId, students.id))
      .where(and(...conditions, ...classConditions))
      .groupBy(attendance.status);
    
    // Get total students in scope
    const studentConditions: any[] = [
      eq(students.schoolId, schoolId),
      eq(students.isActive, true),
    ];
    if (classFilter) {
      studentConditions.push(eq(students.class, classFilter));
    }
    if (classConditions.length > 0) {
      studentConditions.push(...classConditions);
    }
    
    const totalStudentsResult = await db
      .select({ totalStudents: sql<number>`count(*)::int` })
      .from(students)
      .where(and(...studentConditions));
    
    const totalStudents = totalStudentsResult[0]?.totalStudents ?? 0;
    
    // Calculate summary
    const summary = {
      hadir: 0,
      alpha: 0,
      izin: 0,
      sakit: 0,
    };
    
    let totalRecords = 0;
    statusCounts.forEach((row) => {
      if (row.status in summary) {
        summary[row.status as keyof typeof summary] = row.count;
      }
      totalRecords += row.count;
    });
    
    // Get daily breakdown
    const dailyBreakdown = await db
      .select({
        date: attendance.date,
        status: attendance.status,
        count: sql<number>`count(*)::int`,
      })
      .from(attendance)
      .innerJoin(students, eq(attendance.studentId, students.id))
      .where(and(...conditions, ...classConditions))
      .groupBy(attendance.date, attendance.status)
      .orderBy(attendance.date);
    
    // Transform daily breakdown into structured format
    const dailyMap = new Map<string, { hadir: number; alpha: number; izin: number; sakit: number }>();
    dailyBreakdown.forEach((row) => {
      if (!dailyMap.has(row.date)) {
        dailyMap.set(row.date, { hadir: 0, alpha: 0, izin: 0, sakit: 0 });
      }
      const dayData = dailyMap.get(row.date)!;
      if (row.status in dayData) {
        dayData[row.status as keyof typeof dayData] = row.count;
      }
    });
    
    const dailyData = Array.from(dailyMap.entries()).map(([date, counts]) => ({
      date,
      ...counts,
      total: counts.hadir + counts.alpha + counts.izin + counts.sakit,
    }));
    
    // Calculate attendance rate
    const attendanceRate = totalRecords > 0 
      ? Math.round((summary.hadir / totalRecords) * 100 * 100) / 100 
      : 0;
    
    return c.json({
      period: { startDate, endDate },
      totalStudents,
      totalRecords,
      summary,
      attendanceRate,
      daily: dailyData,
    });
  } catch (error) {
    console.error('Get attendance summary error:', error);
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch attendance summary',
      },
      500
    );
  }
});

/**
 * GET /api/attendance/stats
 * Get attendance statistics for dashboard
 */
app.get('/stats', async (c) => {
  try {
    const db = createDb(c.env);
    const { schoolId, userRole, userId } = getTenantContext(c);
    
    // Get school timezone
    const [school] = await db
      .select({ timezone: schools.timezone })
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1);
    
    const timezone = (school?.timezone || 'WIB') as TimezoneType;
    const today = getSchoolDate(timezone);
    
    // Get date 7 days ago
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    
    // Build class filter for teachers
    let classConditions: SQL[] = [];
    if (userRole === 'teacher') {
      const assignedClasses = await db
        .select({ className: teacherClasses.className })
        .from(teacherClasses)
        .where(
          and(
            eq(teacherClasses.teacherId, userId),
            eq(teacherClasses.schoolId, schoolId)
          )
        );
      
      const classNames = assignedClasses.map((tc) => tc.className);
      if (classNames.length > 0) {
        classConditions.push(sql`${students.class} = ANY(${classNames})`);
      }
    }
    
    // Today's stats
    const todayConditions: SQL[] = [
      eq(attendance.schoolId, schoolId) as unknown as SQL,
      eq(attendance.date, today) as unknown as SQL,
    ];
    
    const todayStats = await db
      .select({
        status: attendance.status,
        count: sql<number>`count(*)::int`,
      })
      .from(attendance)
      .innerJoin(students, eq(attendance.studentId, students.id))
      .where(and(...todayConditions, ...classConditions))
      .groupBy(attendance.status);
    
    // Total students
    const studentConditions: SQL[] = [
      eq(students.schoolId, schoolId) as unknown as SQL,
      eq(students.isActive, true) as unknown as SQL,
    ];
    
    const totalStudentsResult = await db
      .select({ totalStudents: sql<number>`count(*)::int` })
      .from(students)
      .where(and(...studentConditions, ...classConditions));
    
    const totalStudents = totalStudentsResult[0]?.totalStudents ?? 0;
    
    // Weekly trend
    const weeklyTrend = await db
      .select({
        date: attendance.date,
        hadir: sql<number>`count(*) filter (where ${attendance.status} = 'hadir')::int`,
        alpha: sql<number>`count(*) filter (where ${attendance.status} = 'alpha')::int`,
        izin: sql<number>`count(*) filter (where ${attendance.status} = 'izin')::int`,
        sakit: sql<number>`count(*) filter (where ${attendance.status} = 'sakit')::int`,
      })
      .from(attendance)
      .innerJoin(students, eq(attendance.studentId, students.id))
      .where(
        and(
          eq(attendance.schoolId, schoolId),
          sql`${attendance.date} >= ${weekAgoStr}`,
          sql`${attendance.date} <= ${today}`,
          ...classConditions
        )
      )
      .groupBy(attendance.date)
      .orderBy(attendance.date);
    
    // Recent scans (last 10)
    const recentScans = await db
      .select({
        id: attendance.id,
        status: attendance.status,
        scanTime: attendance.scanTime,
        student: {
          name: students.name,
          class: students.class,
        },
      })
      .from(attendance)
      .innerJoin(students, eq(attendance.studentId, students.id))
      .where(
        and(
          eq(attendance.schoolId, schoolId),
          eq(attendance.date, today),
          ...classConditions
        )
      )
      .orderBy(sql`${attendance.scanTime} DESC`)
      .limit(10);
    
    // Build today summary
    const todaySummary = {
      hadir: 0,
      alpha: 0,
      izin: 0,
      sakit: 0,
    };
    todayStats.forEach((row) => {
      if (row.status in todaySummary) {
        todaySummary[row.status as keyof typeof todaySummary] = row.count;
      }
    });
    
    const scannedToday = Object.values(todaySummary).reduce((a, b) => a + b, 0);
    const notScanned = totalStudents - scannedToday;
    
    return c.json({
      today: {
        date: today,
        totalStudents,
        scanned: scannedToday,
        notScanned,
        ...todaySummary,
        attendanceRate: scannedToday > 0 
          ? Math.round((todaySummary.hadir / scannedToday) * 100 * 100) / 100 
          : 0,
      },
      weeklyTrend,
      recentScans,
    });
  } catch (error) {
    console.error('Get attendance stats error:', error);
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch attendance statistics',
      },
      500
    );
  }
});

/**
 * GET /api/attendance/class-roster/:className
 * Get class roster with today's attendance status
 */
app.get('/class-roster/:className', async (c) => {
  try {
    const db = createDb(c.env);
    const { schoolId, userRole, userId } = getTenantContext(c);
    const className = c.req.param('className');
    const dateParam = c.req.query('date');
    
    // Get school timezone
    const [school] = await db
      .select({ timezone: schools.timezone })
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1);
    
    const timezone = (school?.timezone || 'WIB') as TimezoneType;
    const targetDate = dateParam || getSchoolDate(timezone);
    
    // Verify teacher has access to this class
    if (userRole === 'teacher') {
      const hasAccess = await validateTeacherAccess(db, userId, className, schoolId);
      if (!hasAccess) {
        return c.json(
          {
            error: 'Forbidden',
            message: `You are not assigned to class ${className}`,
          },
          403
        );
      }
    }
    
    // Get all students in the class with their attendance for the target date
    const roster = await db
      .select({
        id: students.id,
        studentNumber: students.studentNumber,
        name: students.name,
        class: students.class,
        photoUrl: students.photoUrl,
        qrCode: students.qrCode,
        attendance: {
          id: attendance.id,
          status: attendance.status,
          scanTime: attendance.scanTime,
          notes: attendance.notes,
        },
      })
      .from(students)
      .leftJoin(
        attendance,
        and(
          eq(students.id, attendance.studentId),
          eq(attendance.date, targetDate)
        )
      )
      .where(
        and(
          eq(students.schoolId, schoolId),
          eq(students.class, className),
          eq(students.isActive, true)
        )
      )
      .orderBy(students.name);
    
    // Transform results
    const rosterData = roster.map((row) => ({
      id: row.id,
      studentNumber: row.studentNumber,
      name: row.name,
      class: row.class,
      photoUrl: row.photoUrl,
      qrCode: row.qrCode,
      attendance: row.attendance?.id
        ? {
            id: row.attendance.id,
            status: row.attendance.status,
            scanTime: row.attendance.scanTime,
            notes: row.attendance.notes,
          }
        : null,
    }));
    
    // Calculate summary
    const summary = {
      total: rosterData.length,
      scanned: rosterData.filter((s) => s.attendance).length,
      hadir: rosterData.filter((s) => s.attendance?.status === 'hadir').length,
      alpha: rosterData.filter((s) => s.attendance?.status === 'alpha').length,
      izin: rosterData.filter((s) => s.attendance?.status === 'izin').length,
      sakit: rosterData.filter((s) => s.attendance?.status === 'sakit').length,
      notScanned: rosterData.filter((s) => !s.attendance).length,
    };
    
    return c.json({
      class: className,
      date: targetDate,
      summary,
      roster: rosterData,
    });
  } catch (error) {
    console.error('Get class roster error:', error);
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch class roster',
      },
      500
    );
  }
});

/**
 * POST /api/attendance/manual
 * Record manual attendance entry (without QR scan)
 */
app.post('/manual', async (c) => {
  try {
    const db = createDb(c.env);
    const { userId: teacherId, schoolId } = getTenantContext(c);
    
    // Validate request body
    const manualSchema = z.object({
      studentId: z.string().uuid(),
      status: attendanceStatusSchema,
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      notes: z.string().max(500).optional(),
    });
    
    const body = await c.req.json();
    const validatedData = manualSchema.parse(body);
    
    // Fetch student and verify
    const [student] = await db
      .select()
      .from(students)
      .where(
        and(
          eq(students.id, validatedData.studentId),
          eq(students.schoolId, schoolId)
        )
      )
      .limit(1);
    
    if (!student) {
      return c.json({ error: 'Not Found', message: 'Student not found' }, 404);
    }
    
    if (!student.isActive) {
      return c.json({ error: 'Bad Request', message: 'Student is not active' }, 400);
    }
    
    // Verify teacher has access to student's class
    const hasAccess = await validateTeacherAccess(db, teacherId, student.class, schoolId);
    if (!hasAccess) {
      return c.json(
        {
          error: 'Forbidden',
          message: `Access denied. You are not assigned to class ${student.class}`,
        },
        403
      );
    }
    
    // Get school timezone
    const [school] = await db
      .select({ timezone: schools.timezone })
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1);
    
    const timezone = (school?.timezone || 'WIB') as TimezoneType;
    const scanTime = getSchoolLocalTime(timezone);
    
    // Create or update attendance record
    const newAttendance: NewAttendance = {
      schoolId,
      studentId: validatedData.studentId,
      teacherId,
      date: validatedData.date,
      status: validatedData.status,
      scanTime,
      notes: validatedData.notes || 'Manual entry',
      syncedFromOffline: false,
    };
    
    const createdAttendanceResult = await db
      .insert(attendance)
      .values(newAttendance)
      .onConflictDoUpdate({
        target: [attendance.studentId, attendance.date],
        set: {
          status: validatedData.status,
          scanTime,
          teacherId,
          notes: validatedData.notes || 'Manual entry (updated)',
        },
      })
      .returning();
    
    const createdAttendance = createdAttendanceResult[0];
    if (!createdAttendance) {
      throw new Error('Failed to create attendance record');
    }
    
    return c.json({
      success: true,
      attendanceId: createdAttendance.id,
      student: {
        id: student.id,
        name: student.name,
        class: student.class,
        studentNumber: student.studentNumber,
      },
      status: validatedData.status,
      date: validatedData.date,
    }, 201);
  } catch (error) {
    console.error('Manual attendance error:', error);
    
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
        message: 'Failed to record manual attendance',
      },
      500
    );
  }
});

/**
 * Export routes
 */
export default app;
