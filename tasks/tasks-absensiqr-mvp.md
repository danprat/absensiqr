# AbsensiQR MVP - Task List

**PRD Source:** PRD_AbsensiQR_Complete.md  
**Stack:** Cloudflare Workers + NeonDB + React PWA (Vite + TailwindCSS + shadcn/ui)  
**Sprint Duration:** 2 weeks  
**Generated:** December 3, 2025  
**Last Updated:** December 3, 2025

---

## Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Backend | Cloudflare Workers + Hono |
| Database | NeonDB PostgreSQL + Drizzle ORM |
| Frontend | React 18 + Vite + TypeScript |
| UI Components | shadcn/ui + TailwindCSS |
| State Management | Jotai |
| Offline Storage | Dexie.js (IndexedDB) |
| Email Service | Resend |
| File Storage | Cloudflare R2 |
| Queue | Cloudflare Queues |

---

## Relevant Files

### Backend (apps/api)
- `apps/api/src/index.ts` - Hono app entry point
- `apps/api/src/routes/auth.ts` - Authentication endpoints
- `apps/api/src/routes/schools.ts` - School management endpoints
- `apps/api/src/routes/students.ts` - Student CRUD + bulk import
- `apps/api/src/routes/teachers.ts` - Teacher management endpoints
- `apps/api/src/routes/attendance.ts` - Scan, sync, history endpoints
- `apps/api/src/routes/export.ts` - Report export endpoints
- `apps/api/src/routes/audit.ts` - Audit log endpoints
- `apps/api/src/routes/super-admin.ts` - Super admin endpoints
- `apps/api/src/middleware/auth.ts` - JWT validation middleware
- `apps/api/src/middleware/tenant.ts` - Multi-tenant isolation middleware
- `apps/api/src/middleware/rbac.ts` - Role-based access control
- `apps/api/src/db/schema.ts` - Drizzle ORM schema definitions
- `apps/api/src/db/index.ts` - Database connection
- `apps/api/src/db/seed.ts` - Database seeding script
- `apps/api/src/lib/qr.ts` - QR code generation and validation
- `apps/api/src/lib/password.ts` - Password hashing utilities
- `apps/api/src/lib/jwt.ts` - JWT token utilities
- `apps/api/src/lib/email.ts` - Resend email service
- `apps/api/src/lib/timezone.ts` - Timezone utilities (WIB/WITA/WIT)
- `apps/api/src/lib/audit.ts` - Audit logging service
- `apps/api/src/emails/*.tsx` - Email templates (React Email)
- `apps/api/wrangler.toml` - Cloudflare Workers config
- `apps/api/src/__tests__/*.test.ts` - API unit tests

