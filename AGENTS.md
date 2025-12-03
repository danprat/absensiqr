# AbsensiQR - Multi-Tenant School Attendance System

## Project Snapshot

Multi-tenant SaaS platform untuk sistem absensi sekolah berbasis QR code.  
**Stack:** Cloudflare Workers (Hono) + NeonDB PostgreSQL + React PWA (Vite + TailwindCSS)  
**Status:** Pre-development (PRD & task list ready)  
**Architecture:** Monorepo dengan `apps/api` (backend) dan `apps/web` (frontend)

## Quick Start Commands

```bash
# Install dependencies (from root)
npm install

# Development
npm run dev              # Run all apps
npm run dev:api          # API only (Cloudflare Workers)
npm run dev:web          # Frontend only (Vite)

# Build & Deploy
npm run build            # Build all
npm run deploy           # Deploy to Cloudflare

# Testing & Quality
npm run test             # Run all tests (Vitest)
npm run typecheck        # TypeScript check
npm run lint             # ESLint
```

## Project Structure

```
AbsesnsiQR/
├── apps/
│   ├── api/             # Cloudflare Workers backend (Hono)
│   │   └── AGENTS.md    # Backend-specific guidance
│   └── web/             # React PWA frontend (Vite)
│       └── AGENTS.md    # Frontend-specific guidance
├── doc/                 # Documentation & PRD
│   ├── PRD_AbsensiQR_Complete.md  # Full PRD
│   └── bahan.md         # Tech stack reference
├── tasks/               # Task tracking
│   └── tasks-absensiqr-mvp.md    # MVP task list
└── AGENTS.md            # This file (root)
```

## Universal Conventions

### Code Style
- TypeScript strict mode
- ESLint + Prettier
- Functional components (React)
- Zod for validation

### Git & PR
- Branch: `feature/<name>`, `fix/<name>`
- Commit: conventional commits (`feat:`, `fix:`, `chore:`)
- PR: require all checks pass

### Naming
- Files: `kebab-case.ts` (utils), `PascalCase.tsx` (components)
- Functions: `camelCase`
- Types/Interfaces: `PascalCase`

## Security & Secrets

- **NEVER** commit `.env` files or API keys
- Use Cloudflare secrets for production
- JWT tokens stored hashed in DB
- Multi-tenant isolation via `school_id` on every query

## Key Documentation

| Doc | Purpose | Path |
|-----|---------|------|
| PRD Complete | Full requirements & specs | `doc/PRD_AbsensiQR_Complete.md` |
| Tech Bahan | Tech stack decisions | `doc/bahan.md` |
| MVP Tasks | Implementation tasks | `tasks/tasks-absensiqr-mvp.md` |

## JIT Index - Quick Find

```bash
# Find API routes
rg -n "app\.(get|post|put|delete)" apps/api/src

# Find React components
rg -n "export (function|const).*:" apps/web/src/components

# Find hooks
rg -n "export.*use[A-Z]" apps/web/src/hooks

# Find Drizzle schema
rg -n "create.*Table" apps/api/src/db

# Find tests
find . -name "*.test.ts" -o -name "*.test.tsx"
```

## Definition of Done

Before PR:
1. `npm run typecheck` passes
2. `npm run lint` passes  
3. `npm run test` passes
4. Manual testing completed
5. No console errors/warnings
