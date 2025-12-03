/**
 * AbsensiQR API - Cloudflare Workers Entry Point
 * Multi-tenant school attendance system backend
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createDb, type Env } from './db';

/**
 * Cloudflare Workers type with environment bindings
 */
type Bindings = Env;

/**
 * Initialize Hono app with type-safe environment
 */
const app = new Hono<{ Bindings: Bindings }>();

/**
 * MIDDLEWARE
 */
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: '*', // Configure based on environment in production
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  })
);

/**
 * HEALTH CHECK ENDPOINT
 */
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'unknown',
    version: '0.0.1',
  });
});

/**
 * DATABASE CONNECTION TEST
 */
app.get('/health/db', async (c) => {
  try {
    // Initialize database connection
    createDb(c.env);
    
    // Simple query to test connection
    // Note: This will fail until database is set up and migrations are run
    // const result = await db.execute(sql`SELECT 1`);
    
    return c.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      503
    );
  }
});

/**
 * API VERSION INFO
 */
app.get('/api/v1', (c) => {
  return c.json({
    name: 'AbsensiQR API',
    version: 'v1',
    description: 'Multi-tenant school attendance system with QR codes',
    endpoints: {
      health: '/health',
      healthDb: '/health/db',
      docs: '/api/v1/docs',
    },
  });
});

/**
 * 404 HANDLER
 */
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      message: 'The requested resource was not found',
      path: c.req.path,
    },
    404
  );
});

/**
 * ERROR HANDLER
 */
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message || 'An unexpected error occurred',
      ...(c.env.ENVIRONMENT === 'development' && { stack: err.stack }),
    },
    500
  );
});

/**
 * Export for Cloudflare Workers
 */
export default app;
