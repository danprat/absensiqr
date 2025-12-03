/**
 * Student Portal Service
 * 
 * API service for student self-service portal operations
 * Handles student authentication, attendance viewing, and dispute submission
 */

import { apiClient, createAuthenticatedClient } from './api'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Student login credentials
 */
export interface StudentLoginCredentials {
  studentNumber: string
  pin: string
}

/**
 * Student PIN setup request
 */
export interface StudentPinSetup {
  newPin: string
  confirmPin: string
}

/**
 * Student authentication response
 */
export interface StudentAuthResponse {
  message: string
  student: StudentInfo
  token: string
  expiresIn: number
}

/**
 * Student information
 */
export interface StudentInfo {
  id: string
  studentNumber: string
  name: string
  class: string
  email: string | null
  photoUrl: string | null
}

/**
 * Attendance record for student view
 */
export interface StudentAttendanceRecord {
  id: string
  date: string
  status: 'hadir' | 'alpha' | 'izin' | 'sakit'
  scanTime: string | null
  notes: string | null
  syncedFromOffline: boolean
  createdAt: string
}

/**
 * Attendance history filters
 */
export interface AttendanceFilters {
  startDate?: string
  endDate?: string
  status?: 'hadir' | 'alpha' | 'izin' | 'sakit'
  limit?: number
  offset?: number
}

/**
 * Attendance history response
 */
export interface AttendanceHistoryResponse {
  attendance: StudentAttendanceRecord[]
  pagination: {
    limit: number
    offset: number
    totalCount: number
    hasMore: boolean
  }
}

/**
 * Dispute submission request
 */
export interface DisputeSubmission {
  attendanceId: string
  reason: string
}

/**
 * Dispute record
 */
export interface DisputeRecord {
  id: string
  attendanceId: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  teacherNotes: string | null
  createdAt: string
  resolvedAt: string | null
  // Related attendance info
  attendanceDate: string | null
  attendanceStatus: 'hadir' | 'alpha' | 'izin' | 'sakit' | null
}

/**
 * Student disputes response
 */
export interface StudentDisputesResponse {
  disputes: DisputeRecord[]
  summary: {
    total: number
    pending: number
    approved: number
    rejected: number
  }
}

/**
 * Dispute creation response
 */
export interface DisputeCreationResponse {
  message: string
  dispute: {
    id: string
    attendanceId: string
    reason: string
    status: 'pending' | 'approved' | 'rejected'
    createdAt: string
  }
}

/**
 * PIN setup response
 */
export interface PinSetupResponse {
  message: string
  student: {
    id: string
    studentNumber: string
    name: string
  }
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Student login with student number and PIN
 * 
 * @param credentials - Student number and PIN
 * @returns Authentication response with token and student info
 */
export const studentLogin = async (
  credentials: StudentLoginCredentials
): Promise<StudentAuthResponse> => {
  return apiClient.post<StudentAuthResponse>('/student/login', credentials)
}

/**
 * Setup or change student PIN
 * Requires authentication
 * 
 * @param pinData - New PIN and confirmation
 * @param token - Student authentication token
 * @returns Success response
 */
export const setupPin = async (
  pinData: StudentPinSetup,
  token: string
): Promise<PinSetupResponse> => {
  const authClient = createAuthenticatedClient(token)
  return authClient.post<PinSetupResponse>('/student/setup-pin', pinData)
}

/**
 * Get student's own attendance history
 * Requires authentication
 * 
 * @param filters - Optional filters for date range, status, pagination
 * @param token - Student authentication token
 * @returns Attendance records with pagination
 */
export const getMyAttendance = async (
  filters: AttendanceFilters,
  token: string
): Promise<AttendanceHistoryResponse> => {
  const authClient = createAuthenticatedClient(token)
  
  // Build query params
  const params: Record<string, string> = {}
  if (filters.startDate) params.startDate = filters.startDate
  if (filters.endDate) params.endDate = filters.endDate
  if (filters.status) params.status = filters.status
  if (filters.limit !== undefined) params.limit = filters.limit.toString()
  if (filters.offset !== undefined) params.offset = filters.offset.toString()
  
  return authClient.get<AttendanceHistoryResponse>('/student/attendance', { params })
}

/**
 * Submit an attendance dispute
 * Requires authentication
 * 
 * @param dispute - Attendance ID and reason for dispute
 * @param token - Student authentication token
 * @returns Created dispute information
 */
export const submitDispute = async (
  dispute: DisputeSubmission,
  token: string
): Promise<DisputeCreationResponse> => {
  const authClient = createAuthenticatedClient(token)
  return authClient.post<DisputeCreationResponse>('/student/disputes', dispute)
}

/**
 * Get student's own disputes
 * Requires authentication
 * 
 * @param token - Student authentication token
 * @returns List of disputes with summary
 */
export const getMyDisputes = async (
  token: string
): Promise<StudentDisputesResponse> => {
  const authClient = createAuthenticatedClient(token)
  return authClient.get<StudentDisputesResponse>('/student/disputes')
}

// ============================================================================
// LOCAL STORAGE HELPERS
// ============================================================================

/**
 * Save student auth data to localStorage
 */
export const saveStudentAuthData = (data: StudentAuthResponse): void => {
  localStorage.setItem('student_token', data.token)
  localStorage.setItem('student_info', JSON.stringify(data.student))
}

/**
 * Get saved student token
 */
export const getStudentToken = (): string | null => {
  return localStorage.getItem('student_token')
}

/**
 * Get saved student info
 */
export const getSavedStudentInfo = (): StudentInfo | null => {
  const studentData = localStorage.getItem('student_info')
  if (!studentData) return null
  
  try {
    return JSON.parse(studentData) as StudentInfo
  } catch {
    return null
  }
}

/**
 * Clear student auth data (logout)
 */
export const clearStudentAuthData = (): void => {
  localStorage.removeItem('student_token')
  localStorage.removeItem('student_info')
}

/**
 * Check if student is authenticated
 */
export const isStudentAuthenticated = (): boolean => {
  return !!getStudentToken()
}
