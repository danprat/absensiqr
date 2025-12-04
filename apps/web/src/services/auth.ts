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
  message: string
  tokens: {
    accessToken: string
    refreshToken: string
    expiresIn: number
  }
  user: User
  school: School
}

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'teacher' | 'school_admin' | 'super_admin'
  schoolId: string
  createdAt: string
}

export interface School {
  id: string
  name: string
  subdomain: string
  status: string
  logoUrl?: string | null
  primaryColor?: string
  timezone?: string
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
  return apiClient.post<AuthResponse>('/api/auth/login', credentials)
}

/**
 * Register a new school and admin user
 */
export const register = async (data: RegisterData): Promise<AuthResponse> => {
  return apiClient.post<AuthResponse>('/api/auth/register', data)
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
  return apiClient.post<{ message: string }>('/api/auth/forgot-password', { email })
}

/**
 * Reset password with token
 */
export const resetPassword = async (
  token: string,
  password: string
): Promise<{ message: string }> => {
  return apiClient.post<{ message: string }>('/api/auth/reset-password', {
    token,
    password,
  })
}

/**
 * Get current authenticated user
 */
export const getMe = async (token: string): Promise<MeResponse> => {
  const authClient = createAuthenticatedClient(token)
  return authClient.get<MeResponse>('/api/auth/me')
}

/**
 * Refresh access token
 */
export const refreshToken = async (currentToken: string): Promise<{ accessToken: string }> => {
  const storedRefreshToken = localStorage.getItem('refresh_token')
  if (!storedRefreshToken) {
    throw new Error('No refresh token available')
  }
  const authClient = createAuthenticatedClient(currentToken)
  const response = await authClient.post<{ message: string; tokens: { accessToken: string; expiresIn: number } }>('/api/auth/refresh', { 
    refreshToken: storedRefreshToken 
  })
  return { accessToken: response.tokens.accessToken }
}

/**
 * Save auth data to localStorage
 */
export const saveAuthData = (data: AuthResponse): void => {
  localStorage.setItem('auth_token', data.tokens.accessToken)
  localStorage.setItem('refresh_token', data.tokens.refreshToken)
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
