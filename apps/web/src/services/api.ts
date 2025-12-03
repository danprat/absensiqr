/**
 * API Client for AbsensiQR
 * 
 * A type-safe fetch wrapper for communicating with the backend API
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

export interface ApiError {
  message: string
  status: number
  errors?: Record<string, string[]>
}

export class ApiClientError extends Error {
  status: number
  errors?: Record<string, string[]>

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.errors = errors
  }
}

interface RequestOptions extends RequestInit {
  token?: string
  params?: Record<string, string | number | boolean>
}

/**
 * Main API client class
 */
class ApiClient {
  private baseUrl: string
  private defaultHeaders: HeadersInit

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    }
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
    const url = new URL(endpoint, this.baseUrl)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value))
      })
    }
    return url.toString()
  }

  /**
   * Build headers with authentication token
   */
  private buildHeaders(token?: string, customHeaders?: HeadersInit): HeadersInit {
    const headers: HeadersInit = {
      ...this.defaultHeaders,
      ...customHeaders,
    }

    if (token) {
      // @ts-expect-error - Headers type doesn't include Authorization by default
      headers['Authorization'] = `Bearer ${token}`
    }

    return headers
  }

  /**
   * Generic request method
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { token, params, headers: customHeaders, ...fetchOptions } = options

    const url = this.buildUrl(endpoint, params)
    const headers = this.buildHeaders(token, customHeaders)

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      })

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('application/json')) {
        if (!response.ok) {
          throw new ApiClientError(
            `Request failed: ${response.statusText}`,
            response.status
          )
        }
        return (await response.text()) as unknown as T
      }

      const data = await response.json()

      if (!response.ok) {
        throw new ApiClientError(
          data.message || 'An error occurred',
          response.status,
          data.errors
        )
      }

      return data as T
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error
      }

      // Network or other errors
      throw new ApiClientError(
        error instanceof Error ? error.message : 'Network error',
        0
      )
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    })
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    })
  }
}

// Export singleton instance
export const apiClient = new ApiClient()

// Export helper to create authenticated requests
export const createAuthenticatedClient = (token: string) => {
  return {
    get: <T>(endpoint: string, options?: Omit<RequestOptions, 'token'>) =>
      apiClient.get<T>(endpoint, { ...options, token }),
    post: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'token'>) =>
      apiClient.post<T>(endpoint, body, { ...options, token }),
    put: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'token'>) =>
      apiClient.put<T>(endpoint, body, { ...options, token }),
    patch: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'token'>) =>
      apiClient.patch<T>(endpoint, body, { ...options, token }),
    delete: <T>(endpoint: string, options?: Omit<RequestOptions, 'token'>) =>
      apiClient.delete<T>(endpoint, { ...options, token }),
  }
}
