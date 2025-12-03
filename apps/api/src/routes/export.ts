/**
 * Export Routes
 * Handles attendance report exports in multiple formats (CSV, XLSX, PDF)
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, sql, desc, type SQL } from 'drizzle-orm';
import type { Context } from 'hono';
import { createDb } from '../db';
import {
  exportJobs,
  attendance,
  students,
  teacherClasses,
  type NewExportJob,
} from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { requireTeacher } from '../middleware/rbac';
import { tenantMiddleware, getTenantContext, type TenantContext } from '../middleware/tenant';

/**
 * Initialize router with type-safe environment
 */
const app = new Hono<TenantContext>();

/**
 * Apply authentication and tenant middleware to all routes
 */
app.use('*', authMiddleware);
app.use('*', tenantMiddleware());
app.use('*', requireTeacher());

/**
 * ZOD VALIDATION SCHEMAS
 */

// Export format enum
const exportFormatSchema = z.enum(['csv', 'xlsx', 'pdf']);

// Export filters schema
const exportFiltersSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD'),
  class: z.string().optional(),
  status: z.enum(['hadir', 'alpha', 'izin', 'sakit']).optional(),
});

// Create export request schema
const createExportSchema = z.object({
  format: exportFormatSchema,
  filters: exportFiltersSchema,
});

// List exports query parameters
const listExportsQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional().default('1'),
  limit: z.string().regex(/^\d+$/).optional().default('20'),
  status: z.enum(['queued', 'processing', 'completed', 'failed']).optional(),
});

/**
 * TYPES
 */

interface ExportFilters {
  startDate: string;
  endDate: string;
  class?: string;
  status?: 'hadir' | 'alpha' | 'izin' | 'sakit';
}

interface AttendanceExportRecord {
  date: string;
  studentNumber: string;
  studentName: string;
  class: string;
  status: string;
  scanTime: string;
  notes: string | null;
}

/**
 * HELPER FUNCTIONS
 */

/**
 * Generate CSV content from attendance records
 */
function generateCSV(records: AttendanceExportRecord[]): string {
  // CSV header
  const header = ['Date', 'Student Number', 'Student Name', 'Class', 'Status', 'Scan Time', 'Notes'].join(',');
  
  // CSV rows
  const rows = records.map((record) => {
    return [
      record.date,
      record.studentNumber,
      `"${record.studentName.replace(/"/g, '""')}"`, // Escape quotes in names
      record.class,
      record.status,
      record.scanTime,
      record.notes ? `"${record.notes.replace(/"/g, '""')}"` : '',
    ].join(',');
  });
  
  return [header, ...rows].join('\n');
}

/**
 * Fetch attendance records based on filters
 */
async function fetchAttendanceRecords(
  db: ReturnType<typeof createDb>,
  schoolId: string,
  userId: string,
  userRole: string,
  filters: ExportFilters
): Promise<AttendanceExportRecord[]> {
  // Build where conditions
  const conditions: SQL[] = [
    eq(attendance.schoolId, schoolId) as unknown as SQL,
    sql`${attendance.date} >= ${filters.startDate}`,
    sql`${attendance.date} <= ${filters.endDate}`,
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
    } else {
      // Teacher has no assigned classes, return empty result
      return [];
    }
  }
  
  // Apply class filter
  if (filters.class) {
    classConditions.push(eq(students.class, filters.class) as unknown as SQL);
  }
  
  // Apply status filter
  if (filters.status) {
    conditions.push(eq(attendance.status, filters.status) as unknown as SQL);
  }
  
  // Query attendance records with student info
  const records = await db
    .select({
      date: attendance.date,
      studentNumber: students.studentNumber,
      studentName: students.name,
      class: students.class,
      status: attendance.status,
      scanTime: attendance.scanTime,
      notes: attendance.notes,
    })
    .from(attendance)
    .innerJoin(students, eq(attendance.studentId, students.id))
    .where(and(...conditions, ...classConditions))
    .orderBy(attendance.date, students.class, students.name);
  
  // Transform to export format
  return records.map((record) => ({
    date: record.date,
    studentNumber: record.studentNumber,
    studentName: record.studentName,
    class: record.class,
    status: record.status,
    scanTime: record.scanTime.toISOString(),
    notes: record.notes,
  }));
}

/**
 * ROUTES
 */

/**
 * POST /api/exports
 * Create new export job
 */
