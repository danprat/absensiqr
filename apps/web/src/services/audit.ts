/**
 * Audit Service
 * 
 * API service for audit log operations
 */

import { createAuthenticatedClient } from './api'
import { getAuthToken } from './auth'

/**
 * Types
 */

/**
 * Valid audit actions
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
  | 'scan'

/**
 * Valid entity types
 */
export type AuditEntityType =
  | 'user'
  | 'student'
  | 'teacher'
  | 'school'
  | 'attendance'
  | 'dispute'
  | 'class'
  | 'export_job'

/**
 * Audit log record
 */
export interface AuditLog {
  id: string
  action: AuditAction
  entityType: AuditEntityType
  entityId: string
  userId: string | null
  oldValue: unknown
  newValue: unknown
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

/**
 * Audit logs list response
 */
export interface AuditLogsResponse {
  data: AuditLog[]
  pagination: PaginationMeta
}

/**
 * Filters for audit logs query
 */
export interface AuditLogFilters {
  action?: AuditAction
  entityType?: AuditEntityType
  entityId?: string
  userId?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

/**
 * Export filters (no pagination)
 */
export interface AuditLogExportFilters {
  action?: AuditAction
  entityType?: AuditEntityType
  entityId?: string
  userId?: string
  startDate?: string
  endDate?: string
}

/**
 * Get authentication client
 */
const getAuthClient = () => {
  const token = getAuthToken()
  if (!token) {
    throw new Error('Not authenticated')
  }
  return createAuthenticatedClient(token)
}

/**
 * Get list of audit logs with filters and pagination
 * 
 * @param filters - Query filters including pagination
 * @returns Promise with audit logs and pagination metadata
 */
export const getAuditLogs = async (
  filters?: AuditLogFilters
): Promise<AuditLogsResponse> => {
  const authClient = getAuthClient()
  const params: Record<string, string> = {}
  
  if (filters?.action) params.action = filters.action
  if (filters?.entityType) params.entityType = filters.entityType
  if (filters?.entityId) params.entityId = filters.entityId
  if (filters?.userId) params.userId = filters.userId
  if (filters?.startDate) params.startDate = filters.startDate
  if (filters?.endDate) params.endDate = filters.endDate
  if (filters?.page) params.page = String(filters.page)
  if (filters?.limit) params.limit = String(filters.limit)
  
  return authClient.get<AuditLogsResponse>('/api/audit-logs', { params })
}

/**
 * Get single audit log by ID
 * 
 * @param id - Audit log UUID
 * @returns Promise with audit log details
 */
export const getAuditLog = async (id: string): Promise<AuditLog> => {
  const authClient = getAuthClient()
  return authClient.get<AuditLog>(`/api/audit-logs/${id}`)
}

/**
 * Export audit logs as CSV
 * 
 * @param filters - Export filters (no pagination)
 * @returns Promise with blob URL for download
 */
export const exportAuditLogs = async (
  filters?: AuditLogExportFilters
): Promise<string> => {
  const token = getAuthToken()
  if (!token) {
    throw new Error('Not authenticated')
  }
  
  const params = new URLSearchParams()
  if (filters?.action) params.set('action', filters.action)
  if (filters?.entityType) params.set('entityType', filters.entityType)
  if (filters?.entityId) params.set('entityId', filters.entityId)
  if (filters?.userId) params.set('userId', filters.userId)
  if (filters?.startDate) params.set('startDate', filters.startDate)
  if (filters?.endDate) params.set('endDate', filters.endDate)
  
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787'
  const url = `${baseUrl}/api/audit-logs/export?${params.toString()}`
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to export audit logs: ${errorText}`)
  }
  
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

/**
 * Helper function to format action type for display
 */
export const formatActionType = (action: AuditAction): string => {
  const actionLabels: Record<AuditAction, string> = {
    create: 'Create',
    update: 'Update',
    delete: 'Delete',
    login: 'Login',
    logout: 'Logout',
    password_reset: 'Password Reset',
    bulk_import: 'Bulk Import',
    export: 'Export',
    approve: 'Approve',
    reject: 'Reject',
    scan: 'Scan',
  }
  return actionLabels[action] || action
}

/**
 * Helper function to format entity type for display
 */
export const formatEntityType = (entityType: AuditEntityType): string => {
  const entityLabels: Record<AuditEntityType, string> = {
    user: 'User',
    student: 'Student',
    teacher: 'Teacher',
    school: 'School',
    attendance: 'Attendance',
    dispute: 'Dispute',
    class: 'Class',
    export_job: 'Export Job',
  }
  return entityLabels[entityType] || entityType
}

/**
 * Helper function to get action badge variant
 */
export const getActionBadgeVariant = (
  action: AuditAction
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (action) {
    case 'create':
    case 'approve':
      return 'default'
    case 'update':
    case 'scan':
      return 'secondary'
    case 'delete':
    case 'reject':
      return 'destructive'
    default:
      return 'outline'
  }
}
