/**
 * Audit Log Routes
 * Handles audit log querying and export for compliance and monitoring
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { createDb } from '../db';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware, getTenantContext, type TenantContext } from '../middleware/tenant';
import { requireSchoolAdmin } from '../middleware/rbac';
import {
  getAuditLogs,
  getAuditLogById,
  type AuditAction,
  type AuditEntityType,
} from '../lib/audit';

/**
 * Initialize router with type-safe environment
 */
const app = new Hono<TenantContext>();

/**
 * Apply authentication and tenant middleware to all routes
 * Admin role required for audit log access (school_admin or super_admin)
 */
app.use('*', authMiddleware);
app.use('*', tenantMiddleware());
app.use('*', requireSchoolAdmin());

/**
 * ZOD VALIDATION SCHEMAS
 */

// Valid audit actions
const auditActionSchema = z.enum([
  'create',
  'update',
  'delete',
  'login',
  'logout',
  'password_reset',
  'bulk_import',
  'export',
  'approve',
  'reject',
  'scan',
]);

// Valid entity types
const auditEntityTypeSchema = z.enum([
  'user',
  'student',
  'teacher',
  'school',
  'attendance',
  'dispute',
  'class',
  'export_job',
]);

// Query parameters for listing audit logs
const listAuditLogsQuerySchema = z.object({
  action: auditActionSchema.optional(),
  entityType: auditEntityTypeSchema.optional(),
  entityId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

// Query parameters for exporting audit logs
const exportAuditLogsQuerySchema = z.object({
  action: auditActionSchema.optional(),
  entityType: auditEntityTypeSchema.optional(),
  entityId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * TYPES
 */

interface AuditLogResponse {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface AuditLogsListResponse {
  data: AuditLogResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * HELPER FUNCTIONS
 */

/**
 * Transform audit log data for API response
 */
function transformAuditLog(log: {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}): AuditLogResponse {
  return {
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    userId: log.userId,
    oldValue: log.oldValue,
    newValue: log.newValue,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt.toISOString(),
  };
}

/**
 * Convert audit logs to CSV format
 */
function convertToCSV(logs: AuditLogResponse[]): string {
  if (logs.length === 0) {
    return 'id,action,entityType,entityId,userId,ipAddress,userAgent,createdAt\n';
  }

  // CSV header
  const header = 'id,action,entityType,entityId,userId,ipAddress,userAgent,createdAt\n';

  // CSV rows
  const rows = logs.map((log) => {
    const escapeCsvValue = (value: unknown): string => {
      if (value === null || value === undefined) {
        return '';
      }
      const str = String(value);
      // Escape double quotes and wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    return [
      escapeCsvValue(log.id),
      escapeCsvValue(log.action),
      escapeCsvValue(log.entityType),
      escapeCsvValue(log.entityId),
      escapeCsvValue(log.userId),
      escapeCsvValue(log.ipAddress),
      escapeCsvValue(log.userAgent),
      escapeCsvValue(log.createdAt),
    ].join(',');
  });

  return header + rows.join('\n');
}

/**
 * ROUTES
 */

/**
 * GET /api/audit-logs
 * List audit logs with pagination and filters
 */
app.get('/', async (c) => {
  try {
    const db = createDb(c.env);
    const { schoolId } = getTenantContext(c);

    // Parse and validate query parameters
    const queryParams = listAuditLogsQuerySchema.parse({
      action: c.req.query('action'),
      entityType: c.req.query('entityType'),
      entityId: c.req.query('entityId'),
      userId: c.req.query('userId'),
      startDate: c.req.query('startDate'),
      endDate: c.req.query('endDate'),
      page: c.req.query('page'),
      limit: c.req.query('limit'),
    });

    // Get audit logs with filters
    const result = await getAuditLogs(db, {
      schoolId,
      action: queryParams.action as AuditAction | undefined,
      entityType: queryParams.entityType as AuditEntityType | undefined,
      entityId: queryParams.entityId,
      userId: queryParams.userId,
      startDate: queryParams.startDate,
      endDate: queryParams.endDate,
      page: queryParams.page,
      limit: queryParams.limit,
    });

    // Transform data for response
    const response: AuditLogsListResponse = {
      data: result.data.map(transformAuditLog),
      pagination: result.pagination,
    };

    return c.json(response, 200);
  } catch (error) {
    console.error('List audit logs error:', error);

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
        message: 'Failed to fetch audit logs',
      },
      500
    );
  }
});

/**
 * GET /api/audit-logs/export
 * Export audit logs as CSV
 */
app.get('/export', async (c) => {
  try {
    const db = createDb(c.env);
    const { schoolId } = getTenantContext(c);

    // Parse and validate query parameters
    const queryParams = exportAuditLogsQuerySchema.parse({
      action: c.req.query('action'),
      entityType: c.req.query('entityType'),
      entityId: c.req.query('entityId'),
      userId: c.req.query('userId'),
      startDate: c.req.query('startDate'),
      endDate: c.req.query('endDate'),
    });

    // Get all audit logs matching filters (no pagination for export)
    const result = await getAuditLogs(db, {
      schoolId,
      action: queryParams.action as AuditAction | undefined,
      entityType: queryParams.entityType as AuditEntityType | undefined,
      entityId: queryParams.entityId,
      userId: queryParams.userId,
      startDate: queryParams.startDate,
      endDate: queryParams.endDate,
      page: 1,
      limit: 100, // Max limit to prevent memory issues
    });

    // Transform to CSV
    const csvData = convertToCSV(result.data.map(transformAuditLog));

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `audit-logs-${timestamp}.csv`;

    // Return CSV response
    return c.text(csvData, 200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
  } catch (error) {
    console.error('Export audit logs error:', error);

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
        message: 'Failed to export audit logs',
      },
      500
    );
  }
});

/**
 * GET /api/audit-logs/:id
 * Get single audit log detail
 */
app.get('/:id', async (c) => {
  try {
    const db = createDb(c.env);
    const { schoolId } = getTenantContext(c);
    const id = c.req.param('id');

    // Validate UUID format
    const uuidSchema = z.string().uuid();
    const validatedId = uuidSchema.parse(id);

    // Get audit log by ID
    const log = await getAuditLogById(db, validatedId, schoolId);

    if (!log) {
      return c.json(
        {
          error: 'Not Found',
          message: 'Audit log not found',
        },
        404
      );
    }

    // Transform and return
    return c.json(transformAuditLog(log), 200);
  } catch (error) {
    console.error('Get audit log error:', error);

    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: 'Validation Error',
          message: 'Invalid audit log ID',
          details: error.errors,
        },
        400
      );
    }

    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch audit log',
      },
      500
    );
  }
});

/**
 * Export routes
 */
export default app;
