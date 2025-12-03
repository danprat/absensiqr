/**
 * Students Service
 * 
 * API service for student management operations
 */

import { createAuthenticatedClient } from './api'
import { getAuthToken } from './auth'

/**
 * Types
 */
export interface Student {
  id: string
  studentNumber: string
  name: string
  class: string
  email?: string | null
  phone?: string | null
  photoUrl?: string | null
  qrCode: string
  isActive: boolean
  createdAt: string
}

export interface CreateStudentData {
  studentNumber: string
  name: string
  class: string
  email?: string
  phone?: string
  photoUrl?: string
  pin: string
}

export interface UpdateStudentData {
  studentNumber?: string
  name?: string
  class?: string
  email?: string | null
  phone?: string | null
  photoUrl?: string | null
  pin?: string
}

export interface ListStudentsFilters {
  class?: string
  search?: string
  isActive?: boolean
  page?: number
  limit?: number
}

export interface PaginationMeta {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface ListStudentsResponse {
  students: Student[]
  pagination: PaginationMeta
}

export interface StudentResponse {
  student: Student
  message?: string
}

export interface BulkImportStudent {
  studentNumber: string
  name: string
  class: string
  email?: string
  phone?: string
}

export interface BulkImportRequest {
  preview?: boolean
  students: BulkImportStudent[]
}

export interface BulkImportValidationResult {
  row: number
  studentNumber: string
  name: string
  class: string
  email?: string
  phone?: string
  valid: boolean
  errors: string[]
}

export interface BulkImportPreviewResponse {
  preview: true
  totalRows: number
  validRows: number
  invalidRows: number
  results: BulkImportValidationResult[]
}

export interface BulkImportSuccessResponse {
  message: string
  totalImported: number
  students: Student[]
  note: string
}

export type BulkImportResponse = BulkImportPreviewResponse | BulkImportSuccessResponse

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
 * Get list of students with filters
 */
export const getStudents = async (
  filters?: ListStudentsFilters
): Promise<ListStudentsResponse> => {
  const authClient = getAuthClient()
  const params: Record<string, string> = {}
  
  if (filters?.class) params.class = filters.class
  if (filters?.search) params.search = filters.search
  if (filters?.isActive !== undefined) params.isActive = String(filters.isActive)
  if (filters?.page) params.page = String(filters.page)
  if (filters?.limit) params.limit = String(filters.limit)
  
  return authClient.get<ListStudentsResponse>('/students', { params })
}

/**
 * Get single student by ID
 */
export const getStudent = async (id: string): Promise<StudentResponse> => {
  const authClient = getAuthClient()
  return authClient.get<StudentResponse>(`/students/${id}`)
}

/**
 * Create a new student
 */
export const createStudent = async (
  data: CreateStudentData
): Promise<StudentResponse> => {
  const authClient = getAuthClient()
  return authClient.post<StudentResponse>('/students', data)
}

/**
 * Update student information
 */
export const updateStudent = async (
  id: string,
  data: UpdateStudentData
): Promise<StudentResponse> => {
  const authClient = getAuthClient()
  return authClient.patch<StudentResponse>(`/students/${id}`, data)
}

/**
 * Delete (deactivate) student
 */
export const deleteStudent = async (id: string): Promise<{ message: string }> => {
  const authClient = getAuthClient()
  return authClient.delete<{ message: string }>(`/students/${id}`)
}

/**
 * Reactivate a deactivated student
 */
export const reactivateStudent = async (
  id: string
): Promise<StudentResponse> => {
  const authClient = getAuthClient()
  return authClient.patch<StudentResponse>(`/students/${id}/reactivate`)
}

/**
 * Bulk import students from CSV data
 * @param students Array of student data
 * @param preview If true, only validates without importing
 */
export const bulkImport = async (
  students: BulkImportStudent[],
  preview = false
): Promise<BulkImportResponse> => {
  const authClient = getAuthClient()
  return authClient.post<BulkImportResponse>('/students/bulk-import', {
    preview,
    students,
  })
}

/**
 * Download CSV template for bulk import
 */
export const getCSVTemplate = async (): Promise<{
  headers: string[]
  example: BulkImportStudent[]
  notes: string[]
}> => {
  const authClient = getAuthClient()
  return authClient.get('/students/csv-template')
}

/**
 * Download QR codes as PDF
 * This returns a blob URL for download
 */
export const downloadQRPdf = async (
  filters?: Pick<ListStudentsFilters, 'class' | 'search'>
): Promise<string> => {
  const token = getAuthToken()
  if (!token) {
    throw new Error('Not authenticated')
  }
  
  const params = new URLSearchParams()
  if (filters?.class) params.set('class', filters.class)
  if (filters?.search) params.set('search', filters.search)
  
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787'
  const url = `${baseUrl}/export/qr-pdf?${params.toString()}`
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  
  if (!response.ok) {
    throw new Error('Failed to download QR PDF')
  }
  
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

/**
 * Parse CSV file to array of students
 */
export const parseCSVFile = (file: File): Promise<BulkImportStudent[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const lines = text.split('\n').filter((line) => line.trim())
        
        if (lines.length < 2) {
          reject(new Error('CSV file is empty or has no data rows'))
          return
        }
        
        // Parse header
        const headers = lines[0]!.split(',').map((h) => h.trim())
        const requiredHeaders = ['studentNumber', 'name', 'class']
        
        const missingHeaders = requiredHeaders.filter(
          (h) => !headers.includes(h)
        )
        
        if (missingHeaders.length > 0) {
          reject(
            new Error(`Missing required headers: ${missingHeaders.join(', ')}`)
          )
          return
        }
        
        // Parse data rows
        const students: BulkImportStudent[] = []
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i]!.split(',').map((v) => v.trim())
          const row: Record<string, string> = {}
          
          headers.forEach((header, index) => {
            const value = values[index]
            if (value) {
              row[header] = value
            }
          })
          
          if (row.studentNumber && row.name && row.class) {
            students.push({
              studentNumber: row.studentNumber,
              name: row.name,
              class: row.class,
              email: row.email || undefined,
              phone: row.phone || undefined,
            })
          }
        }
        
        if (students.length === 0) {
          reject(new Error('No valid student records found in CSV'))
          return
        }
        
        resolve(students)
      } catch (error) {
        reject(
          new Error(
            `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        )
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsText(file)
  })
}
