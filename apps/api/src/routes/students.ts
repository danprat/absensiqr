/**
 * Student Management Routes
 * Handles student CRUD operations, bulk import, and QR code management
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, or, like, sql } from 'drizzle-orm';
import { createDb } from '../db';
import { students, type NewStudent } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware, getSchoolId, type TenantContext } from '../middleware/tenant';
import { hashPassword } from '../lib/password';
import { generateQRCode } from '../lib/qr';

/**
 * Initialize router with type-safe environment
 */
const app = new Hono<TenantContext>();

/**
 * Apply authentication and tenant middleware to all routes
 * school_admin and teacher roles can access student endpoints
 */
app.use('*', authMiddleware);
app.use('*', tenantMiddleware());

/**
 * ZOD VALIDATION SCHEMAS
 */

// Create single student request
const createStudentSchema = z.object({
  studentNumber: z.string().min(1, 'Student number is required').max(50),
  name: z.string().min(3, 'Name must be at least 3 characters').max(255),
  class: z.string().min(1, 'Class is required').max(50),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().max(20).optional(),
  photoUrl: z.string().url('Invalid URL format').optional(),
  pin: z.string().length(6, 'PIN must be exactly 6 digits').regex(/^\d{6}$/, 'PIN must contain only digits'),
});

// Update student request
const updateStudentSchema = z.object({
  studentNumber: z.string().min(1).max(50).optional(),
  name: z.string().min(3).max(255).optional(),
  class: z.string().min(1).max(50).optional(),
  email: z.string().email('Invalid email format').optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  photoUrl: z.string().url('Invalid URL format').optional().nullable(),
  pin: z.string().length(6).regex(/^\d{6}$/, 'PIN must contain only digits').optional(),
});

// Transfer student request
const transferStudentSchema = z.object({
  newClass: z.string().min(1, 'New class is required').max(50),
});

// Bulk import student item
const bulkImportStudentSchema = z.object({
  studentNumber: z.string().min(1).max(50),
  name: z.string().min(3).max(255),
  class: z.string().min(1).max(50),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().max(20).optional(),
});

// Bulk import request
const bulkImportSchema = z.object({
  preview: z.boolean().default(false),
  students: z.array(bulkImportStudentSchema).min(1, 'At least one student is required').max(1000, 'Maximum 1000 students per import'),
});

// Query parameters for listing students
const listStudentsQuerySchema = z.object({
  class: z.string().optional(),
  search: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional().default('true'),
  page: z.string().regex(/^\d+$/).optional().default('1'),
  limit: z.string().regex(/^\d+$/).optional().default('20'),
});

/**
 * HELPER FUNCTIONS
 */

/**
 * Check if student number exists within a school
 */
async function isStudentNumberAvailable(
  db: ReturnType<typeof createDb>,
  schoolId: string,
  studentNumber: string,
  excludeStudentId?: string
): Promise<boolean> {
  const existing = await db
    .select()
    .from(students)
    .where(
      and(
        eq(students.schoolId, schoolId),
        eq(students.studentNumber, studentNumber)
      )
    )
    .limit(1);
  
  if (existing.length === 0) {
    return true;
  }
  
  // If updating, allow if it's the same student
  if (excludeStudentId && existing[0]!.id === excludeStudentId) {
    return true;
  }
  
  return false;
}

/**
 * Generate default PIN for student (last 6 digits of student number, or padded if shorter)
 */
function generateDefaultPin(studentNumber: string): string {
  // Remove non-digits
  const digits = studentNumber.replace(/\D/g, '');
  
  if (digits.length >= 6) {
    // Take last 6 digits
    return digits.slice(-6);
  } else {
    // Pad with zeros at the start
    return digits.padStart(6, '0');
  }
}

/**
 * ROUTES
 */

/**
 * POST /api/students
 * Create a single student with auto-generated QR code
 */
