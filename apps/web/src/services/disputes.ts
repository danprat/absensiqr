/**
 * Disputes Service
 * API calls for dispute management
 */

import { createAuthenticatedClient } from './api'
import type { AttendanceStatus } from './attendance'

/**
 * Type Definitions
 */

export type DisputeStatus = 'pending' | 'approved' | 'rejected'

export interface DisputeStudent {
  id: string
  name: string
  studentNumber: string
  class: string
  email?: string | null
  phone?: string | null
  photoUrl?: string | null
}

export interface DisputeAttendance {
  date: string
  status: AttendanceStatus
  scanTime?: string
  notes?: string | null
}

export interface Dispute {
  id: string
  attendanceId: string
  student: DisputeStudent
  attendance: DisputeAttendance
  reason: string
  status: DisputeStatus
  teacherNotes?: string | null
  createdAt: string
  resolvedAt: string | null
}

export interface DisputeDetail extends Dispute {
  student: DisputeStudent & {
    email?: string | null
    phone?: string | null
    photoUrl?: string | null
  }
  attendance: DisputeAttendance & {
    scanTime: string
    notes?: string | null
  }
}

export interface DisputesListFilters {
  status?: DisputeStatus | 'all'
  page?: number
  limit?: number
}

export interface DisputesListResponse {
  disputes: Dispute[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface DisputeDetailResponse {
  dispute: DisputeDetail
}

export interface ResolveDisputeRequest {
  status: 'approved' | 'rejected'
  teacherNotes?: string
}

export interface ResolveDisputeResponse {
  message: string
  dispute: Dispute
}

/**
 * Disputes Service Class
 */
class DisputesService {
  /**
   * Get list of disputes with optional filters
   */
  async getDisputes(
    token: string,
    filters?: DisputesListFilters
  ): Promise<DisputesListResponse> {
    const client = createAuthenticatedClient(token)
    
    const params: Record<string, string | number | boolean> = {}
    if (filters?.status) {
      params.status = filters.status
    }
    if (filters?.page) {
      params.page = filters.page.toString()
    }
    if (filters?.limit) {
      params.limit = filters.limit.toString()
    }

    return client.get<DisputesListResponse>('/api/disputes', {
      params: Object.keys(params).length > 0 ? params : undefined,
    })
  }

  /**
   * Get single dispute details
   */
  async getDispute(token: string, id: string): Promise<DisputeDetailResponse> {
    const client = createAuthenticatedClient(token)
    return client.get<DisputeDetailResponse>(`/api/disputes/${id}`)
  }

  /**
   * Resolve dispute (approve or reject)
   */
  async resolveDispute(
    token: string,
    id: string,
    request: ResolveDisputeRequest
  ): Promise<ResolveDisputeResponse> {
    const client = createAuthenticatedClient(token)
    return client.put<ResolveDisputeResponse>(`/api/disputes/${id}`, request)
  }
}

// Export singleton instance
export const disputesService = new DisputesService()
