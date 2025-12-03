/**
 * JWT Utilities Test Suite
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateToken,
  verifyToken,
  generateRefreshToken,
  type TokenPayload,
} from '../jwt';

describe('JWT Utilities', () => {
  const mockSecret = 'test-secret-key-for-jwt-signing';
  const mockPayload = {
    userId: 'user-123',
    schoolId: 'school-456',
    role: 'teacher',
    email: 'teacher@school.com',
  };

  describe('generateToken', () => {
    it('should generate a valid JWT token', async () => {
      const token = await generateToken(mockPayload, mockSecret);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    it('should generate token with default expiration (7d)', async () => {
      const token = await generateToken(mockPayload, mockSecret);
      const verification = await verifyToken(token, mockSecret);

      expect(verification.valid).toBe(true);
      expect(verification.payload).toBeDefined();
      expect(verification.payload?.userId).toBe(mockPayload.userId);
      expect(verification.payload?.exp).toBeDefined();
    });

    it('should generate token with custom expiration', async () => {
      const token = await generateToken(mockPayload, mockSecret, '1h');
      const verification = await verifyToken(token, mockSecret);

      expect(verification.valid).toBe(true);
      expect(verification.payload?.exp).toBeDefined();

      // Should expire in approximately 1 hour
      const exp = verification.payload!.exp!;
      const now = Math.floor(Date.now() / 1000);
      const diff = exp - now;

      expect(diff).toBeGreaterThan(3500); // ~58 minutes
      expect(diff).toBeLessThan(3700); // ~62 minutes
    });

    it('should handle different time units', async () => {
      // Days
      const token1d = await generateToken(mockPayload, mockSecret, '1d');
      const verify1d = await verifyToken(token1d, mockSecret);
      expect(verify1d.valid).toBe(true);

      // Hours
      const token24h = await generateToken(mockPayload, mockSecret, '24h');
      const verify24h = await verifyToken(token24h, mockSecret);
      expect(verify24h.valid).toBe(true);

      // Minutes
      const token60m = await generateToken(mockPayload, mockSecret, '60m');
      const verify60m = await verifyToken(token60m, mockSecret);
      expect(verify60m.valid).toBe(true);

      // Seconds
      const token3600s = await generateToken(mockPayload, mockSecret, '3600s');
      const verify3600s = await verifyToken(token3600s, mockSecret);
      expect(verify3600s.valid).toBe(true);
    });

    it('should include all payload fields in token', async () => {
      const token = await generateToken(mockPayload, mockSecret);
      const verification = await verifyToken(token, mockSecret);

      expect(verification.payload?.userId).toBe(mockPayload.userId);
      expect(verification.payload?.schoolId).toBe(mockPayload.schoolId);
      expect(verification.payload?.role).toBe(mockPayload.role);
      expect(verification.payload?.email).toBe(mockPayload.email);
    });

    it('should generate different tokens for same payload', async () => {
      // Due to different timestamps (iat)
      const token1 = await generateToken(mockPayload, mockSecret);
      await new Promise((resolve) => setTimeout(resolve, 1100)); // 1.1 second delay to ensure different iat
      const token2 = await generateToken(mockPayload, mockSecret);

      expect(token1).not.toBe(token2);

      // Both should be valid
      const verify1 = await verifyToken(token1, mockSecret);
      const verify2 = await verifyToken(token2, mockSecret);
      expect(verify1.valid).toBe(true);
      expect(verify2.valid).toBe(true);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      const token = await generateToken(mockPayload, mockSecret);
      const result = await verifyToken(token, mockSecret);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should reject token with wrong secret', async () => {
      const token = await generateToken(mockPayload, mockSecret);
      const result = await verifyToken(token, 'wrong-secret');

      expect(result.valid).toBe(false);
      expect(result.payload).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it('should reject malformed token', async () => {
      const result = await verifyToken('not.a.valid.jwt', mockSecret);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject empty token', async () => {
      const result = await verifyToken('', mockSecret);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject expired token', async () => {
      // Generate token that expires in 1 second
      const token = await generateToken(mockPayload, mockSecret, '1s');

      // Wait for token to expire
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const result = await verifyToken(token, mockSecret);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('exp');
    });

    it('should handle token without standard claims', async () => {
      const token = await generateToken(mockPayload, mockSecret);
      const result = await verifyToken(token, mockSecret);

      expect(result.valid).toBe(true);
      expect(result.payload?.iat).toBeDefined(); // Issued at
      expect(result.payload?.exp).toBeDefined(); // Expiration
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a refresh token', async () => {
      const token = await generateRefreshToken('user-123', mockSecret);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include userId and type in refresh token', async () => {
      const token = await generateRefreshToken('user-123', mockSecret);
      const result = await verifyToken(token, mockSecret);

      expect(result.valid).toBe(true);
      expect(result.payload?.userId).toBe('user-123');
      expect((result.payload as any)?.type).toBe('refresh');
    });

    it('should have 30-day expiration', async () => {
      const token = await generateRefreshToken('user-123', mockSecret);
      const result = await verifyToken(token, mockSecret);

      expect(result.valid).toBe(true);
      expect(result.payload?.exp).toBeDefined();

      // Should expire in approximately 30 days
      const exp = result.payload!.exp!;
      const now = Math.floor(Date.now() / 1000);
      const diff = exp - now;

      const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
      expect(diff).toBeGreaterThan(thirtyDaysInSeconds - 100);
      expect(diff).toBeLessThanOrEqual(thirtyDaysInSeconds);
    });

    it('should generate different refresh tokens for same user', async () => {
      const token1 = await generateRefreshToken('user-123', mockSecret);
      await new Promise((resolve) => setTimeout(resolve, 1100)); // 1.1 second delay to ensure different iat
      const token2 = await generateRefreshToken('user-123', mockSecret);

      expect(token1).not.toBe(token2);

      // Both should be valid
      const verify1 = await verifyToken(token1, mockSecret);
      const verify2 = await verifyToken(token2, mockSecret);
      expect(verify1.valid).toBe(true);
      expect(verify2.valid).toBe(true);
    });
  });

  describe('Token Security', () => {
    it('should not be able to forge token without secret', async () => {
      const token = await generateToken(mockPayload, mockSecret);

      // Try to verify with different secret
      const result1 = await verifyToken(token, 'attacker-secret');
      expect(result1.valid).toBe(false);

      const result2 = await verifyToken(token, '');
      expect(result2.valid).toBe(false);
    });

    it('should handle tokens from different secrets', async () => {
      const secret1 = 'secret-one';
      const secret2 = 'secret-two';

      const token1 = await generateToken(mockPayload, secret1);
      const token2 = await generateToken(mockPayload, secret2);

      // Each token should only verify with its own secret
      expect((await verifyToken(token1, secret1)).valid).toBe(true);
      expect((await verifyToken(token1, secret2)).valid).toBe(false);

      expect((await verifyToken(token2, secret2)).valid).toBe(true);
      expect((await verifyToken(token2, secret1)).valid).toBe(false);
    });

    it('should not decode tampered tokens', async () => {
      const token = await generateToken(mockPayload, mockSecret);

      // Tamper with token by changing a character
      const tamperedToken = token.slice(0, -5) + 'XXXXX';

      const result = await verifyToken(tamperedToken, mockSecret);
      expect(result.valid).toBe(false);
    });
  });
});
