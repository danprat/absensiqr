import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient, createAuthenticatedClient, ApiClientError } from '../api';

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('apiClient', () => {
    it('should make GET request successfully', async () => {
      const mockData = { id: 1, name: 'Test' };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockData),
      });

      const result = await apiClient.get('/test');
      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should make POST request with body', async () => {
      const mockData = { success: true };
      const body = { name: 'Test' };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockData),
      });

      const result = await apiClient.post('/test', body);
      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        })
      );
    });

    it('should throw ApiClientError on error response', async () => {
      const errorResponse = { error: 'Not Found', message: 'Resource not found' };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(errorResponse),
      });

      await expect(apiClient.get('/not-found')).rejects.toThrow(ApiClientError);
    });

    it('should handle network errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

      await expect(apiClient.get('/test')).rejects.toThrow();
    });
  });

  describe('createAuthenticatedClient', () => {
    it('should add Authorization header when token provided', async () => {
      const token = 'test-jwt-token';
      
      const mockData = { user: 'test' };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockData),
      });

      const client = createAuthenticatedClient(token);
      await client.get('/protected');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${token}`,
          }),
        })
      );
    });
  });

  describe('ApiClientError', () => {
    it('should contain status and errors', () => {
      const error = new ApiClientError('Test error', 400, { field: ['invalid'] });
      
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(400);
      expect(error.errors).toEqual({ field: ['invalid'] });
      expect(error.name).toBe('ApiClientError');
    });

    it('should work without errors', () => {
      const error = new ApiClientError('Test error', 500);
      
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(500);
      expect(error.errors).toBeUndefined();
    });
  });
});
