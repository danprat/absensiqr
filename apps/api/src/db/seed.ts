/**
 * Database Seed Script - Demo Data
 * Creates demo school, users, teachers, students, and attendance data
 * 
 * Run with: npm run seed
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, and } from 'drizzle-orm';
import * as schema from './schema';
import { hashPassword } from '../lib/password';
import { generateQRCode } from '../lib/qr';

/**
 * Main seeding function
 */
async function seed() {
  console.log('🌱 Starting database seed...\n');

  // Get DATABASE_URL from environment
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  // Create database connection
  const sql = neon(databaseUrl);
  const db = drizzle(sql, { schema });

  try {
    // ========================================
    // 1. Create Demo School
    // ========================================
    console.log('📚 Creating demo school...');
    
    // Check if demo school already exists
    const existingSchool = await db
      .select()
      .from(schema.schools)
      .where(eq(schema.schools.subdomain, 'demo'))
      .limit(1);

    let demoSchool: typeof schema.schools.$inferSelect;

    if (existingSchool.length > 0) {
      console.log('   ✓ Demo school already exists, using existing school');
      demoSchool = existingSchool[0]!;
    } else {
      const [newSchool] = await db
        .insert(schema.schools)
        .values({
          name: 'SMA Demo AbsensiQR',
          subdomain: 'demo',
          timezone: 'WIB',
          status: 'active',
          schoolHours: {
            start: '07:00',
            end: '15:00',
            scanWindow: 30,
          },
          maxStudents: 500,
          primaryColor: '#3B82F6',
        })
        .returning();
      
      if (!newSchool) {
        throw new Error('Failed to create demo school');
      }
      
      demoSchool = newSchool;
      console.log('   ✓ Demo school created:', demoSchool.name);
    }

    // ========================================
    // 2. Create Demo Admin User
    // ========================================
    console.log('\n👤 Creating demo admin user...');
    
    const existingAdmin = await db
      .select()
      .from(schema.users)
      .where(
        and(
          eq(schema.users.schoolId, demoSchool.id),
          eq(schema.users.email, 'demo@absensiqr.app')
        )
      )
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log('   ✓ Admin user already exists');
    } else {
      const adminPasswordHash = await hashPassword('Demo123!');
      
      const [newAdmin] = await db
        .insert(schema.users)
        .values({
          schoolId: demoSchool.id,
          email: 'demo@absensiqr.app',
          passwordHash: adminPasswordHash,
          name: 'Admin Demo',
          role: 'school_admin',
          isActive: true,
        })
        .returning();
      
      if (!newAdmin) {
        throw new Error('Failed to create admin user');
      }
      
      console.log('   ✓ Admin user created: demo@absensiqr.app / Demo123!');
    }

    // ========================================
    // 3. Create 5 Demo Teachers
    // ========================================
    console.log('\n👨‍🏫 Creating demo teachers...');
    
    const teachersData = [
      { name: 'Budi Santoso', email: 'budi@demo.absensiqr.app', classes: ['X-A', 'X-B'] },
      { name: 'Siti Nurhaliza', email: 'siti@demo.absensiqr.app', classes: ['XI-A'] },
      { name: 'Ahmad Yani', email: 'ahmad@demo.absensiqr.app', classes: ['XI-B'] },
      { name: 'Dewi Lestari', email: 'dewi@demo.absensiqr.app', classes: ['XII-A'] },
      { name: 'Rudi Hartono', email: 'rudi@demo.absensiqr.app', classes: ['X-A', 'XI-A'] },
    ];

    const teacherPasswordHash = await hashPassword('Teacher123!');
    const createdTeachers: typeof schema.users.$inferSelect[] = [];

    for (const teacher of teachersData) {
      // Check if teacher already exists
      const existingTeacher = await db
        .select()
        .from(schema.users)
        .where(
          and(
            eq(schema.users.schoolId, demoSchool.id),
            eq(schema.users.email, teacher.email)
          )
        )
        .limit(1);

      let teacherUser: typeof schema.users.$inferSelect;

      if (existingTeacher.length > 0) {
        console.log(`   ✓ Teacher already exists: ${teacher.name}`);
        teacherUser = existingTeacher[0]!;
      } else {
        const [newTeacher] = await db
          .insert(schema.users)
          .values({
            schoolId: demoSchool.id,
            email: teacher.email,
            passwordHash: teacherPasswordHash,
            name: teacher.name,
            role: 'teacher',
            isActive: true,
          })
          .returning();
        
        if (!newTeacher) {
          throw new Error(`Failed to create teacher: ${teacher.name}`);
        }
        
        teacherUser = newTeacher;
        console.log(`   ✓ Teacher created: ${teacher.name} (${teacher.email})`);
      }

      createdTeachers.push(teacherUser);

      // Assign classes to teacher
      for (const className of teacher.classes) {
        const existingAssignment = await db
          .select()
          .from(schema.teacherClasses)
          .where(
            and(
              eq(schema.teacherClasses.teacherId, teacherUser.id),
              eq(schema.teacherClasses.className, className)
            )
          )
          .limit(1);

        if (existingAssignment.length === 0) {
          await db.insert(schema.teacherClasses).values({
            teacherId: teacherUser.id,
            className,
            schoolId: demoSchool.id,
          });
          console.log(`      - Assigned to class: ${className}`);
        }
      }
    }

    // ========================================
    // 4. Create 50 Demo Students
    // ========================================
    console.log('\n👨‍🎓 Creating demo students...');
    
    const classes = ['X-A', 'X-B', 'XI-A', 'XI-B', 'XII-A'];
    const defaultPinHash = await hashPassword('123456');
    const createdStudents: typeof schema.students.$inferSelect[] = [];

    for (let i = 1; i <= 50; i++) {
      const studentNumber = `DEMO${String(i).padStart(3, '0')}`;
      const className = classes[(i - 1) % classes.length]!;
      const studentName = `Siswa Demo ${i}`;

      // Check if student already exists
      const existingStudent = await db
        .select()
        .from(schema.students)
        .where(
          and(
            eq(schema.students.schoolId, demoSchool.id),
            eq(schema.students.studentNumber, studentNumber)
          )
        )
        .limit(1);

      if (existingStudent.length > 0) {
        console.log(`   ✓ Student already exists: ${studentName} (${studentNumber})`);
        createdStudents.push(existingStudent[0]!);
        continue;
      }

      // Generate QR code for student
      // Note: We'll use a temporary ID first, then update after insertion
      const tempQRCode = `TEMP_${studentNumber}_${Date.now()}`;

      const studentInsertData: typeof schema.students.$inferInsert = {
        schoolId: demoSchool.id,
        studentNumber,
        name: studentName,
        class: className,
        email: `${studentNumber.toLowerCase()}@demo.absensiqr.app`,
        phone: `08${String(i).padStart(10, '0')}`,
        qrCode: tempQRCode,
        pinHash: defaultPinHash,
        isActive: true,
      };

      const [newStudent] = await db
        .insert(schema.students)
        .values(studentInsertData)
        .returning();

      if (!newStudent) {
        throw new Error(`Failed to create student: ${studentName}`);
      }

      // Generate proper QR code with actual student ID
      const qrCode = await generateQRCode(demoSchool.id, newStudent.id);

      // Update student with proper QR code
      const [updatedStudent] = await db
        .update(schema.students)
        .set({ qrCode })
        .where(eq(schema.students.id, newStudent.id))
        .returning();

      if (!updatedStudent) {
        throw new Error(`Failed to update QR code for student: ${studentName}`);
      }

      createdStudents.push(updatedStudent);
      
      if (i % 10 === 0) {
        console.log(`   ✓ Created ${i}/50 students...`);
      }
    }

    console.log('   ✓ All 50 students created');

    // ========================================
    // 5. Create Sample Attendance Data (Last 7 Days)
    // ========================================
    console.log('\n📅 Creating sample attendance data...');
    
    const today = new Date();
    const attendanceRecords: typeof schema.attendance.$inferInsert[] = [];

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset);
      
      // Skip weekends
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        continue;
      }

      const dateString = date.toISOString().split('T')[0]!;

      for (const student of createdStudents) {
        // Check if attendance already exists
        const existingAttendance = await db
          .select()
          .from(schema.attendance)
          .where(
            and(
              eq(schema.attendance.studentId, student.id),
              eq(schema.attendance.date, dateString)
            )
          )
          .limit(1);

        if (existingAttendance.length > 0) {
          continue;
        }

        // Randomly assign attendance status (80% hadir, 10% izin, 5% sakit, 5% alpha)
        const rand = Math.random();
        let status: 'hadir' | 'izin' | 'sakit' | 'alpha';
        
        if (rand < 0.8) {
          status = 'hadir';
        } else if (rand < 0.9) {
          status = 'izin';
        } else if (rand < 0.95) {
          status = 'sakit';
        } else {
          status = 'alpha';
        }

        // Get teacher for this student's class
        const teacherAssignments = await db
          .select()
          .from(schema.teacherClasses)
          .where(
            and(
              eq(schema.teacherClasses.schoolId, demoSchool.id),
              eq(schema.teacherClasses.className, student.class)
            )
          )
          .limit(1);

        const teacherId = teacherAssignments.length > 0 
          ? teacherAssignments[0]!.teacherId 
          : createdTeachers[0]!.id;

        // Set scan time between 07:00 and 08:00
        const scanTime = new Date(date);
        scanTime.setHours(7, Math.floor(Math.random() * 60), 0, 0);

        attendanceRecords.push({
          schoolId: demoSchool.id,
          studentId: student.id,
          teacherId,
          date: dateString,
          status,
          scanTime,
          notes: status !== 'hadir' ? `Demo ${status} note` : null,
          deviceInfo: {
            userAgent: 'Mozilla/5.0 (Demo Seed)',
            platform: 'Web',
          },
          syncedFromOffline: false,
        });
      }
    }

    // Batch insert attendance records
    if (attendanceRecords.length > 0) {
      // Insert in batches of 100 to avoid payload limits
      const batchSize = 100;
      for (let i = 0; i < attendanceRecords.length; i += batchSize) {
        const batch = attendanceRecords.slice(i, i + batchSize);
        await db.insert(schema.attendance).values(batch);
        console.log(`   ✓ Inserted attendance records ${i + 1}-${Math.min(i + batchSize, attendanceRecords.length)}/${attendanceRecords.length}`);
      }
    }

    // ========================================
    // Summary
    // ========================================
    console.log('\n✅ Database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   • School: ${demoSchool.name} (subdomain: demo)`);
    console.log(`   • Admin: demo@absensiqr.app / Demo123!`);
    console.log(`   • Teachers: ${createdTeachers.length} created`);
    console.log(`   • Students: ${createdStudents.length} created (PIN: 123456)`);
    console.log(`   • Attendance records: ${attendanceRecords.length} created`);
    console.log('\n🎉 You can now login at: https://demo.absensiqr.app\n');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    throw error;
  }
}

// Run seed function
seed()
  .then(() => {
    console.log('🏁 Seed script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed script failed:', error);
    process.exit(1);
  });