app.post('/', async (c) => {
  try {
    const db = createDb(c.env);
    const schoolId = getSchoolId(c);
    
    // Parse and validate request body
    const body = await c.req.json();
    const validatedData = createStudentSchema.parse(body);
    
    // Check if student number is available
    const isAvailable = await isStudentNumberAvailable(
      db,
      schoolId,
      validatedData.studentNumber
    );
    
    if (!isAvailable) {
      return c.json(
        {
          error: 'Conflict',
          message: 'Student number already exists in this school',
        },
        409
      );
    }
    
    // Generate QR code
    const tempStudentId = crypto.randomUUID();
    const qrCode = await generateQRCode(schoolId, tempStudentId);
    
    // Hash PIN
    const pinHash = await hashPassword(validatedData.pin);
    
    // Create student record
    const newStudent: NewStudent = {
      id: tempStudentId,
      schoolId,
      studentNumber: validatedData.studentNumber,
      name: validatedData.name,
      class: validatedData.class,
      email: validatedData.email || null,
      phone: validatedData.phone || null,
      photoUrl: validatedData.photoUrl || null,
      qrCode,
      pinHash,
      isActive: true,
    };
    
    const [createdStudent] = await db
      .insert(students)
      .values(newStudent)
      .returning();
    
    if (!createdStudent) {
      return c.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to create student',
        },
        500
      );
    }
    
    // Return student without sensitive data
    const { pinHash: _, ...studentData } = createdStudent;
    
    return c.json(
      {
        message: 'Student created successfully',
        student: studentData,
      },
      201
    );
  } catch (error) {
    console.error('Create student error:', error);
    
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: 'Validation Error',
          message: 'Invalid request data',
          details: error.errors,
        },
        400
      );
    }
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to create student',
      },
      500
    );
  }
});

/**
 * GET /api/students
 * List students with filters, search, and pagination
 */
app.get('/', async (c) => {
  try {
    const db = createDb(c.env);
    const schoolId = getSchoolId(c);
    
    // Parse and validate query parameters
    const query = listStudentsQuerySchema.parse({
      class: c.req.query('class'),
      search: c.req.query('search'),
      isActive: c.req.query('isActive') || 'true',
      page: c.req.query('page') || '1',
      limit: c.req.query('limit') || '20',
    });
    
    // Validate and cap limit
    const limit = Math.min(parseInt(query.limit), 100);
    const page = parseInt(query.page);
    const offset = (page - 1) * limit;
    const isActive = query.isActive === 'true';
    
    // Build filters
    const filters = [eq(students.schoolId, schoolId)];
    
    // Filter by active status
    filters.push(eq(students.isActive, isActive));
    
    // Filter by class
    if (query.class) {
      filters.push(eq(students.class, query.class));
    }
    
    // Search by name or student number
    if (query.search) {
      filters.push(
        or(
          like(students.name, `%${query.search}%`),
          like(students.studentNumber, `%${query.search}%`)
        )!
      );
    }
    
    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(students)
      .where(and(...filters));
    
    const totalCount = countResult?.count || 0;
    
    // Get students
    const studentList = await db
      .select({
        id: students.id,
        studentNumber: students.studentNumber,
        name: students.name,
        class: students.class,
        email: students.email,
        phone: students.phone,
        photoUrl: students.photoUrl,
        qrCode: students.qrCode,
        isActive: students.isActive,
        createdAt: students.createdAt,
      })
      .from(students)
      .where(and(...filters))
      .orderBy(students.name)
      .limit(limit)
      .offset(offset);
    
    const totalPages = Math.ceil(totalCount / limit);
    
    return c.json({
      students: studentList,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    });
  } catch (error) {
    console.error('List students error:', error);
    
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: 'Validation Error',
          message: 'Invalid query parameters',
          details: error.errors,
        },
        400
      );
    }
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to fetch students',
      },
      500
    );
  }
});

/**
 * GET /api/students/:id
 * Get student details by ID
 */