### Frontend (apps/web)
- `apps/web/src/main.tsx` - React entry point
- `apps/web/src/App.tsx` - Root component with routing
- `apps/web/src/routes/AuthRoutes.tsx` - Public auth routes
- `apps/web/src/routes/TeacherRoutes.tsx` - Teacher protected routes
- `apps/web/src/routes/AdminRoutes.tsx` - Admin protected routes
- `apps/web/src/routes/StudentRoutes.tsx` - Student protected routes
- `apps/web/src/routes/SuperAdminRoutes.tsx` - Super admin routes
- `apps/web/src/pages/auth/Login.tsx` - Login page
- `apps/web/src/pages/auth/Register.tsx` - School registration page
- `apps/web/src/pages/auth/ForgotPassword.tsx` - Forgot password page
- `apps/web/src/pages/auth/ResetPassword.tsx` - Reset password page
- `apps/web/src/pages/teacher/Scanner.tsx` - QR scanner page
- `apps/web/src/pages/teacher/Classes.tsx` - Class list page
- `apps/web/src/pages/teacher/History.tsx` - Attendance history page
- `apps/web/src/pages/teacher/ManualAttendance.tsx` - Manual entry page
- `apps/web/src/pages/teacher/Disputes.tsx` - Dispute review page
- `apps/web/src/pages/admin/Dashboard.tsx` - Admin dashboard
- `apps/web/src/pages/admin/Students.tsx` - Student management
- `apps/web/src/pages/admin/Teachers.tsx` - Teacher management
- `apps/web/src/pages/admin/Settings.tsx` - School settings
- `apps/web/src/pages/admin/AuditLog.tsx` - Audit log viewer
- `apps/web/src/pages/student/MyAttendance.tsx` - Student attendance view
- `apps/web/src/pages/super-admin/Dashboard.tsx` - Super admin dashboard
- `apps/web/src/pages/super-admin/Schools.tsx` - School management
- `apps/web/src/pages/super-admin/Approvals.tsx` - Pending approvals
- `apps/web/src/pages/super-admin/PlatformStats.tsx` - Platform statistics
- `apps/web/src/components/ui/*.tsx` - shadcn/ui components
- `apps/web/src/components/QRScanner/QRScanner.tsx` - html5-qrcode wrapper
- `apps/web/src/components/QRScanner/ScanResult.tsx` - Scan feedback
- `apps/web/src/components/OfflineSync/OfflineIndicator.tsx` - Offline status
- `apps/web/src/components/OfflineSync/SyncManager.tsx` - Sync logic component
- `apps/web/src/components/Forms/BulkUpload.tsx` - CSV upload component
- `apps/web/src/components/Forms/ManualAttendance.tsx` - Manual entry form
- `apps/web/src/components/Charts/AttendanceChart.tsx` - Recharts components
- `apps/web/src/hooks/useAuth.ts` - Authentication hook
- `apps/web/src/hooks/useOfflineSync.ts` - Offline sync hook
- `apps/web/src/hooks/useQRScanner.ts` - QR scanner hook
- `apps/web/src/services/api.ts` - API client (fetch wrapper)
- `apps/web/src/services/auth.ts` - Auth service
- `apps/web/src/services/students.ts` - Student API calls
- `apps/web/src/services/attendance.ts` - Attendance API calls
- `apps/web/src/lib/db.ts` - IndexedDB wrapper (Dexie.js)
- `apps/web/src/lib/qr.ts` - QR code validation (client-side)
- `apps/web/src/utils/validation.ts` - Form validation (Zod)
- `apps/web/src/utils/date.ts` - Date formatting (date-fns)
- `apps/web/src/utils/timezone.ts` - Timezone display utilities
- `apps/web/vite.config.ts` - Vite configuration
- `apps/web/tailwind.config.js` - TailwindCSS config
- `apps/web/components.json` - shadcn/ui config
- `apps/web/public/manifest.json` - PWA manifest
- `apps/web/src/sw.ts` - Service Worker
- `apps/web/src/__tests__/*.test.tsx` - Frontend tests

### Root Config
- `package.json` - Root package.json (workspaces)
- `turbo.json` - Turborepo config (optional)
- `.github/workflows/deploy.yml` - CI/CD pipeline

### Notes

- Unit tests should be placed alongside the code files they test
- Use `npm run test` or `npx vitest` to run tests
- Backend uses Hono framework on Cloudflare Workers
- Frontend uses React 18 + Vite + TailwindCSS + shadcn/ui as PWA
- Database: NeonDB PostgreSQL with Drizzle ORM
- Email: Resend for transactional emails
- Timezone: Manual selection (WIB/WITA/WIT) during school registration

---

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, check it off by changing `- [ ]` to `- [x]`. Update after completing each sub-task.

---

## Tasks

### Phase 1: Project Setup & Infrastructure

- [ ] 0.0 **Create feature branch and initialize monorepo**
  - [ ] 0.1 Initialize git repository (`git init`)
  - [ ] 0.2 Create monorepo structure with `apps/api` and `apps/web` directories
  - [ ] 0.3 Create root `package.json` with npm workspaces configuration
  - [ ] 0.4 Add `.gitignore` for Node.js, environment files, and build outputs
  - [ ] 0.5 Add `.env.example` files for both api and web apps
  - [ ] 0.6 Create initial commit and feature branch (`git checkout -b feature/mvp-initial`)

