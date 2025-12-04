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
        setToken(response.tokens.accessToken)
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
  const refreshAuthToken = useCallback(async (): Promise<void> => {
    if (!token) return

    try {
      const response = await refreshTokenApi(token)
      setToken(response.accessToken)
      localStorage.setItem('auth_token', response.accessToken)
    } catch (error) {
      // If refresh fails with 401, logout
      if (error instanceof ApiClientError && error.status === 401) {
        await logout()
      }
      // Silently ignore other errors (like missing refresh token)
    }
  }, [token, setToken, logout])

  /**
   * Initialize auth state on mount - run only once
   */
  useEffect(() => {
    let isMounted = true
    
    const initAuth = async () => {
      const savedToken = getAuthToken()
      const savedUser = getSavedUser()
      const savedSchool = getSavedSchool()
      
      if (savedToken && isMounted) {
        setToken(savedToken)
        // If we have saved user data, use it directly without API call
        if (savedUser && savedSchool) {
          setUser(savedUser)
          setSchool(savedSchool)
        }
        // Don't call refreshUser on mount - data is already in localStorage
      }
    }

    initAuth()
    
    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Auto-refresh token (only set up interval, don't refresh immediately)
   */
  useEffect(() => {
    if (!isAuthenticated || !token) return

    // Set up interval for periodic refresh (every 45 minutes)
    const intervalId = setInterval(() => {
      refreshAuthToken()
    }, TOKEN_REFRESH_INTERVAL)

    return () => clearInterval(intervalId)
    // Only depend on isAuthenticated, not refreshAuthToken to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

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
