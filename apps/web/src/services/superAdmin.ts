/**
 * Super Admin Service
 * API calls for platform-wide administration
 */

import { createAuthenticatedClient } from './api'

/**
 * Platform Statistics
 */
export interface PlatformStats {
  totalSchools: number
  activeSchools: number
  pendingSchools: number
  suspendedSchools: number
  totalUsers: number
  totalStudents: number
  scansToday: number
  scansThisWeek: number
}

/**
 * Pending School
 */
export interface PendingSchool {
  id: string
  name: string
  subdomain: string
  adminEmail: string
  adminName: string
  timezone: string
  createdAt: string
}

export interface PendingSchoolsResponse {
  schools: PendingSchool[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * School List Item
 */
export interface SchoolListItem {
  id: string
  name: string
  subdomain: string
  status: string
  timezone: string
  maxStudents: number
  studentCount: number
  adminEmail: string | null
  adminName: string | null
  createdAt: string
}

export interface SchoolsListResponse {
  schools: SchoolListItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * School Details
 */
export interface SchoolDetails {
  school: {
    id: string
    name: string
    subdomain: string
    status: string
    logoUrl: string | null
    primaryColor: string
    timezone: string
    maxStudents: number
    schoolHours: {
      start: string
      end: string
      scanWindow: number
    }
    createdAt: string
  }
  admin: {
    id: string
    name: string
    email: string
    isActive: boolean
    createdAt: string
  } | null
  statistics: {
    users: {
      total: number
      byRole: Record<string, number>
    }
    students: {
      total: number
      active: number
    }
    attendanceLast30Days: number
  }
}

/**
 * Activity Log
 */
export interface ActivityLog {
  id: string
  schoolName: string
  userName: string
  action: string
  entityType: string
  entityId: string
  createdAt: string
}

export interface ActivityLogsResponse {
  activities: ActivityLog[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * Super Admin Service Class
 */
class SuperAdminService {
  /**
   * Get platform-wide statistics
   */
  async getStats(token: string): Promise<PlatformStats> {
    const client = createAuthenticatedClient(token)
    return client.get<PlatformStats>('/api/super-admin/stats')
  }

  /**
   * Get pending schools
   */
  async getPendingSchools(
    token: string,
    page: number = 1,
    limit: number = 10
  ): Promise<PendingSchoolsResponse> {
    const client = createAuthenticatedClient(token)
    return client.get<PendingSchoolsResponse>('/api/super-admin/schools/pending', {
      params: { page, limit },
    })
  }

  /**
   * Get school details
   */
  async getSchoolDetails(token: string, schoolId: string): Promise<SchoolDetails> {
    const client = createAuthenticatedClient(token)
    return client.get<SchoolDetails>(`/api/super-admin/schools/${schoolId}/details`)
  }

  /**
   * Get platform activity logs
   */
  async getActivityLogs(
    token: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ActivityLogsResponse> {
    const client = createAuthenticatedClient(token)
    return client.get<ActivityLogsResponse>('/api/super-admin/activity', {
      params: { page, limit },
    })
  }

  /**
   * Approve a pending school
   */
  async approveSchool(token: string, schoolId: string): Promise<{ message: string }> {
    const client = createAuthenticatedClient(token)
    return client.post<{ message: string }>(`/api/super-admin/schools/${schoolId}/approve`)
  }

  /**
   * Suspend a school
   */
  async suspendSchool(token: string, schoolId: string, reason: string): Promise<{ message: string }> {
    const client = createAuthenticatedClient(token)
    return client.post<{ message: string }>(`/api/super-admin/schools/${schoolId}/suspend`, { reason })
  }

  /**
   * Reactivate a suspended school
   */
  async reactivateSchool(token: string, schoolId: string): Promise<{ message: string }> {
    const client = createAuthenticatedClient(token)
    return client.post<{ message: string }>(`/api/super-admin/schools/${schoolId}/reactivate`)
  }

  /**
   * Get all schools with filtering
   */
  async getAllSchools(
    token: string,
    params?: { page?: number; limit?: number; status?: string; search?: string }
  ): Promise<SchoolsListResponse> {
    const client = createAuthenticatedClient(token)
    return client.get<SchoolsListResponse>('/api/super-admin/schools', { params })
  }

  /**
   * Reject a pending school
   */
  async rejectSchool(token: string, schoolId: string, reason?: string): Promise<{ message: string }> {
    const client = createAuthenticatedClient(token)
    return client.post<{ message: string }>(`/api/super-admin/schools/${schoolId}/reject`, { reason })
  }
}

export const superAdminService = new SuperAdminService()