- [ ] 1.0 **Setup Backend Infrastructure (Cloudflare Workers + NeonDB)**
  - [ ] 1.1 Initialize `apps/api` with `npm init` and TypeScript config
  - [ ] 1.2 Install Hono framework (`npm install hono`)
  - [ ] 1.3 Install Cloudflare Workers dependencies (`npm install -D wrangler @cloudflare/workers-types`)
  - [ ] 1.4 Create `wrangler.toml` with Workers configuration
  - [ ] 1.5 Install Drizzle ORM (`npm install drizzle-orm @neondatabase/serverless`)
  - [ ] 1.6 Install Drizzle Kit for migrations (`npm install -D drizzle-kit`)
  - [ ] 1.7 Create NeonDB project and obtain connection string
  - [ ] 1.8 Create database schema file `src/db/schema.ts` with tables:
    - [ ] 1.8.1 `schools` table (id, name, subdomain, logo_url, primary_color, status, school_hours, max_students, timezone, created_at)
    - [ ] 1.8.2 `users` table (id, school_id, email, password_hash, name, role, is_active, created_at)
    - [ ] 1.8.3 `students` table (id, school_id, student_number, name, class, email, phone, photo_url, qr_code, pin_hash, is_active, created_at)
    - [ ] 1.8.4 `teacher_classes` table (id, teacher_id, class_name, school_id)
    - [ ] 1.8.5 `attendance` table (id, school_id, student_id, teacher_id, date, status, scan_time, notes, device_info, synced_from_offline, created_at)
    - [ ] 1.8.6 `attendance_disputes` table (id, attendance_id, student_id, reason, status, teacher_notes, created_at, resolved_at)
    - [ ] 1.8.7 `audit_logs` table (id, school_id, user_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent, created_at)
    - [ ] 1.8.8 `export_jobs` table (id, school_id, user_id, format, filters, status, file_url, created_at, completed_at)
    - [ ] 1.8.9 `password_reset_tokens` table (id, user_id, token, expires_at, used_at, created_at)
  - [ ] 1.9 Create database indexes for performance:
    - [ ] 1.9.1 `idx_attendance_date` on attendance(school_id, date)
    - [ ] 1.9.2 `idx_attendance_student` on attendance(student_id, date)
    - [ ] 1.9.3 `idx_students_class` on students(school_id, class)
    - [ ] 1.9.4 `idx_students_qr` on students(qr_code)
    - [ ] 1.9.5 `idx_audit_logs_school_date` on audit_logs(school_id, created_at)
    - [ ] 1.9.6 `idx_audit_logs_entity` on audit_logs(entity_type, entity_id)
  - [ ] 1.10 Run initial migration to NeonDB (`npx drizzle-kit push`)
  - [ ] 1.11 Create `src/db/index.ts` with database connection using `@neondatabase/serverless`
  - [ ] 1.12 Setup Cloudflare R2 bucket `absensiqr-assets` for file storage
  - [ ] 1.13 Create basic Hono app entry point `src/index.ts` with health check endpoint
  - [ ] 1.14 Test local development with `wrangler dev`
  - [ ] 1.15 Write unit tests for database connection