app.post('/', async (c: Context<TenantContext>) => {
  try {
    const db = createDb(c.env);
    const { userId, schoolId, userRole } = getTenantContext(c);
    
    // Parse and validate request body
    const body = await c.req.json();
    const validatedData = createExportSchema.parse(body);
    
    // Validate date range
    const startDate = new Date(validatedData.filters.startDate);
    const endDate = new Date(validatedData.filters.endDate);
    
    if (startDate > endDate) {
      return c.json(
        {
          error: 'Validation Error',
          message: 'Start date must be before or equal to end date',
        },
        400
      );
    }
    
    // Check if date range is reasonable (max 1 year)
    const daysDifference = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDifference > 365) {
      return c.json(
        {
          error: 'Validation Error',
          message: 'Date range cannot exceed 1 year',
        },
        400
      );
    }
    
    // Verify class access if class filter is specified
    if (validatedData.filters.class && userRole === 'teacher') {
      const [classAccess] = await db
        .select()
        .from(teacherClasses)
        .where(
          and(
            eq(teacherClasses.teacherId, userId),
            eq(teacherClasses.className, validatedData.filters.class),
            eq(teacherClasses.schoolId, schoolId)
          )
        )
        .limit(1);
      
      if (!classAccess) {
        return c.json(
          {
            error: 'Forbidden',
            message: `You are not assigned to class ${validatedData.filters.class}`,
          },
          403
        );
      }
    }
    
    // For MVP: Generate CSV synchronously
    if (validatedData.format === 'csv') {
      // Fetch attendance records (cast filters as they are validated by Zod)
      const records = await fetchAttendanceRecords(
        db,
        schoolId,
        userId,
        userRole,
        validatedData.filters as ExportFilters
      );
      
      // Create export job record with completed status
      const newExportJob: NewExportJob = {
        schoolId,
        userId,
        format: validatedData.format,
        filters: validatedData.filters,
        status: 'completed',
        fileUrl: null, // No file URL for MVP (generated on-demand)
        completedAt: new Date(),
      };
      
      const [exportJob] = await db
        .insert(exportJobs)
        .values(newExportJob)
        .returning();
      
      if (!exportJob) {
        throw new Error('Failed to create export job');
      }
      
      return c.json(
        {
          id: exportJob.id,
          format: exportJob.format,
          filters: exportJob.filters,
          status: exportJob.status,
          recordCount: records.length,
          createdAt: exportJob.createdAt,
          completedAt: exportJob.completedAt,
          message: 'Export completed. Use the download endpoint to get the file.',
        },
        201
      );
    }
    
    // For XLSX and PDF: Create queued job (to be implemented in future)
    const newExportJob: NewExportJob = {
      schoolId,
      userId,
      format: validatedData.format,
      filters: validatedData.filters,
      status: 'queued',
      fileUrl: null,
    };
    
    const [exportJob] = await db
      .insert(exportJobs)
      .values(newExportJob)
      .returning();
    
    if (!exportJob) {
      throw new Error('Failed to create export job');
    }
    
    return c.json(
      {
        id: exportJob.id,
        format: exportJob.format,
        filters: exportJob.filters,
        status: exportJob.status,
        createdAt: exportJob.createdAt,
        message: `${validatedData.format.toUpperCase()} export is queued for processing. Check the status endpoint for updates.`,
      },
      201
    );
  } catch (error) {
    console.error('Create export job error:', error);
    
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
        message: 'Failed to create export job',
      },
      500
    );
  }
});

/**
 * GET /api/exports
 * List user's export jobs with pagination
 */
app.get('/', async (c: Context<TenantContext>) => {
  try {
    const db = createDb(c.env);
    const { userId, schoolId } = getTenantContext(c);
    
    // Parse and validate query parameters
    const query = listExportsQuerySchema.parse({
      page: c.req.query('page') || '1',
      limit: c.req.query('limit') || '20',
      status: c.req.query('status') as 'queued' | 'processing' | 'completed' | 'failed' | undefined,
    });
    
    const page = parseInt(query.page);
    const limit = Math.min(parseInt(query.limit), 100); // Max 100 per page
    const offset = (page - 1) * limit;
    
    // Build where conditions
    const conditions: SQL[] = [
      eq(exportJobs.schoolId, schoolId) as unknown as SQL,
      eq(exportJobs.userId, userId) as unknown as SQL,
    ];
    
    // Filter by status if provided
    if (query.status) {
      conditions.push(eq(exportJobs.status, query.status) as unknown as SQL);
    }
    
    // Fetch export jobs
    const jobs = await db
      .select({
        id: exportJobs.id,
        format: exportJobs.format,
        filters: exportJobs.filters,
        status: exportJobs.status,
        fileUrl: exportJobs.fileUrl,
        createdAt: exportJobs.createdAt,
        completedAt: exportJobs.completedAt,
      })
      .from(exportJobs)
      .where(and(...conditions))
      .orderBy(desc(exportJobs.createdAt))
      .limit(limit)
      .offset(offset);
    
    // Get total count for pagination
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(exportJobs)
      .where(and(...conditions));
    
    const totalCount = countResult?.count ?? 0;
    
    return c.json({
      exports: jobs,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: offset + jobs.length < totalCount,
      },
    });
  } catch (error) {
    console.error('List export jobs error:', error);
    
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
        message: 'Failed to list export jobs',
      },
      500
    );
  }
});