app.get('/:id', async (c) => {
  try {
    const db = createDb(c.env);
    const schoolId = getSchoolId(c);
    const studentId = c.req.param('id');
    
    // Fetch student
    const [student] = await db
      .select({
        id: students.id,
        studentNumber: students.studentNumber,
        name: students.name,
        class: students.class,
        email: students.email,
        phone: students.phone,
        photoUrl: students.photoUrl,
        qrCode: students.qrCode,
        isActive: students.isActive,
        createdAt: students.createdAt,
      })
      .from(students)
      .where(
        and(
          eq(students.id, studentId),
          eq(students.schoolId, schoolId)
        )
      )
      .limit(1);
    
    if (!student) {
      return c.json(
        {
          error: 'Not Found',
          message: 'Student not found',
        },
        404
      );
    }
    
    return c.json({ student });
  } catch (error) {
    console.error('Get student error:', error);
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to fetch student',
      },
      500
    );
  }
});

/**
 * PATCH /api/students/:id
 * Update student information
 */
app.patch('/:id', async (c) => {
  try {
    const db = createDb(c.env);
    const schoolId = getSchoolId(c);
    const studentId = c.req.param('id');
    
    // Parse and validate request body
    const body = await c.req.json();
    const validatedData = updateStudentSchema.parse(body);
    
    // Check if at least one field is provided
    if (Object.keys(validatedData).length === 0) {
      return c.json(
        {
          error: 'Validation Error',
          message: 'At least one field must be provided for update',
        },
        400
      );
    }
    
    // Check if student exists
    const [existingStudent] = await db
      .select()
      .from(students)
      .where(
        and(
          eq(students.id, studentId),
          eq(students.schoolId, schoolId)
        )
      )
      .limit(1);
    
    if (!existingStudent) {
      return c.json(
        {
          error: 'Not Found',
          message: 'Student not found',
        },
        404
      );
    }
    
    // If updating student number, check availability
    if (validatedData.studentNumber) {
      const isAvailable = await isStudentNumberAvailable(
        db,
        schoolId,
        validatedData.studentNumber,
        studentId
      );
      
      if (!isAvailable) {
        return c.json(
          {
            error: 'Conflict',
            message: 'Student number already exists in this school',
          },
          409
        );
      }
    }
    
    // Build update object
    const updateData: Partial<NewStudent> = {};
    
    if (validatedData.studentNumber !== undefined) {
      updateData.studentNumber = validatedData.studentNumber;
    }
    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name;
    }
    if (validatedData.class !== undefined) {
      updateData.class = validatedData.class;
    }
    if (validatedData.email !== undefined) {
      updateData.email = validatedData.email;
    }
    if (validatedData.phone !== undefined) {
      updateData.phone = validatedData.phone;
    }
    if (validatedData.photoUrl !== undefined) {
      updateData.photoUrl = validatedData.photoUrl;
    }
    if (validatedData.pin !== undefined) {
      updateData.pinHash = await hashPassword(validatedData.pin);
    }
    
    // Update student
    const [updatedStudent] = await db
      .update(students)
      .set(updateData)
      .where(
        and(
          eq(students.id, studentId),
          eq(students.schoolId, schoolId)
        )
      )
      .returning();
    
    if (!updatedStudent) {
      return c.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to update student',
        },
        500
      );
    }
    
    // Return student without sensitive data
    const { pinHash: _, ...studentData } = updatedStudent;
    
    return c.json({
      message: 'Student updated successfully',
      student: studentData,
    });
  } catch (error) {
    console.error('Update student error:', error);
    
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: 'Validation Error',
          message: 'Invalid request data',
          details: error.errors,
        },
        400
      );
    }
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to update student',
      },
      500
    );
  }
});

/**
 * DELETE /api/students/:id
 * Soft delete student (set is_active = false)
 */
app.delete('/:id', async (c) => {
  try {
    const db = createDb(c.env);
    const schoolId = getSchoolId(c);
    const studentId = c.req.param('id');
    
    // Check if student exists
    const [existingStudent] = await db
      .select()
      .from(students)
      .where(
        and(
          eq(students.id, studentId),
          eq(students.schoolId, schoolId)
        )
      )
      .limit(1);
    
    if (!existingStudent) {
      return c.json(
        {
          error: 'Not Found',
          message: 'Student not found',
        },
        404
      );
    }
    
    // Soft delete
    await db
      .update(students)
      .set({ isActive: false })
      .where(
        and(
          eq(students.id, studentId),
          eq(students.schoolId, schoolId)
        )
      );
    
    return c.json({
      message: 'Student deactivated successfully',
    });
  } catch (error) {
    console.error('Delete student error:', error);
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to delete student',
      },
      500
    );
  }
});