- [ ] 2.0 **Setup Frontend Infrastructure (React PWA + shadcn/ui)**
  - [ ] 2.1 Create Vite React TypeScript project in `apps/web` (`npm create vite@latest`)
  - [ ] 2.2 Install TailwindCSS and configure (`npm install -D tailwindcss postcss autoprefixer`)
  - [ ] 2.3 Create `tailwind.config.js` with custom theme colors
  - [ ] 2.4 Install and configure shadcn/ui:
    - [ ] 2.4.1 Run `npx shadcn-ui@latest init`
    - [ ] 2.4.2 Add core components: Button, Input, Card, Dialog, Table, Form, Select, Toast
    - [ ] 2.4.3 Add additional components: Tabs, Dropdown, Calendar, Badge, Alert
  - [ ] 2.5 Install React Router (`npm install react-router-dom`)
  - [ ] 2.6 Install state management (`npm install jotai`)
  - [ ] 2.7 Install form validation (`npm install zod react-hook-form @hookform/resolvers`)
  - [ ] 2.8 Install date utilities (`npm install date-fns date-fns-tz`)
  - [ ] 2.9 Install IndexedDB wrapper (`npm install dexie`)
  - [ ] 2.10 Install QR scanner (`npm install html5-qrcode`)
  - [ ] 2.11 Install chart library (`npm install recharts`)
  - [ ] 2.12 Create PWA manifest `public/manifest.json` with app name, icons, theme color
  - [ ] 2.13 Create basic app icons (192x192, 512x512) in `public/icons/`
  - [ ] 2.14 Install PWA plugin (`npm install -D vite-plugin-pwa`)
  - [ ] 2.15 Configure Vite for PWA in `vite.config.ts`
  - [ ] 2.16 Create IndexedDB schema in `src/lib/db.ts` with Dexie:
    - [ ] 2.16.1 `cached_students` store
    - [ ] 2.16.2 `pending_scans` store
    - [ ] 2.16.3 `cached_attendance` store
  - [ ] 2.17 Create base layout component with responsive navigation
  - [ ] 2.18 Create route structure in `src/App.tsx`
  - [ ] 2.19 Create API client `src/services/api.ts` with fetch wrapper and basic error handling
  - [ ] 2.20 Test frontend runs with `npm run dev`
  - [ ] 2.21 Write unit tests for IndexedDB schema

- [ ] 2.5 **Setup Email Service (Resend)**
  - [ ] 2.5.1 Create Resend account and obtain API key
  - [ ] 2.5.2 Install Resend SDK (`npm install resend` in api)
  - [ ] 2.5.3 Install React Email for templates (`npm install @react-email/components`)
  - [ ] 2.5.4 Create email service `src/lib/email.ts`
  - [ ] 2.5.5 Create email templates:
    - [ ] 2.5.5.1 `PasswordResetEmail.tsx`
    - [ ] 2.5.5.2 `SchoolRegistrationEmail.tsx`
    - [ ] 2.5.5.3 `SchoolApprovedEmail.tsx`
    - [ ] 2.5.5.4 `ExportReadyEmail.tsx`
  - [ ] 2.5.6 Add RESEND_API_KEY to environment variables
  - [ ] 2.5.7 Write unit tests for email service

---

### Phase 2: Authentication & Multi-Tenant System

- [ ] 3.0 **Implement Authentication System**
  - [ ] 3.1 Install auth dependencies (`npm install bcryptjs jsonwebtoken` in api)
  - [ ] 3.2 Create password utilities `src/lib/password.ts`
  - [ ] 3.3 Create JWT utilities `src/lib/jwt.ts`
  - [ ] 3.4 Create auth middleware `src/middleware/auth.ts`
  - [ ] 3.5 Create role-based access middleware `src/middleware/rbac.ts`
  - [ ] 3.6 Create auth routes `src/routes/auth.ts`:
    - [ ] 3.6.1 `POST /api/auth/register`
    - [ ] 3.6.2 `POST /api/auth/login`
    - [ ] 3.6.3 `POST /api/auth/refresh`
    - [ ] 3.6.4 `POST /api/auth/logout`
    - [ ] 3.6.5 `POST /api/auth/forgot-password` (send email via Resend)
    - [ ] 3.6.6 `POST /api/auth/reset-password`
    - [ ] 3.6.7 `GET /api/auth/me`
  - [ ] 3.7 Implement rate limiting for login
  - [ ] 3.8 Create frontend auth service
  - [ ] 3.9 Create `useAuth` hook
  - [ ] 3.10 Create Login page
  - [ ] 3.11 Create ForgotPassword page
  - [ ] 3.12 Create ResetPassword page
  - [ ] 3.13 Create protected route wrapper
  - [ ] 3.14 Store JWT securely
  - [ ] 3.15 Write unit tests for auth utilities
  - [ ] 3.16 Write integration tests for auth endpoints

