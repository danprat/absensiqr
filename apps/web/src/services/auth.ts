/**
 * Auth Service
 * 
 * API service for authentication operations
 */

import { apiClient, createAuthenticatedClient } from './api'

// Types
export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  schoolName: string
  schoolAddress: string
  schoolPhone: string
  adminName: string
  adminEmail: string
  adminPassword: string
}

export interface AuthResponse {
  token: string
  user: User
  school: School
}

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'teacher'
  schoolId: string
  createdAt: string
}

export interface School {
  id: string
  name: string
  address: string
  phone: string
  createdAt: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  password: string
}

export interface MeResponse {
  user: User
  school: School
}

/**
 * Login with email and password
 */
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  return apiClient.post<AuthResponse>('/auth/login', credentials)
}

/**
 * Register a new school and admin user
 */
export const register = async (data: RegisterData): Promise<AuthResponse> => {
  return apiClient.post<AuthResponse>('/auth/register', data)
}

/**
 * Logout (client-side token removal)
 */
export const logout = async (): Promise<void> => {
  // Remove token from localStorage
  localStorage.removeItem('auth_token')
  localStorage.removeItem('auth_user')
  localStorage.removeItem('auth_school')
}

/**
 * Request password reset
 */
export const forgotPassword = async (email: string): Promise<{ message: string }> => {
  return apiClient.post<{ message: string }>('/auth/forgot-password', { email })
}

/**
 * Reset password with token
 */
export const resetPassword = async (
  token: string,
  password: string
): Promise<{ message: string }> => {
  return apiClient.post<{ message: string }>('/auth/reset-password', {
    token,
    password,
  })
}

/**
 * Get current authenticated user
 */
export const getMe = async (token: string): Promise<MeResponse> => {
  const authClient = createAuthenticatedClient(token)
  return authClient.get<MeResponse>('/auth/me')
}

/**
 * Refresh access token
 */
export const refreshToken = async (token: string): Promise<{ token: string }> => {
  const authClient = createAuthenticatedClient(token)
  return authClient.post<{ token: string }>('/auth/refresh')
}

/**
 * Save auth data to localStorage
 */
export const saveAuthData = (data: AuthResponse): void => {
  localStorage.setItem('auth_token', data.token)
  localStorage.setItem('auth_user', JSON.stringify(data.user))
  localStorage.setItem('auth_school', JSON.stringify(data.school))
}

/**
 * Get saved auth token
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token')
}

/**
 * Get saved user data
 */
export const getSavedUser = (): User | null => {
  const userData = localStorage.getItem('auth_user')
  if (!userData) return null
  
  try {
    return JSON.parse(userData) as User
  } catch {
    return null
  }
}

/**
 * Get saved school data
 */
export const getSavedSchool = (): School | null => {
  const schoolData = localStorage.getItem('auth_school')
  if (!schoolData) return null
  
  try {
    return JSON.parse(schoolData) as School
  } catch {
    return null
  }
}
