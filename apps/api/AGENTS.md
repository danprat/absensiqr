# AbsensiQR API - Cloudflare Workers Backend

## Package Identity

Hono-based REST API running on Cloudflare Workers edge network.  
**ORM:** Drizzle with NeonDB PostgreSQL  
**Auth:** JWT-based with role-based access control

## Setup & Run

```bash
# From apps/api directory
npm install

# Development
npm run dev              # wrangler dev
npm run dev:remote       # wrangler dev --remote

# Database
npm run db:generate      # Generate Drizzle migrations
npm run db:migrate       # Run migrations
npm run db:push          # Push schema to NeonDB

# Build & Deploy
npm run deploy           # wrangler deploy

# Testing
npm run test             # vitest
npm run test:watch       # vitest --watch
```

## Patterns & Conventions

### Route Structure
```
src/routes/
├── auth.ts         # POST /auth/login, /auth/register
├── schools.ts      # CRUD /schools
├── students.ts     # CRUD /students, POST /students/bulk
├── teachers.ts     # CRUD /teachers
├── attendance.ts   # POST /attendance/scan, GET /attendance/history
└── export.ts       # GET /export/pdf, /export/csv
```

### Middleware Pattern
```typescript
// Always use tenant isolation middleware
app.use('/api/*', tenantMiddleware);
app.use('/api/*', authMiddleware);

// Route-specific auth
app.use('/api/admin/*', requireRole('school_admin'));
```

### Database Queries
```typescript
// ALWAYS filter by school_id for multi-tenant isolation
const students = await db
  .select()
  .from(studentsTable)
  .where(eq(studentsTable.schoolId, ctx.get('schoolId')));
```

### Error Handling
```typescript
// Use HTTPException from Hono
import { HTTPException } from 'hono/http-exception';

throw new HTTPException(404, { message: 'Student not found' });
```

## Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Hono app entry, route mounting |
| `src/db/schema.ts` | Drizzle schema definitions |
| `src/db/index.ts` | NeonDB connection |
| `src/middleware/auth.ts` | JWT validation |
| `src/middleware/tenant.ts` | Multi-tenant isolation |
| `src/lib/jwt.ts` | Token generation/validation |
| `src/lib/qr.ts` | QR code utilities |
| `wrangler.toml` | Cloudflare Workers config |

## JIT Index

```bash
# Find route handlers
rg -n "app\.(get|post|put|delete|patch)" src/routes

# Find middleware
rg -n "createMiddleware|app\.use" src

# Find Drizzle queries
rg -n "\.(select|insert|update|delete)\(\)" src

# Find error throws
rg -n "HTTPException" src
```

## Common Gotchas

- **Always** add `school_id` filter for tenant isolation
- Use `ctx.env.DATABASE_URL` for NeonDB connection (not process.env)
- Cloudflare Workers have 10ms CPU limit - optimize heavy operations
- Use Cloudflare Queues for async tasks (PDF export)

## Pre-PR Checks

```bash
cd apps/api && npm run typecheck && npm run lint && npm run test
```