/**
 * GET /api/exports/:id
 * Get export job status
 */
app.get('/:id', async (c: Context<TenantContext>) => {
  try {
    const db = createDb(c.env);
    const { userId, schoolId } = getTenantContext(c);
    const exportId = c.req.param('id');
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(exportId)) {
      return c.json(
        {
          error: 'Bad Request',
          message: 'Invalid export ID format',
        },
        400
      );
    }
    
    // Fetch export job
    const [exportJob] = await db
      .select({
        id: exportJobs.id,
        format: exportJobs.format,
        filters: exportJobs.filters,
        status: exportJobs.status,
        fileUrl: exportJobs.fileUrl,
        createdAt: exportJobs.createdAt,
        completedAt: exportJobs.completedAt,
      })
      .from(exportJobs)
      .where(
        and(
          eq(exportJobs.id, exportId),
          eq(exportJobs.schoolId, schoolId),
          eq(exportJobs.userId, userId)
        )
      )
      .limit(1);
    
    if (!exportJob) {
      return c.json(
        {
          error: 'Not Found',
          message: 'Export job not found',
        },
        404
      );
    }
    
    return c.json({
      id: exportJob.id,
      format: exportJob.format,
      filters: exportJob.filters,
      status: exportJob.status,
      fileUrl: exportJob.fileUrl,
      createdAt: exportJob.createdAt,
      completedAt: exportJob.completedAt,
    });
  } catch (error) {
    console.error('Get export job error:', error);
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to get export job',
      },
      500
    );
  }
});

/**
 * GET /api/exports/:id/download
 * Download exported file (for MVP, generates CSV on-the-fly)
 */
app.get('/:id/download', async (c: Context<TenantContext>) => {
  try {
    const db = createDb(c.env);
    const { userId, schoolId, userRole } = getTenantContext(c);
    const exportId = c.req.param('id');
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(exportId)) {
      return c.json(
        {
          error: 'Bad Request',
          message: 'Invalid export ID format',
        },
        400
      );
    }
    
    // Fetch export job
    const [exportJob] = await db
      .select()
      .from(exportJobs)
      .where(
        and(
          eq(exportJobs.id, exportId),
          eq(exportJobs.schoolId, schoolId),
          eq(exportJobs.userId, userId)
        )
      )
      .limit(1);
    
    if (!exportJob) {
      return c.json(
        {
          error: 'Not Found',
          message: 'Export job not found',
        },
        404
      );
    }
    
    // Check if export is completed
    if (exportJob.status !== 'completed') {
      return c.json(
        {
          error: 'Bad Request',
          message: `Export is not ready for download. Current status: ${exportJob.status}`,
          status: exportJob.status,
        },
        400
      );
    }
    
    // For MVP: Generate CSV on-the-fly
    if (exportJob.format === 'csv') {
      const filters = exportJob.filters as unknown as ExportFilters;
      
      // Fetch attendance records
      const records = await fetchAttendanceRecords(
        db,
        schoolId,
        userId,
        userRole,
        filters
      );
      
      // Generate CSV
      const csvContent = generateCSV(records);
      
      // Generate filename
      const filename = `attendance_${filters.startDate}_to_${filters.endDate}.csv`;
      
      // Return CSV file
      return new Response(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': csvContent.length.toString(),
        },
      });
    }
    
    // For other formats (XLSX, PDF): Return error for MVP
    return c.json(
      {
        error: 'Not Implemented',
        message: `${exportJob.format.toUpperCase()} download is not yet implemented. Please use CSV format.`,
      },
      501
    );
  } catch (error) {
    console.error('Download export error:', error);
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to download export',
      },
      500
    );
  }
});

/**
 * Export routes
 */
export default app;