- [ ] 4.0 **Implement Multi-Tenant School Management**
  - [ ] 4.1 Create tenant middleware `src/middleware/tenant.ts`
  - [ ] 4.2 Create timezone utilities `src/lib/timezone.ts` (WIB/WITA/WIT)
  - [ ] 4.3 Create school routes `src/routes/schools.ts`
  - [ ] 4.4 Create subdomain validation utility
  - [ ] 4.5 Create school settings schema validation (Zod)
  - [ ] 4.6 Implement school hours configuration
  - [ ] 4.7 Create logo upload endpoint with R2 storage
  - [ ] 4.8 Create School Registration page (with timezone selection)
  - [ ] 4.9 Create School Settings page
  - [ ] 4.10 Write unit tests for tenant isolation
  - [ ] 4.11 Write unit tests for timezone utilities
  - [ ] 4.12 Write integration tests for school endpoints

- [ ] 4.5 **Implement Super Admin Dashboard**
  - [ ] 4.5.1 Create super admin routes `src/routes/super-admin.ts`:
    - [ ] 4.5.1.1 `GET /api/super-admin/stats`
    - [ ] 4.5.1.2 `GET /api/super-admin/schools/pending`
    - [ ] 4.5.1.3 `GET /api/super-admin/schools/:id/details`
    - [ ] 4.5.1.4 `GET /api/super-admin/activity`
  - [ ] 4.5.2 Create SuperAdminRoutes
  - [ ] 4.5.3 Create Super Admin Dashboard page
  - [ ] 4.5.4 Create Schools List page
  - [ ] 4.5.5 Create Pending Approvals page
  - [ ] 4.5.6 Create Platform Stats page
  - [ ] 4.5.7 Create super admin navigation layout
  - [ ] 4.5.8 Write integration tests for super admin endpoints

---

### Phase 3: Core Features - Student & Teacher Management

- [ ] 5.0 **Implement Student Management**
  - [ ] 5.1 Create QR code utilities `src/lib/qr.ts`
  - [ ] 5.2 Create student routes `src/routes/students.ts`
  - [ ] 5.3 Create bulk import endpoint
  - [ ] 5.4 Create bulk import status endpoint
  - [ ] 5.5 Create QR codes PDF export endpoint
  - [ ] 5.6 Create photo upload endpoint (with server-side resize)
  - [ ] 5.7 Create CSV template download endpoint
  - [ ] 5.8 Create Students page (shadcn/ui Table, Dialog, Form)
  - [ ] 5.9 Create BulkUpload component
  - [ ] 5.10 Create QR PDF download button component
  - [ ] 5.11 Write unit tests for QR code utilities
  - [ ] 5.12 Write integration tests for student endpoints
  - [ ] 5.13 Write integration tests for bulk import

- [ ] 6.0 **Implement Teacher Management**
  - [ ] 6.1 Create teacher routes `src/routes/teachers.ts`
  - [ ] 6.2 Create class list endpoint
  - [ ] 6.3 Create Teachers page
  - [ ] 6.4 Create teacher dashboard
  - [ ] 6.5 Write integration tests for teacher endpoints

---

### Phase 4: Core Features - Attendance System

- [ ] 7.0 **Implement QR Scanner (Online + Offline)**
  - [ ] 7.1 Create attendance scan endpoint (with timezone-aware school hours check)
  - [ ] 7.2 Create attendance sync endpoint
  - [ ] 7.3 Create QRScanner component
  - [ ] 7.4 Create ScanResult component
  - [ ] 7.5 Create useQRScanner hook
  - [ ] 7.6 Create useOfflineSync hook (with exponential backoff retry)
  - [ ] 7.7 Create OfflineIndicator component
  - [ ] 7.8 Create Scanner page
  - [ ] 7.9 Implement student data caching for offline
  - [ ] 7.10 Create client-side QR validation
  - [ ] 7.11 Write unit tests for scan validation logic
  - [ ] 7.12 Write integration tests for scan endpoints
  - [ ] 7.13 Write integration tests for sync endpoint

