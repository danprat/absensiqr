/**
 * AbsensiQR API - Cloudflare Workers Entry Point
 * Multi-tenant school attendance system backend
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { sql } from 'drizzle-orm';
import { createDb, type Env } from './db';
import authRoutes from './routes/auth';

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
    origin: (origin, c) => {
      const allowedOrigins = c.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
      if (allowedOrigins.includes(origin)) {
        return origin;
      }
      return allowedOrigins[0] || 'http://localhost:5173';
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
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
    const db = createDb(c.env);
    
    // Actually test connection with simple query
    await db.execute(sql`SELECT 1 as health_check`);
    
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
      auth: '/api/auth',
    },
  });
});

/**
 * ROUTES
 */
app.route('/api/auth', authRoutes);

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
