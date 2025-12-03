/**
 * useAuth Hook
 * 
 * Authentication hook using Jotai for state management
 */

import { atom, useAtom } from 'jotai'
import { useCallback, useEffect } from 'react'
import {
  login as loginApi,
  logout as logoutApi,
  getMe,
  saveAuthData,
  getAuthToken,
  getSavedUser,
  getSavedSchool,
  refreshToken as refreshTokenApi,
  type User,
  type School,
  type LoginCredentials,
} from '../services/auth'
import { ApiClientError } from '../services/api'

// Atoms
export const userAtom = atom<User | null>(getSavedUser())
export const schoolAtom = atom<School | null>(getSavedSchool())
export const tokenAtom = atom<string | null>(getAuthToken())
export const isLoadingAtom = atom<boolean>(false)
export const authErrorAtom = atom<string | null>(null)

// Derived atom for authentication status
export const isAuthenticatedAtom = atom((get) => {
  return get(tokenAtom) !== null && get(userAtom) !== null
})

// Token refresh interval (45 minutes)
const TOKEN_REFRESH_INTERVAL = 45 * 60 * 1000

/**
 * Authentication hook
 */
export const useAuth = () => {
  const [user, setUser] = useAtom(userAtom)
  const [school, setSchool] = useAtom(schoolAtom)
  const [token, setToken] = useAtom(tokenAtom)
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom)
  const [authError, setAuthError] = useAtom(authErrorAtom)
  const [isAuthenticated] = useAtom(isAuthenticatedAtom)

  /**
   * Login function
   */
  const login = useCallback(
    async (credentials: LoginCredentials): Promise<void> => {
      setIsLoading(true)
      setAuthError(null)

      try {
        const response = await loginApi(credentials)
        
        // Save to localStorage and state
        saveAuthData(response)
        setToken(response.token)
        setUser(response.user)
        setSchool(response.school)
      } catch (error) {
        if (error instanceof ApiClientError) {
          setAuthError(error.message)
        } else {
          setAuthError('An unexpected error occurred')
        }
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [setIsLoading, setAuthError, setToken, setUser, setSchool]
  )

  /**
   * Logout function
   */
  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    
    try {
      await logoutApi()
      
      // Clear state
      setToken(null)
      setUser(null)
      setSchool(null)
      setAuthError(null)
    } finally {
      setIsLoading(false)
    }
  }, [setIsLoading, setToken, setUser, setSchool, setAuthError])

  /**
   * Refresh the current user data
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    if (!token) return

    setIsLoading(true)
    setAuthError(null)

    try {
      const data = await getMe(token)
      setUser(data.user)
      setSchool(data.school)
      
      // Update localStorage
      localStorage.setItem('auth_user', JSON.stringify(data.user))
      localStorage.setItem('auth_school', JSON.stringify(data.school))
    } catch (error) {
      if (error instanceof ApiClientError) {
        // If token is invalid, logout
        if (error.status === 401) {
          await logout()
        }
        setAuthError(error.message)
      } else {
        setAuthError('Failed to refresh user data')
      }
    } finally {
      setIsLoading(false)
    }
  }, [token, setIsLoading, setAuthError, setUser, setSchool, logout])

  /**
   * Refresh the auth token
   */
  const refreshToken = useCallback(async (): Promise<void> => {
    if (!token) return

    try {
      const response = await refreshTokenApi(token)
      setToken(response.token)
      localStorage.setItem('auth_token', response.token)
    } catch (error) {
      // If refresh fails, logout
      if (error instanceof ApiClientError && error.status === 401) {
        await logout()
      }
    }
  }, [token, setToken, logout])

  /**
   * Initialize auth state on mount
   */
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = getAuthToken()
      
      if (savedToken) {
        setToken(savedToken)
        await refreshUser()
      }
    }

    initAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Auto-refresh token
   */
  useEffect(() => {
    if (!isAuthenticated) return

    // Refresh immediately
    refreshToken()

    // Set up interval for periodic refresh
    const intervalId = setInterval(() => {
      refreshToken()
    }, TOKEN_REFRESH_INTERVAL)

    return () => clearInterval(intervalId)
  }, [isAuthenticated, refreshToken])

  return {
    user,
    school,
    token,
    isAuthenticated,
    isLoading,
    authError,
    login,
    logout,
    refreshUser,
  }
}
