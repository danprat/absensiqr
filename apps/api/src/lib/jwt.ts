/**
 * JWT Utilities
 * Token generation and verification using jose library (Cloudflare Workers compatible)
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

/**
 * JWT Token Payload
 */
export interface TokenPayload extends JWTPayload {
  userId: string;
  schoolId: string;
  role: string;
  email: string;
}

/**
 * Token verification result
 */
export interface VerifyResult {
  valid: boolean;
  payload?: TokenPayload;
  error?: string;
}

/**
 * Generate a JWT token using jose
 * @param payload - Token payload data
 * @param secret - Secret key for signing
 * @param expiresIn - Token expiration time (e.g., '7d', '30d')
 * @returns Signed JWT token string
 */
export async function generateToken(
  payload: Omit<TokenPayload, 'iat' | 'exp'>,
  secret: string,
  expiresIn?: string
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);
  
  // Parse expiresIn string to seconds
  const expirationSeconds = parseExpiration(expiresIn || '7d');
  
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expirationSeconds)
    .sign(secretKey);
  
  return token;
}

/**
 * Verify and decode a JWT token
 * @param token - JWT token string to verify
 * @param secret - Secret key used for signing
 * @returns Verification result with payload or error
 */
export async function verifyToken(
  token: string,
  secret: string
): Promise<VerifyResult> {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey);
    
    return {
      valid: true,
      payload: payload as TokenPayload,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid token';
    
    return {
      valid: false,
      error: errorMessage,
    };
  }
}

/**
 * Generate a refresh token with longer expiration
 * @param userId - User ID to include in token
 * @param secret - Secret key for signing
 * @returns Signed refresh token string
 */
export async function generateRefreshToken(
  userId: string,
  secret: string
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);
  
  // Refresh tokens valid for 30 days
  const expirationSeconds = 30 * 24 * 60 * 60; // 30 days in seconds
  
  const token = await new SignJWT({ userId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expirationSeconds)
    .sign(secretKey);
  
  return token;
}

/**
 * Parse expiration string to seconds
 * Supports: '7d' (days), '24h' (hours), '60m' (minutes), '3600s' (seconds)
 * @param expiresIn - Expiration string
 * @returns Expiration time in seconds
 */
function parseExpiration(expiresIn?: string): number {
  if (!expiresIn) {
    return 7 * 24 * 60 * 60; // Default 7 days
  }
  
  const match = expiresIn.match(/^(\d+)([dhms])$/);
  
  if (!match) {
    throw new Error('Invalid expiration format. Use: 7d, 24h, 60m, or 3600s');
  }
  
  const value = parseInt(match[1]!, 10);
  const unit = match[2]!;
  
  switch (unit) {
    case 'd': // days
      return value * 24 * 60 * 60;
    case 'h': // hours
      return value * 60 * 60;
    case 'm': // minutes
      return value * 60;
    case 's': // seconds
      return value;
    default:
      throw new Error('Invalid time unit. Use: d, h, m, or s');
  }
}
