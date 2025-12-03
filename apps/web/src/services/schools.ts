/**
 * Schools Service
 * 
 * API service for school settings management operations
 */

import { createAuthenticatedClient } from './api'
import { getAuthToken } from './auth'

/**
 * Types
 */
export interface SchoolSettings {
  id: string
  name: string
  subdomain: string
  address: string
  phone: string
  logoUrl?: string | null
  primaryColor: string
  startTime: string
  endTime: string
  timezone: 'WIB' | 'WITA' | 'WIT'
  maxStudents: number
  createdAt: string
  updatedAt: string
}

export interface UpdateSchoolSettingsData {
  name?: string
  address?: string
  phone?: string
  primaryColor?: string
  startTime?: string
  endTime?: string
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
 * Get school settings
 */
export const getSchoolSettings = async (): Promise<SchoolSettingsResponse> => {
  const authClient = getAuthClient()
  return authClient.get<SchoolSettingsResponse>('/schools/settings')
}

/**
 * Update school settings
 */
export const updateSchoolSettings = async (
  data: UpdateSchoolSettingsData
): Promise<SchoolSettingsResponse> => {
  const authClient = getAuthClient()
  return authClient.put<SchoolSettingsResponse>('/schools/settings', data)
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
  const url = `${baseUrl}/schools/logo`

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
