/**
 * Teachers Service
 * 
 * API service for teacher management operations
 */

import { createAuthenticatedClient } from './api'
import { getAuthToken } from './auth'

/**
 * Types
 */
export interface Teacher {
  id: string
  email: string
  name: string
  isActive: boolean
  createdAt: string
  classes: string[]
}

export interface CreateTeacherData {
  email: string
  name: string
  password: string
  classes?: string[]
}

export interface UpdateTeacherData {
  email?: string
  name?: string
  password?: string
}

export interface ListTeachersFilters {
  isActive?: boolean
  page?: number
  limit?: number
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ListTeachersResponse {
  teachers: Teacher[]
  pagination: PaginationMeta
}

export interface TeacherResponse {
  teacher: Teacher
  message?: string
}

export interface AssignClassesRequest {
  classes: string[]
}

export interface AssignClassesResponse {
  message: string
  teacher: {
    id: string
    name: string
    classes: string[]
  }
  assignedClasses: string[]
}

export interface RemoveClassResponse {
  message: string
  teacher: {
    id: string
    name: string
    classes: string[]
  }
  removedClass: string
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
 * Get list of teachers with filters
 */
export const getTeachers = async (
  filters?: ListTeachersFilters
): Promise<ListTeachersResponse> => {
  const authClient = getAuthClient()
  const params: Record<string, string> = {}
  
  if (filters?.isActive !== undefined) params.isActive = String(filters.isActive)
  if (filters?.page) params.page = String(filters.page)
  if (filters?.limit) params.limit = String(filters.limit)
  
  return authClient.get<ListTeachersResponse>('/teachers', { params })
}

/**
 * Get single teacher by ID
 */
export const getTeacher = async (id: string): Promise<TeacherResponse> => {
  const authClient = getAuthClient()
  return authClient.get<TeacherResponse>(`/teachers/${id}`)
}

/**
 * Create a new teacher
 */
export const createTeacher = async (
  data: CreateTeacherData
): Promise<TeacherResponse> => {
  const authClient = getAuthClient()
  return authClient.post<TeacherResponse>('/teachers', data)
}

/**
 * Update teacher information
 */
export const updateTeacher = async (
  id: string,
  data: UpdateTeacherData
): Promise<TeacherResponse> => {
  const authClient = getAuthClient()
  return authClient.patch<TeacherResponse>(`/teachers/${id}`, data)
}

/**
 * Delete (deactivate) teacher
 */
export const deleteTeacher = async (id: string): Promise<{ message: string; teacherId: string }> => {
  const authClient = getAuthClient()
  return authClient.delete<{ message: string; teacherId: string }>(`/teachers/${id}`)
}

/**
 * Assign classes to a teacher
 */
export const assignClasses = async (
  teacherId: string,
  classes: string[]
): Promise<AssignClassesResponse> => {
  const authClient = getAuthClient()
  return authClient.post<AssignClassesResponse>(`/teachers/${teacherId}/classes`, {
    classes,
  })
}

/**
 * Remove a class assignment from a teacher
 */
export const removeClassAssignment = async (
  teacherId: string,
  className: string
): Promise<RemoveClassResponse> => {
  const authClient = getAuthClient()
  return authClient.delete<RemoveClassResponse>(
    `/teachers/${teacherId}/classes/${encodeURIComponent(className)}`
  )
}

/**
 * Get teacher's assigned classes
 */
export const getTeacherClasses = async (teacherId: string): Promise<string[]> => {
  const authClient = getAuthClient()
  const response = await authClient.get<TeacherResponse>(`/teachers/${teacherId}`)
  return response.teacher.classes
}
