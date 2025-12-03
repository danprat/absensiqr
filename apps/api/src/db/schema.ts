/**
 * Database Schema - AbsensiQR Multi-tenant School Attendance System
 * Uses Drizzle ORM with PostgreSQL (NeonDB)
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  pgEnum,
  jsonb,
  integer,
  index,
  uniqueIndex,
  date,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * ENUMS
 */
export const roleEnum = pgEnum('role', [
  'super_admin',
  'school_admin',
  'teacher',
  'student',
]);

export const attendanceStatusEnum = pgEnum('attendance_status', [
  'hadir',
  'alpha',
  'izin',
  'sakit',
]);

export const schoolStatusEnum = pgEnum('school_status', [
  'pending',
  'active',
  'suspended',
]);

export const disputeStatusEnum = pgEnum('dispute_status', [
  'pending',
  'approved',
  'rejected',
]);

export const exportStatusEnum = pgEnum('export_status', [
  'queued',
  'processing',
  'completed',
  'failed',
]);

export const timezoneEnum = pgEnum('timezone', ['WIB', 'WITA', 'WIT']);

/**
 * TABLES
 */

/**
 * Schools Table - Multi-tenant root entity
 */
export const schools = pgTable(
  'schools',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar('name', { length: 255 }).notNull(),
    subdomain: varchar('subdomain', { length: 100 }).notNull().unique(),
    logoUrl: text('logo_url'),
    primaryColor: varchar('primary_color', { length: 7 }).default('#3B82F6'),
    status: schoolStatusEnum('status').notNull().default('pending'),
    schoolHours: jsonb('school_hours')
      .notNull()
      .default(
        sql`'{"start": "07:00", "end": "15:00", "scanWindow": 30}'::jsonb`
      ),
    maxStudents: integer('max_students').notNull().default(100),
    timezone: timezoneEnum('timezone').notNull().default('WIB'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    subdomainIdx: uniqueIndex('schools_subdomain_idx').on(table.subdomain),
    statusIdx: index('schools_status_idx').on(table.status),
    createdAtIdx: index('schools_created_at_idx').on(table.createdAt),
  })
);

/**
 * Users Table - School admins and teachers
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    role: roleEnum('role').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    schoolEmailIdx: uniqueIndex('users_school_email_idx').on(
      table.schoolId,
      table.email
    ),
    schoolIdIdx: index('users_school_id_idx').on(table.schoolId),
    roleIdx: index('users_role_idx').on(table.role),
    isActiveIdx: index('users_is_active_idx').on(table.isActive),
  })
);

/**
 * Students Table
 */
export const students = pgTable(
  'students',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    studentNumber: varchar('student_number', { length: 50 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    class: varchar('class', { length: 50 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 20 }),
    photoUrl: text('photo_url'),
    qrCode: varchar('qr_code', { length: 255 }).notNull().unique(),
    pinHash: text('pin_hash').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    qrCodeIdx: uniqueIndex('students_qr_code_idx').on(table.qrCode),
    schoolStudentNumberIdx: uniqueIndex('students_school_student_number_idx').on(
      table.schoolId,
      table.studentNumber
    ),
    schoolIdIdx: index('students_school_id_idx').on(table.schoolId),
    classIdx: index('students_class_idx').on(table.class),
    isActiveIdx: index('students_is_active_idx').on(table.isActive),
    schoolClassIdx: index('students_school_class_idx').on(
      table.schoolId,
      table.class
    ),
  })
);

/**
 * Teacher Classes Table - Many-to-many relationship
 */
export const teacherClasses = pgTable(
  'teacher_classes',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    className: varchar('class_name', { length: 50 }).notNull(),
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    teacherClassIdx: uniqueIndex('teacher_classes_teacher_class_idx').on(
      table.teacherId,
      table.className
    ),
    teacherIdIdx: index('teacher_classes_teacher_id_idx').on(table.teacherId),
    schoolIdIdx: index('teacher_classes_school_id_idx').on(table.schoolId),
    classNameIdx: index('teacher_classes_class_name_idx').on(table.className),
  })
);

/**
 * Attendance Table - Core attendance records
 */