/**
 * PATCH /api/students/:id/reactivate
 * Reactivate a deactivated student
 */
app.patch('/:id/reactivate', async (c) => {
  try {
    const db = createDb(c.env);
    const schoolId = getSchoolId(c);
    const studentId = c.req.param('id');
    
    // Check if student exists
    const [existingStudent] = await db
      .select()
      .from(students)
      .where(
        and(
          eq(students.id, studentId),
          eq(students.schoolId, schoolId)
        )
      )
      .limit(1);
    
    if (!existingStudent) {
      return c.json(
        {
          error: 'Not Found',
          message: 'Student not found',
        },
        404
      );
    }
    
    if (existingStudent.isActive) {
      return c.json(
        {
          error: 'Bad Request',
          message: 'Student is already active',
        },
        400
      );
    }
    
    // Reactivate
    const [reactivatedStudent] = await db
      .update(students)
      .set({ isActive: true })
      .where(
        and(
          eq(students.id, studentId),
          eq(students.schoolId, schoolId)
        )
      )
      .returning();
    
    if (!reactivatedStudent) {
      return c.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to reactivate student',
        },
        500
      );
    }
    
    const { pinHash: _, ...studentData } = reactivatedStudent;
    
    return c.json({
      message: 'Student reactivated successfully',
      student: studentData,
    });
  } catch (error) {
    console.error('Reactivate student error:', error);
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to reactivate student',
      },
      500
    );
  }
});

/**
 * PATCH /api/students/:id/transfer
 * Transfer student to a different class
 */
app.patch('/:id/transfer', async (c) => {
  try {
    const db = createDb(c.env);
    const schoolId = getSchoolId(c);
    const studentId = c.req.param('id');
    
    // Parse and validate request body
    const body = await c.req.json();
    const validatedData = transferStudentSchema.parse(body);
    
    // Check if student exists
    const [existingStudent] = await db
      .select()
      .from(students)
      .where(
        and(
          eq(students.id, studentId),
          eq(students.schoolId, schoolId)
        )
      )
      .limit(1);
    
    if (!existingStudent) {
      return c.json(
        {
          error: 'Not Found',
          message: 'Student not found',
        },
        404
      );
    }
    
    if (existingStudent.class === validatedData.newClass) {
      return c.json(
        {
          error: 'Bad Request',
          message: 'Student is already in this class',
        },
        400
      );
    }
    
    // Transfer to new class
    const [transferredStudent] = await db
      .update(students)
      .set({ class: validatedData.newClass })
      .where(
        and(
          eq(students.id, studentId),
          eq(students.schoolId, schoolId)
        )
      )
      .returning();
    
    if (!transferredStudent) {
      return c.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to transfer student',
        },
        500
      );
    }
    
    const { pinHash: _, ...studentData } = transferredStudent;
    
    return c.json({
      message: 'Student transferred successfully',
      student: studentData,
      oldClass: existingStudent.class,
      newClass: validatedData.newClass,
    });
  } catch (error) {
    console.error('Transfer student error:', error);
    
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: 'Validation Error',
          message: 'Invalid request data',
          details: error.errors,
        },
        400
      );
    }
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to transfer student',
      },
      500
    );
  }
});

/**
 * POST /api/students/bulk-import
 * Bulk import students with validation and preview
 */
