/**
 * Database Connection - NeonDB with Drizzle ORM
 * Configured for Cloudflare Workers runtime
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

/**
 * Environment interface for type safety
 */
export interface Env {
  DATABASE_URL: string;
  JWT_SECRET: string;
  ENVIRONMENT: string;
  ALLOWED_ORIGINS?: string;
  FRONTEND_URL?: string;
  RESEND_API_KEY: string;
}

/**
 * Create database connection
 * @param env - Cloudflare Workers environment bindings
 * @returns Drizzle database instance
 */
export function createDb(env: Env) {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  // Create Neon HTTP client
  const sql = neon(env.DATABASE_URL);

  // Initialize Drizzle with schema
  return drizzle(sql, { schema });
}

/**
 * Type-safe database instance
 */
export type Database = ReturnType<typeof createDb>;

/**
 * Export schema for use in queries
 */
export { schema };
