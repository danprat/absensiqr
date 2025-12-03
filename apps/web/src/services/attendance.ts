/**
 * Attendance Service
 * API calls for attendance management and QR scanning
 */

import { createAuthenticatedClient } from './api'

/**
 * Type Definitions
 */

export type AttendanceStatus = 'hadir' | 'alpha' | 'izin' | 'sakit'

export interface ScanAttendanceRequest {
  qrCode: string
  status?: AttendanceStatus
  notes?: string
  timestamp?: string
  deviceInfo?: Record<string, unknown>
}

export interface ScanAttendanceResponse {
  success: boolean
  attendanceId?: string
  student: {
    id: string
    name: string
    class: string
    studentNumber: string
    photoUrl?: string | null
  }
  status: AttendanceStatus
  scanTime: string
  warnings?: string[]
}

export interface OfflineScanItem {
  qrCode: string
  status: AttendanceStatus
  notes?: string
  timestamp: string
  deviceInfo?: Record<string, unknown>
}

export interface SyncOfflineScansRequest {
  scans: OfflineScanItem[]
}

export interface ConflictDetail {
  qrCode: string
  reason: string
  existingRecord?: {
    status: string
    scanTime: string
  }
}

export interface SyncOfflineScansResponse {
  synced: number
  failed: number
  conflicts: ConflictDetail[]
}

export interface AttendanceHistoryFilters {
  startDate?: string
  endDate?: string
  class?: string
  studentId?: string
  status?: AttendanceStatus
  page?: number
  limit?: number
}

export interface AttendanceHistoryRecord {
  id: string
  date: string
  status: AttendanceStatus
  scanTime: string
  notes?: string | null
  syncedFromOffline: boolean
  student: {
    id: string
    name: string
    class: string
    studentNumber: string
    photoUrl?: string | null
  }
}

export interface AttendanceHistoryResponse {
  data: AttendanceHistoryRecord[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface AttendanceStatsResponse {
  today: {
    date: string
    totalStudents: number
    scanned: number
    notScanned: number
    hadir: number
    alpha: number
    izin: number
    sakit: number
    attendanceRate: number
  }
  weeklyTrend: Array<{
    date: string
    hadir: number
    alpha: number
    izin: number
    sakit: number
  }>
  recentScans: Array<{
    id: string
    status: AttendanceStatus
    scanTime: string
    student: {
      name: string
      class: string
    }
  }>
}

export interface ClassRosterStudent {
  id: string
  studentNumber: string
  name: string
  class: string
  photoUrl?: string | null
  qrCode?: string | null
  attendance: {
    id: string
    status: AttendanceStatus
    scanTime: string
    notes?: string | null
  } | null
}

export interface ClassRosterResponse {
  class: string
  date: string
  summary: {
    total: number
    scanned: number
    hadir: number
    alpha: number
    izin: number
    sakit: number
    notScanned: number
  }
  roster: ClassRosterStudent[]
}

export interface ManualAttendanceRequest {
  studentId: string
  status: AttendanceStatus
  date: string
  notes?: string
}

export interface ManualAttendanceResponse {
  success: boolean
  attendanceId: string
  student: {
    id: string
    name: string
    class: string
    studentNumber: string
  }
  status: AttendanceStatus
  date: string
}

/**
 * Attendance Service Class
 */
class AttendanceService {
  /**
   * Scan QR code and record attendance
   */
  async scanAttendance(
    token: string,
    request: ScanAttendanceRequest
  ): Promise<ScanAttendanceResponse> {
    const client = createAuthenticatedClient(token)
    return client.post<ScanAttendanceResponse>('/api/attendance/scan', request)
  }

  /**
   * Sync offline scans in batch
   */
  async syncOfflineScans(
    token: string,
    scans: OfflineScanItem[]
  ): Promise<SyncOfflineScansResponse> {
    const client = createAuthenticatedClient(token)
    return client.post<SyncOfflineScansResponse>('/api/attendance/sync', { scans })
  }

  /**
   * Get attendance history with filters
   */
  async getAttendanceHistory(
    token: string,
    filters?: AttendanceHistoryFilters
  ): Promise<AttendanceHistoryResponse> {
    const client = createAuthenticatedClient(token)
    const params = filters
      ? Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined)
        )
      : undefined

    return client.get<AttendanceHistoryResponse>('/api/attendance/history', {
      params: params as Record<string, string | number | boolean>,
    })
  }

  /**
   * Get attendance statistics for dashboard
   */
  async getAttendanceStats(token: string): Promise<AttendanceStatsResponse> {
    const client = createAuthenticatedClient(token)
    return client.get<AttendanceStatsResponse>('/api/attendance/stats')
  }

  /**
   * Get class roster with attendance status
   */
  async getClassRoster(
    token: string,
    className: string,
    date?: string
  ): Promise<ClassRosterResponse> {
    const client = createAuthenticatedClient(token)
    const params = date ? { date } : undefined
    return client.get<ClassRosterResponse>(
      `/api/attendance/class-roster/${encodeURIComponent(className)}`,
      { params: params as Record<string, string | number | boolean> }
    )
  }

  /**
   * Submit manual attendance entry (without QR scan)
   */
  async submitManualAttendance(
    token: string,
    request: ManualAttendanceRequest
  ): Promise<ManualAttendanceResponse> {
    const client = createAuthenticatedClient(token)
    return client.post<ManualAttendanceResponse>('/api/attendance/manual', request)
  }
}

// Export singleton instance
export const attendanceService = new AttendanceService()
