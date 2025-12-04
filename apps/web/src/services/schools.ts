/**
 * Schools Service
 * 
 * API service for school settings management operations
 */

import { createAuthenticatedClient } from './api'
import { getAuthToken, getSavedSchool } from './auth'

/**
 * Types
 */
export interface SchoolHours {
  monday?: { start: string; end: string }
  tuesday?: { start: string; end: string }
  wednesday?: { start: string; end: string }
  thursday?: { start: string; end: string }
  friday?: { start: string; end: string }
  saturday?: { start: string; end: string }
  sunday?: { start: string; end: string }
}

export interface SchoolSettings {
  id: string
  name: string
  subdomain: string
  logoUrl?: string | null
  primaryColor: string
  status: 'pending' | 'active' | 'suspended'
  schoolHours: SchoolHours
  maxStudents: number
  timezone: 'WIB' | 'WITA' | 'WIT'
  createdAt: string
}

export interface UpdateSchoolSettingsData {
  name?: string
  logoUrl?: string
  primaryColor?: string
  schoolHours?: SchoolHours
  maxStudents?: number
  timezone?: 'WIB' | 'WITA' | 'WIT'
}

export interface SchoolSettingsResponse {
  school: SchoolSettings
  message?: string
}

export interface UploadLogoResponse {
  logoUrl: string
  message: string
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
 * Get school ID from saved context
 */
const getSchoolId = (): string => {
  const school = getSavedSchool()
  if (!school?.id) {
    throw new Error('School context not found')
  }
  return school.id
}

/**
 * Get school settings
 */
export const getSchoolSettings = async (): Promise<SchoolSettingsResponse> => {
  const authClient = getAuthClient()
  const schoolId = getSchoolId()
  return authClient.get<SchoolSettingsResponse>(`/api/schools/${schoolId}`)
}

/**
 * Update school settings
 */
export const updateSchoolSettings = async (
  data: UpdateSchoolSettingsData
): Promise<SchoolSettingsResponse> => {
  const authClient = getAuthClient()
  const schoolId = getSchoolId()
  return authClient.patch<SchoolSettingsResponse>(`/api/schools/${schoolId}`, data)
}

/**
 * Upload school logo
 * Returns the new logo URL
 */
export const uploadLogo = async (file: File): Promise<UploadLogoResponse> => {
  const token = getAuthToken()
  if (!token) {
    throw new Error('Not authenticated')
  }

  const formData = new FormData()
  formData.append('logo', file)

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787'
  const schoolId = getSchoolId()
  const url = `${baseUrl}/api/schools/${schoolId}/logo`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to upload logo')
  }

  return response.json()
}

/**
 * Validate logo file before upload
 */
export const validateLogoFile = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 2 * 1024 * 1024 // 2MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Only JPEG, PNG, and WebP images are allowed',
    }
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size must be less than 2MB',
    }
  }

  return { valid: true }
}