- [ ] 8.0 **Implement Manual Attendance Entry**
  - [ ] 8.1 Create manual attendance endpoint
  - [ ] 8.2 Create class roster endpoint
  - [ ] 8.3 Create ManualAttendance component
  - [ ] 8.4 Create ManualAttendance page
  - [ ] 8.5 Implement offline manual attendance
  - [ ] 8.6 Write integration tests for manual attendance

- [ ] 9.0 **Implement Attendance History & Dashboard**
  - [ ] 9.1 Create attendance history endpoint
  - [ ] 9.2 Create attendance summary endpoint
  - [ ] 9.3 Create attendance stats endpoint
  - [ ] 9.4 Create History page
  - [ ] 9.5 Create Admin Dashboard
  - [ ] 9.6 Create AttendanceChart component
  - [ ] 9.7 Implement attendance history caching
  - [ ] 9.8 Write integration tests for history and summary endpoints

- [ ] 9.5 **Implement Audit Log System**
  - [ ] 9.5.1 Create audit log service `src/lib/audit.ts`
  - [ ] 9.5.2 Create audit log routes `src/routes/audit.ts`:
    - [ ] 9.5.2.1 `GET /api/audit-logs`
    - [ ] 9.5.2.2 `GET /api/audit-logs/:id`
    - [ ] 9.5.2.3 `GET /api/audit-logs/export`
  - [ ] 9.5.3 Create AuditLog page with filters and export
  - [ ] 9.5.4 Integrate audit logging into all CRUD operations
  - [ ] 9.5.5 Write integration tests for audit log endpoints

---

### Phase 5: Reports & Student Self-Service

- [ ] 10.0 **Implement Report Export System**
  - [ ] 10.1 Create export request endpoint
  - [ ] 10.2 Create export status endpoint
  - [ ] 10.3 Setup Cloudflare Queue `export-jobs`
  - [ ] 10.4 Implement CSV export generator (with email notification)
  - [ ] 10.5 Implement XLSX export generator (with email notification)
  - [ ] 10.6 Implement PDF export generator (with email notification)
  - [ ] 10.7 Create ExportModal component
  - [ ] 10.8 Write integration tests for export system

- [ ] 11.0 **Implement Student Self-Service Portal**
  - [ ] 11.1 Create student auth endpoint
  - [ ] 11.2 Create student PIN setup endpoint
  - [ ] 11.3 Create student attendance endpoint
  - [ ] 11.4 Create dispute endpoints
  - [ ] 11.5 Create Student Login page
  - [ ] 11.6 Create MyAttendance page
  - [ ] 11.7 Create DisputeModal component
  - [ ] 11.8 Create teacher Disputes page
  - [ ] 11.9 Write integration tests for student portal
  - [ ] 11.10 Write integration tests for dispute workflow

---

### Phase 6: PWA & Offline Features

- [ ] 12.0 **Complete PWA Implementation**
  - [ ] 12.1 Configure vite-plugin-pwa for full offline support
  - [ ] 12.2 Create Service Worker
  - [ ] 12.3 Implement caching strategies
  - [ ] 12.4 Create SyncManager component
  - [ ] 12.5 Implement install prompt
  - [ ] 12.6 Create app splash screen
  - [ ] 12.7 Test offline scenarios
  - [ ] 12.8 Implement push notifications (optional)
  - [ ] 12.9 Test PWA on mobile devices
  - [ ] 12.10 Validate PWA with Lighthouse audit (target >90)

---

### Phase 7: Testing, Seeding & Deployment

- [ ] 13.0 **Database Seeding & Demo Account**
  - [ ] 13.1 Create seeding script `src/db/seed.ts`:
    - [ ] 13.1.1 Create demo school with all settings
    - [ ] 13.1.2 Create demo admin account (demo@absensiqr.app / Demo123!)
    - [ ] 13.1.3 Create 5 demo teachers with class assignments
    - [ ] 13.1.4 Create 100 demo students across 4 classes
    - [ ] 13.1.5 Generate realistic attendance data for last 30 days
    - [ ] 13.1.6 Create sample disputes
    - [ ] 13.1.7 Create sample audit logs
  - [ ] 13.2 Create seed CLI command (`npm run seed`)
  - [ ] 13.3 Create reset demo data script (`npm run seed:reset`)
  - [ ] 13.4 Document demo account credentials in README
  - [ ] 13.5 Add seeding to staging deployment workflow