app.post('/bulk-import', async (c) => {
  try {
    const db = createDb(c.env);
    const schoolId = getSchoolId(c);
    
    // Parse and validate request body
    const body = await c.req.json();
    const validatedData = bulkImportSchema.parse(body);
    
    // Validate each student
    interface ValidationResult {
      row: number;
      studentNumber: string;
      name: string;
      class: string;
      email?: string;
      phone?: string;
      valid: boolean;
      errors: string[];
    }
    
    const validationResults: ValidationResult[] = [];
    const studentNumbersInRequest = new Set<string>();
    
    for (let i = 0; i < validatedData.students.length; i++) {
      const student = validatedData.students[i]!;
      const errors: string[] = [];
      
      // Check for duplicate student number in request
      if (studentNumbersInRequest.has(student.studentNumber)) {
        errors.push('Duplicate student number in import data');
      } else {
        studentNumbersInRequest.add(student.studentNumber);
        
        // Check if student number exists in database
        const isAvailable = await isStudentNumberAvailable(
          db,
          schoolId,
          student.studentNumber
        );
        
        if (!isAvailable) {
          errors.push('Student number already exists in school');
        }
      }
      
      validationResults.push({
        row: i + 1,
        studentNumber: student.studentNumber,
        name: student.name,
        class: student.class,
        email: student.email,
        phone: student.phone,
        valid: errors.length === 0,
        errors,
      });
    }
    
    const validCount = validationResults.filter((r) => r.valid).length;
    const invalidCount = validationResults.filter((r) => !r.valid).length;
    
    // If preview mode, return validation results
    if (validatedData.preview) {
      return c.json({
        preview: true,
        totalRows: validatedData.students.length,
        validRows: validCount,
        invalidRows: invalidCount,
        results: validationResults,
      });
    }
    
    // If there are invalid rows, return error
    if (invalidCount > 0) {
      return c.json(
        {
          error: 'Validation Error',
          message: `${invalidCount} student(s) failed validation. Use preview mode to see details.`,
          totalRows: validatedData.students.length,
          validRows: validCount,
          invalidRows: invalidCount,
          results: validationResults.filter((r) => !r.valid),
        },
        400
      );
    }
    
    // Import all valid students
    const createdStudents = [];
    
    for (const student of validatedData.students) {
      // Generate QR code
      const tempStudentId = crypto.randomUUID();
      const qrCode = await generateQRCode(schoolId, tempStudentId);
      
      // Generate default PIN from student number
      const defaultPin = generateDefaultPin(student.studentNumber);
      const pinHash = await hashPassword(defaultPin);
      
      const newStudent: NewStudent = {
        id: tempStudentId,
        schoolId,
        studentNumber: student.studentNumber,
        name: student.name,
        class: student.class,
        email: student.email || null,
        phone: student.phone || null,
        photoUrl: null,
        qrCode,
        pinHash,
        isActive: true,
      };
      
      const [created] = await db
        .insert(students)
        .values(newStudent)
        .returning({
          id: students.id,
          studentNumber: students.studentNumber,
          name: students.name,
          class: students.class,
          email: students.email,
          phone: students.phone,
          qrCode: students.qrCode,
          isActive: students.isActive,
        });
      
      if (created) {
        createdStudents.push(created);
      }
    }
    
    return c.json(
      {
        message: 'Students imported successfully',
        totalImported: createdStudents.length,
        students: createdStudents,
        note: 'Default PIN is the last 6 digits of student number (padded with zeros if needed)',
      },
      201
    );
  } catch (error) {
    console.error('Bulk import error:', error);
    
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: 'Validation Error',
          message: 'Invalid request data',
          details: error.errors,
        },
        400
      );
    }
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to import students',
      },
      500
    );
  }
});

/**
 * GET /api/students/csv-template
 * Return CSV template structure for bulk import
 */
app.get('/csv-template', async (c) => {
  try {
    // CSV template data
    const template = {
      headers: [
        'studentNumber',
        'name',
        'class',
        'email',
        'phone',
      ],
      example: [
        {
          studentNumber: '2024001',
          name: 'John Doe',
          class: '10A',
          email: 'john.doe@example.com',
          phone: '081234567890',
        },
        {
          studentNumber: '2024002',
          name: 'Jane Smith',
          class: '10A',
          email: 'jane.smith@example.com',
          phone: '081234567891',
        },
      ],
      notes: [
        'studentNumber: Required, must be unique within school',
        'name: Required, minimum 3 characters',
        'class: Required, class name/code',
        'email: Optional, must be valid email format',
        'phone: Optional, maximum 20 characters',
        'Default PIN will be auto-generated from last 6 digits of student number',
      ],
    };
    
    return c.json(template);
  } catch (error) {
    console.error('CSV template error:', error);
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to generate template',
      },
      500
    );
  }
});

/**
 * Export routes
 */
export default app;