export const attendance = pgTable(
  'attendance',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    status: attendanceStatusEnum('status').notNull().default('hadir'),
    scanTime: timestamp('scan_time', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    notes: text('notes'),
    deviceInfo: jsonb('device_info'),
    syncedFromOffline: boolean('synced_from_offline').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    schoolDateIdx: index('attendance_school_date_idx').on(
      table.schoolId,
      table.date
    ),
    studentDateIdx: uniqueIndex('attendance_student_date_idx').on(
      table.studentId,
      table.date
    ),
    schoolIdIdx: index('attendance_school_id_idx').on(table.schoolId),
    studentIdIdx: index('attendance_student_id_idx').on(table.studentId),
    teacherIdIdx: index('attendance_teacher_id_idx').on(table.teacherId),
    dateIdx: index('attendance_date_idx').on(table.date),
    statusIdx: index('attendance_status_idx').on(table.status),
    scanTimeIdx: index('attendance_scan_time_idx').on(table.scanTime),
  })
);

/**
 * Attendance Disputes Table
 */
export const attendanceDisputes = pgTable(
  'attendance_disputes',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    attendanceId: uuid('attendance_id')
      .notNull()
      .references(() => attendance.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    status: disputeStatusEnum('status').notNull().default('pending'),
    teacherNotes: text('teacher_notes'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (table) => ({
    attendanceIdIdx: index('attendance_disputes_attendance_id_idx').on(
      table.attendanceId
    ),
    studentIdIdx: index('attendance_disputes_student_id_idx').on(
      table.studentId
    ),
    statusIdx: index('attendance_disputes_status_idx').on(table.status),
    createdAtIdx: index('attendance_disputes_created_at_idx').on(
      table.createdAt
    ),
  })
);

/**
 * Audit Logs Table - Track all sensitive actions
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 100 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    oldValue: jsonb('old_value'),
    newValue: jsonb('new_value'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    schoolIdIdx: index('audit_logs_school_id_idx').on(table.schoolId),
    userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
    entityIdx: index('audit_logs_entity_idx').on(
      table.entityType,
      table.entityId
    ),
    actionIdx: index('audit_logs_action_idx').on(table.action),
    createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
  })
);

/**
 * Export Jobs Table - Track attendance export requests
 */
export const exportJobs = pgTable(
  'export_jobs',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    format: varchar('format', { length: 10 }).notNull(), // 'xlsx', 'csv', 'pdf'
    filters: jsonb('filters').notNull(),
    status: exportStatusEnum('status').notNull().default('queued'),
    fileUrl: text('file_url'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => ({
    schoolIdIdx: index('export_jobs_school_id_idx').on(table.schoolId),
    userIdIdx: index('export_jobs_user_id_idx').on(table.userId),
    statusIdx: index('export_jobs_status_idx').on(table.status),
    createdAtIdx: index('export_jobs_created_at_idx').on(table.createdAt),
  })
);

/**
 * Password Reset Tokens Table
 */
export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 255 }).notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    tokenIdx: uniqueIndex('password_reset_tokens_token_idx').on(table.token),
    userIdIdx: index('password_reset_tokens_user_id_idx').on(table.userId),
    expiresAtIdx: index('password_reset_tokens_expires_at_idx').on(
      table.expiresAt
    ),
  })
);

/**
 * Refresh Tokens Table
 */
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 500 }).notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    tokenIdx: uniqueIndex('refresh_tokens_token_idx').on(table.token),
    userIdIdx: index('refresh_tokens_user_id_idx').on(table.userId),
    expiresAtIdx: index('refresh_tokens_expires_at_idx').on(table.expiresAt),
  })
);

/**
 * TYPE EXPORTS
 * Infer TypeScript types from schema for type-safe database operations
 */
export type School = typeof schools.$inferSelect;
export type NewSchool = typeof schools.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;

export type TeacherClass = typeof teacherClasses.$inferSelect;
export type NewTeacherClass = typeof teacherClasses.$inferInsert;

export type Attendance = typeof attendance.$inferSelect;
export type NewAttendance = typeof attendance.$inferInsert;

export type AttendanceDispute = typeof attendanceDisputes.$inferSelect;
export type NewAttendanceDispute = typeof attendanceDisputes.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export type ExportJob = typeof exportJobs.$inferSelect;
export type NewExportJob = typeof exportJobs.$inferInsert;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