- [ ] 14.0 **Testing & Quality Assurance**
  - [ ] 14.1 Setup testing infrastructure (Vitest, testing-library)
  - [ ] 14.2 Write API unit tests (target >80% coverage)
  - [ ] 14.3 Write API integration tests
  - [ ] 14.4 Write frontend unit tests
  - [ ] 14.5 Write E2E tests with Playwright
  - [ ] 14.6 Load testing (k6)
  - [ ] 14.7 Manual testing checklist
  - [ ] 14.8 Security testing
  - [ ] 14.9 Fix all failing tests

- [ ] 15.0 **Deployment & CI/CD**
  - [ ] 15.1 Create GitHub repository
  - [ ] 15.2 Setup Cloudflare account and API token
  - [ ] 15.3 Setup Resend account and configure domain
  - [ ] 15.4 Create staging environment (with seeded data)
  - [ ] 15.5 Create GitHub Actions workflow
  - [ ] 15.6 Create staging workflow
  - [ ] 15.7 Setup environment secrets in GitHub (incl. RESEND_API_KEY)
  - [ ] 15.8 Configure custom domain
  - [ ] 15.9 Setup monitoring
  - [ ] 15.10 Create backup strategy
  - [ ] 15.11 Production deployment
  - [ ] 15.12 Create rollback procedure documentation
  - [ ] 15.13 Create super admin account for production
  - [ ] 15.14 Setup demo school in production with seeded data

---

## Summary

| Phase | Tasks | Focus Area |
|-------|-------|------------|
| 1 | 0.0 - 2.5 | Project Setup & Infrastructure (incl. Email) |
| 2 | 3.0 - 4.5 | Authentication, Multi-Tenant & Super Admin |
| 3 | 5.0 - 6.0 | Student & Teacher Management |
| 4 | 7.0 - 9.5 | Attendance System & Audit Logs |
| 5 | 10.0 - 11.0 | Reports & Student Portal |
| 6 | 12.0 | PWA & Offline |
| 7 | 13.0 - 15.0 | Seeding, Testing & Deployment |

**Total:** 17 parent tasks, ~280 sub-tasks

---

## Quick Reference - Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | User login |
| POST | /api/auth/register | School registration |
| POST | /api/auth/forgot-password | Request password reset |
| POST | /api/auth/reset-password | Reset password with token |
| GET | /api/students | List students |
| POST | /api/students/bulk-import | CSV import |
| GET | /api/students/qr-pdf | Download QR codes PDF |
| POST | /api/attendance/scan | QR scan attendance |
| POST | /api/attendance/sync | Sync offline scans |
| POST | /api/attendance/manual | Manual attendance entry |
| GET | /api/attendance/history | Attendance history |
| POST | /api/attendance/export | Request export |
| GET | /api/audit-logs | View audit logs |
| POST | /api/auth/student-login | Student login |
| POST | /api/attendance/:id/dispute | Submit dispute |
| GET | /api/super-admin/stats | Platform statistics |
| GET | /api/super-admin/schools/pending | Pending approvals |

---

## Key Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Email Service | Resend | Simple API, good deliverability, React Email support |
| Timezone Handling | Manual selection at registration | More reliable than IP geolocation, simpler |
| Error Handling | Basic (try-catch, simple messages) | MVP scope |
| UI Components | shadcn/ui | Balance of speed and customization |
| Super Admin UI | Full dashboard | Critical for operations |
| Audit Log | Full viewer with export | Compliance requirement |
| Demo/Seeding | Full setup | Essential for sales demos |
| Responsive | Implicit (final QA) | shadcn/ui handles most cases |
| Image Optimization | Basic (server-side resize) | 2MB limit sufficient |

---

**Generated by:** task-generator skill  
**Last Updated:** December 3, 2025
