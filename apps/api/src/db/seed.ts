/**
 * Database Seed Script - Comprehensive Demo Data
 * Creates demo school with complete data for testing all features
 * 
 * Run with: npm run seed
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, and } from 'drizzle-orm';
import * as schema from './schema';
import { hashPassword } from '../lib/password';
import { generateQRCode } from '../lib/qr';

const DEMO_PASSWORD = 'Demo123!';
const STUDENT_PIN = '123456';

// Indonesian names for realistic data
const FIRST_NAMES = [
  'Adi', 'Budi', 'Citra', 'Dewi', 'Eka', 'Fajar', 'Gita', 'Hadi', 'Indah', 'Joko',
  'Kartika', 'Lukman', 'Maya', 'Nadia', 'Oscar', 'Putri', 'Qori', 'Rina', 'Sari', 'Taufik',
  'Umi', 'Vina', 'Wati', 'Yudi', 'Zahra', 'Agus', 'Bambang', 'Cahya', 'Dian', 'Endang',
  'Firdaus', 'Gilang', 'Hendra', 'Irma', 'Jihan', 'Kurnia', 'Lestari', 'Melati', 'Nurul', 'Oktavia'
];

const LAST_NAMES = [
  'Pratama', 'Wijaya', 'Kusuma', 'Santoso', 'Wibowo', 'Putra', 'Sari', 'Permana', 'Hidayat', 'Rahman',
  'Saputra', 'Nugraha', 'Setiawan', 'Kurniawan', 'Handoko', 'Susanto', 'Hartono', 'Suryadi', 'Firmansyah', 'Utomo'
];

function randomName(): string {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]!;
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]!;
  return `${first} ${last}`;
}

function randomPhone(): string {
  const prefixes = ['0812', '0813', '0815', '0816', '0817', '0821', '0822', '0852', '0853', '0857', '0858'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]!;
  const number = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return `${prefix}${number}`;
}

async function seed() {
  console.log('[SEED] Starting database seeding process...\n');

  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql, { schema });

  try {
    // ========================================
    // 1. Create Demo School
    // ========================================
    const existingSchool = await db
      .select()
      .from(schema.schools)
      .where(eq(schema.schools.subdomain, 'demo'))
      .limit(1);

    let school: typeof schema.schools.$inferSelect;

    if (existingSchool.length > 0) {
      school = existingSchool[0]!;
      console.log('[SEED] Using existing demo school');
    } else {
      const [newSchool] = await db
        .insert(schema.schools)
        .values({
          name: 'SMA Demo AbsensiQR',
          subdomain: 'demo',
          timezone: 'WIB',
          status: 'active',
          schoolHours: { start: '07:00', end: '15:00', scanWindow: 30 },
          maxStudents: 500,
          primaryColor: '#3B82F6',
        })
        .returning();
      
      school = newSchool!;
      console.log(`[SEED] ✓ Demo school created: ${school.name} (${school.subdomain})`);
    }

    // ========================================
    // 2. Create Admin User
    // ========================================
    const adminPasswordHash = await hashPassword(DEMO_PASSWORD);
    
    const existingAdmin = await db
      .select()
      .from(schema.users)
      .where(and(
        eq(schema.users.schoolId, school.id),
        eq(schema.users.email, 'demo@absensiqr.app')
      ))
      .limit(1);

    if (existingAdmin.length === 0) {
      await db.insert(schema.users).values({
        schoolId: school.id,
        email: 'demo@absensiqr.app',
        passwordHash: adminPasswordHash,
        name: 'Admin Demo',
        role: 'school_admin',
        isActive: true,
      });
      console.log(`[SEED] ✓ Admin user created: demo@absensiqr.app`);
    }

    // ========================================
    // 3. Create Teachers (5 teachers)
    // ========================================
    const classes = ['X-A', 'X-B', 'XI-A', 'XI-B', 'XII-A'];
    const teacherPasswordHash = await hashPassword(DEMO_PASSWORD);
    const teachers: typeof schema.users.$inferSelect[] = [];

    const teachersData = [
      { name: 'Budi Santoso', email: 'budi@demo.absensiqr.app', classes: ['X-A'] },
      { name: 'Siti Nurhaliza', email: 'siti@demo.absensiqr.app', classes: ['X-B'] },
      { name: 'Ahmad Yani', email: 'ahmad@demo.absensiqr.app', classes: ['XI-A'] },
      { name: 'Dewi Lestari', email: 'dewi@demo.absensiqr.app', classes: ['XI-B'] },
      { name: 'Rudi Hartono', email: 'rudi@demo.absensiqr.app', classes: ['XII-A'] },
    ];

    for (const t of teachersData) {
      const existing = await db
        .select()
        .from(schema.users)
        .where(and(
          eq(schema.users.schoolId, school.id),
          eq(schema.users.email, t.email)
        ))
        .limit(1);

      let teacher: typeof schema.users.$inferSelect;
      if (existing.length > 0) {
        teacher = existing[0]!;
      } else {
        const [newTeacher] = await db
          .insert(schema.users)
          .values({
            schoolId: school.id,
            email: t.email,
            passwordHash: teacherPasswordHash,
            name: t.name,
            role: 'teacher',
            isActive: true,
          })
          .returning();
        teacher = newTeacher!;
      }
      teachers.push(teacher);

      // Assign classes
      for (const className of t.classes) {
        const existingAssignment = await db
          .select()
          .from(schema.teacherClasses)
          .where(and(
            eq(schema.teacherClasses.teacherId, teacher.id),
            eq(schema.teacherClasses.className, className)
          ))
          .limit(1);

        if (existingAssignment.length === 0) {
          await db.insert(schema.teacherClasses).values({
            teacherId: teacher.id,
            className,
            schoolId: school.id,
          });
        }
      }
    }
    console.log(`[SEED] ✓ ${teachers.length} demo teachers created and assigned to classes`);

    // ========================================
    // 4. Create Students (50 students, 10 per class)
    // ========================================
    const pinHash = await hashPassword(STUDENT_PIN);
    const students: typeof schema.students.$inferSelect[] = [];

    let studentNum = 1;
    for (const className of classes) {
      for (let i = 0; i < 10; i++) {
        const studentNumber = String(studentNum).padStart(3, '0');
        const studentName = randomName();

        const existing = await db
          .select()
          .from(schema.students)
          .where(and(
            eq(schema.students.schoolId, school.id),
            eq(schema.students.studentNumber, studentNumber)
          ))
          .limit(1);

        let student: typeof schema.students.$inferSelect;
        if (existing.length > 0) {
          student = existing[0]!;
        } else {
          // Create with temp QR first
          const [newStudent] = await db
            .insert(schema.students)
            .values({
              schoolId: school.id,
              studentNumber,
              name: studentName,
              class: className,
              email: `student${studentNumber}@demo.absensiqr.app`,
              phone: randomPhone(),
              qrCode: `TEMP_${studentNumber}_${Date.now()}`,
              pinHash,
              isActive: true,
            })
            .returning();

          // Generate proper QR code
          const qrCode = await generateQRCode(school.id, newStudent!.id);
          const [updated] = await db
            .update(schema.students)
            .set({ qrCode })
            .where(eq(schema.students.id, newStudent!.id))
            .returning();
          student = updated!;
        }
        students.push(student);
        studentNum++;
      }
    }
    console.log(`[SEED] ✓ ${students.length} demo students created across all classes`);
    console.log(`[SEED] ✓ QR codes generated for all students`);

    // ========================================
    // 5. Create Attendance Records (Last 7 days)
    // ========================================
    const today = new Date();
    let attendanceCount = 0;

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset);
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      const dateStr = date.toISOString().split('T')[0]!;

      for (const student of students) {
        // Check if attendance exists
        const existing = await db
          .select()
          .from(schema.attendance)
          .where(and(
            eq(schema.attendance.studentId, student.id),
            eq(schema.attendance.date, dateStr)
          ))
          .limit(1);

        if (existing.length > 0) continue;

        // Random status: 80% hadir, 10% izin, 5% sakit, 5% alpha
        const rand = Math.random();
        let status: 'hadir' | 'izin' | 'sakit' | 'alpha';
        if (rand < 0.80) status = 'hadir';
        else if (rand < 0.90) status = 'izin';
        else if (rand < 0.95) status = 'sakit';
        else status = 'alpha';

        // Get teacher for this class
        const classIndex = classes.indexOf(student.class);
        const teacher = teachers[classIndex] || teachers[0]!;

        // Random scan time between 06:45 - 07:30
        const scanTime = new Date(date);
        scanTime.setHours(6, 45 + Math.floor(Math.random() * 45), Math.floor(Math.random() * 60), 0);

        await db.insert(schema.attendance).values({
          schoolId: school.id,
          studentId: student.id,
          teacherId: teacher.id,
          date: dateStr,
          status,
          scanTime,
          notes: status !== 'hadir' ? `Keterangan ${status}` : null,
          deviceInfo: { platform: 'Web', userAgent: 'Demo Seed' },
          syncedFromOffline: false,
        });
        attendanceCount++;
      }
    }
    console.log(`[SEED] ✓ Generated ${attendanceCount} attendance records for last 7 days`);

    // ========================================
    // 6. Create Sample Disputes (5 disputes)
    // ========================================
    const recentAttendance = await db
      .select()
      .from(schema.attendance)
      .where(eq(schema.attendance.schoolId, school.id))
      .limit(10);

    let disputeCount = 0;
    for (let i = 0; i < Math.min(5, recentAttendance.length); i++) {
      const att = recentAttendance[i]!;
      
      const existing = await db
        .select()
        .from(schema.attendanceDisputes)
        .where(eq(schema.attendanceDisputes.attendanceId, att.id))
        .limit(1);

      if (existing.length > 0) continue;

      const statuses: ('pending' | 'approved' | 'rejected')[] = ['pending', 'pending', 'approved', 'rejected', 'pending'];
      const status = statuses[i] || 'pending';

      await db.insert(schema.attendanceDisputes).values({
        attendanceId: att.id,
        studentId: att.studentId,
        reason: `Saya sudah hadir tepat waktu pada tanggal tersebut. Mohon dikoreksi. [Demo dispute #${i + 1}]`,
        status,
        teacherNotes: status !== 'pending' ? `Catatan guru: ${status === 'approved' ? 'Disetujui' : 'Ditolak'}` : null,
        resolvedAt: status !== 'pending' ? new Date() : null,
      });
      disputeCount++;
    }
    console.log(`[SEED] ✓ Created ${disputeCount} sample disputes`);

    // ========================================
    // Summary
    // ========================================
    console.log('[SEED] ');
    console.log('[SEED] ========================================');
    console.log('[SEED] Seeding Summary:');
    console.log('[SEED] ========================================');
    console.log(`[SEED] School: ${school.name} (${school.subdomain})`);
    console.log(`[SEED] Admin: demo@absensiqr.app / ${DEMO_PASSWORD}`);
    console.log(`[SEED] Teachers: ${teachers.length} (Assigned to classes ${classes.join(', ')})`);
    console.log(`[SEED] Students: ${students.length} (Across ${classes.length} classes)`);
    console.log(`[SEED] Attendance Records: ${attendanceCount} (Last 7 days with realistic distribution)`);
    console.log(`[SEED] Disputes: ${disputeCount} (Mixed statuses)`);
    console.log('[SEED] ');
    console.log('[SEED] ✓ Seeding completed successfully!');
  } catch (error) {
    console.error('[SEED] ✗ Seeding failed:', error);
    throw error;
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
