/**
 * Audit Log Service
 * Tracks all sensitive actions for compliance and debugging
 */

import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { auditLogs, type NewAuditLog } from '../db/schema';

/**
 * Audit action types
 */
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'password_reset'
  | 'bulk_import'
  | 'export'
  | 'approve'
  | 'reject'
  | 'scan';

/**
 * Entity types that can be audited
 */
export type AuditEntityType =
  | 'user'
  | 'student'
  | 'teacher'
  | 'school'
  | 'attendance'
  | 'dispute'
  | 'class'
  | 'export_job';

/**
 * Parameters for logging an audit event
 */
export interface LogAuditParams {
  schoolId: string;
  userId?: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Filters for querying audit logs
 */
export interface AuditLogFilters {
  schoolId: string;
  action?: AuditAction;
  entityType?: AuditEntityType;
  entityId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Log an audit event to the database
 */
export async function logAuditEvent(
  db: ReturnType<typeof import('../db').createDb>,
  params: LogAuditParams
): Promise<string> {
  const auditLog: NewAuditLog = {
    schoolId: params.schoolId,
    userId: params.userId || null,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    oldValue: params.oldValue || null,
    newValue: params.newValue || null,
    ipAddress: params.ipAddress || null,
    userAgent: params.userAgent || null,
  };

  const result = await db.insert(auditLogs).values(auditLog).returning({ id: auditLogs.id });
  const created = result[0];
  
  if (!created) {
    throw new Error('Failed to create audit log');
  }

  return created.id;
}

/**
 * Get audit logs with filters and pagination
 */
export async function getAuditLogs(
  db: ReturnType<typeof import('../db').createDb>,
  filters: AuditLogFilters
): Promise<{
  data: Array<{
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
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 50, 100);
  const offset = (page - 1) * limit;

  // Build conditions
  const conditions = [eq(auditLogs.schoolId, filters.schoolId)];

  if (filters.action) {
    conditions.push(eq(auditLogs.action, filters.action));
  }
  if (filters.entityType) {
    conditions.push(eq(auditLogs.entityType, filters.entityType));
  }
  if (filters.entityId) {
    conditions.push(eq(auditLogs.entityId, filters.entityId));
  }
  if (filters.userId) {
    conditions.push(eq(auditLogs.userId, filters.userId));
  }
  if (filters.startDate) {
    conditions.push(gte(auditLogs.createdAt, new Date(filters.startDate)));
  }
  if (filters.endDate) {
    conditions.push(lte(auditLogs.createdAt, new Date(filters.endDate)));
  }

  // Query logs
  const logs = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      userId: auditLogs.userId,
      oldValue: auditLogs.oldValue,
      newValue: auditLogs.newValue,
      ipAddress: auditLogs.ipAddress,
      userAgent: auditLogs.userAgent,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(and(...conditions))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(and(...conditions));

  const total = countResult[0]?.count ?? 0;

  return {
    data: logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single audit log by ID
 */
export async function getAuditLogById(
  db: ReturnType<typeof import('../db').createDb>,
  id: string,
  schoolId: string
): Promise<{
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
} | null> {
  const [log] = await db
    .select()
    .from(auditLogs)
    .where(and(eq(auditLogs.id, id), eq(auditLogs.schoolId, schoolId)))
    .limit(1);

  return log || null;
}

/**
 * Helper to extract client info from request
 */
export function extractClientInfo(request: Request): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  return {
    ipAddress: request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for'),
    userAgent: request.headers.get('user-agent'),
  };
}
