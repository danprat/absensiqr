/**
 * Teacher Management Routes
 * Handles teacher CRUD operations and class assignments
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { createDb } from '../db';
import { users, teacherClasses, type NewUser, type NewTeacherClass } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { requireSchoolAdmin, requireTeacher } from '../middleware/rbac';
import { tenantMiddleware, getSchoolId, getTenantContext, type TenantContext } from '../middleware/tenant';
import { hashPassword, validatePasswordStrength } from '../lib/password';

/**
 * Initialize router with type-safe environment
 */
const app = new Hono<TenantContext>();

/**
 * Apply authentication and tenant middleware to all routes
 */
app.use('*', authMiddleware);
app.use('*', tenantMiddleware());

/**
 * ZOD VALIDATION SCHEMAS
 */

// Create teacher request
const createTeacherSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(3, 'Name must be at least 3 characters').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  classes: z.array(z.string().min(1).max(50)).optional(),
});

// Update teacher request
const updateTeacherSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  name: z.string().min(3, 'Name must be at least 3 characters').max(255).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

// Assign classes request
const assignClassesSchema = z.object({
  classes: z.array(z.string().min(1).max(50)).min(1, 'At least one class is required'),
});

// Query parameters for listing teachers
const listTeachersQuerySchema = z.object({
  isActive: z.enum(['true', 'false']).optional().default('true'),
  page: z.string().regex(/^\d+$/).optional().default('1'),
  limit: z.string().regex(/^\d+$/).optional().default('20'),
});

/**
 * HELPER FUNCTIONS
 */

/**
 * Check if email exists within a school for teachers
 */
async function isEmailAvailable(
  db: ReturnType<typeof createDb>,
  schoolId: string,
  email: string,
  excludeTeacherId?: string
): Promise<boolean> {
  const existing = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.schoolId, schoolId),
        eq(users.email, email),
        eq(users.role, 'teacher')
      )
    )
    .limit(1);
  
  if (existing.length === 0) {
    return true;
  }
  
  // If updating, allow if it's the same teacher
  if (excludeTeacherId && existing[0]!.id === excludeTeacherId) {
    return true;
  }
  
  return false;
}

/**
 * Get teacher's assigned classes
 */
async function getTeacherClasses(
  db: ReturnType<typeof createDb>,
  teacherId: string,
  schoolId: string
): Promise<string[]> {
  const classes = await db
    .select({ className: teacherClasses.className })
    .from(teacherClasses)
    .where(
      and(
        eq(teacherClasses.teacherId, teacherId),
        eq(teacherClasses.schoolId, schoolId)
      )
    );
  
  return classes.map((c) => c.className);
}

/**
 * ROUTES
 */

/**
 * POST /api/teachers
 * Create a new teacher (school_admin only)
 */
app.post('/', requireSchoolAdmin(), async (c) => {
  try {
    const db = createDb(c.env);
    const schoolId = getSchoolId(c);
    
    // Parse and validate request body
    const body = await c.req.json();
    const validatedData = createTeacherSchema.parse(body);
    
    // Validate password strength
    const passwordValidation = validatePasswordStrength(validatedData.password);
    if (!passwordValidation.valid) {
      return c.json(
        {
          error: 'Validation Error',
          message: 'Password does not meet strength requirements',
          details: passwordValidation.errors,
        },
        400
      );
    }
    
    // Check if email is available
    const emailAvailable = await isEmailAvailable(db, schoolId, validatedData.email);
    if (!emailAvailable) {
      return c.json(
        {
          error: 'Conflict',
          message: 'A teacher with this email already exists in your school',
        },
        409
      );
    }
    
    // Hash password
    const passwordHash = await hashPassword(validatedData.password);
    
    // Create teacher user
    const newTeacher: NewUser = {
      schoolId,
      email: validatedData.email,
      passwordHash,
      name: validatedData.name,
      role: 'teacher',
      isActive: true,
    };
    
    const [createdTeacher] = await db
      .insert(users)
      .values(newTeacher)
      .returning();
    
    if (!createdTeacher) {
      throw new Error('Failed to create teacher');
    }
    
    // Assign initial classes if provided
    let assignedClasses: string[] = [];
    if (validatedData.classes && validatedData.classes.length > 0) {
      const classAssignments: NewTeacherClass[] = validatedData.classes.map((className) => ({
        teacherId: createdTeacher.id,
        className,
        schoolId,
      }));
      
      await db.insert(teacherClasses).values(classAssignments);
      assignedClasses = validatedData.classes;
    }
    
    return c.json(
      {
        message: 'Teacher created successfully',
        teacher: {
          id: createdTeacher.id,
          email: createdTeacher.email,
          name: createdTeacher.name,
          isActive: createdTeacher.isActive,
          createdAt: createdTeacher.createdAt.toISOString(),
          classes: assignedClasses,
        },
      },
      201
    );
  } catch (error) {
    console.error('Create teacher error:', error);
    
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
        message: 'Failed to create teacher',
      },
      500
    );
  }
});

/**
 * GET /api/teachers
 * List all teachers in the school
 */
app.get('/', requireTeacher(), async (c) => {
  try {
    const db = createDb(c.env);
    const schoolId = getSchoolId(c);
    
    // Parse and validate query parameters
    const query = c.req.query();
    const validatedQuery = listTeachersQuerySchema.parse(query);
    
    const isActive = validatedQuery.isActive === 'true';
    const page = parseInt(validatedQuery.page);
    const limit = Math.min(parseInt(validatedQuery.limit), 100); // Max 100 per page
    const offset = (page - 1) * limit;
    
    // Get teachers
    const teacherList = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(
        and(
          eq(users.schoolId, schoolId),
          eq(users.role, 'teacher'),
          eq(users.isActive, isActive)
        )
      )
      .limit(limit)
      .offset(offset)
      .orderBy(users.name);
    
    // Get total count for pagination
    const [countResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(users)
      .where(
        and(
          eq(users.schoolId, schoolId),
          eq(users.role, 'teacher'),
          eq(users.isActive, isActive)
        )
      );
    
    const total = countResult?.count ?? 0;
    
    // Get classes for each teacher
    const teachersWithClasses = await Promise.all(
      teacherList.map(async (teacher) => {
        const classes = await getTeacherClasses(db, teacher.id, schoolId);
        return {
          id: teacher.id,
          email: teacher.email,
          name: teacher.name,
          isActive: teacher.isActive,
          createdAt: teacher.createdAt.toISOString(),
          classes,
        };
      })
    );
    
    return c.json({
      teachers: teachersWithClasses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List teachers error:', error);
    
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
        message: 'Failed to retrieve teachers',
      },
      500
    );
  }
});

/**
 * GET /api/teachers/:id
 * Get teacher details with assigned classes
 */
app.get('/:id', requireTeacher(), async (c) => {
  try {
    const db = createDb(c.env);
    const schoolId = getSchoolId(c);
    const { userId, userRole } = getTenantContext(c);
    const teacherId = c.req.param('id');
    
    // Teachers can only view their own info unless they're school_admin or super_admin
    if (userRole === 'teacher' && teacherId !== userId) {
      return c.json(
        {
          error: 'Forbidden',
          message: 'You can only view your own teacher profile',
        },
        403
      );
    }
    
    // Get teacher
    const [teacher] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(
        and(
          eq(users.id, teacherId),
          eq(users.schoolId, schoolId),
          eq(users.role, 'teacher')
        )
      )
      .limit(1);
    
    if (!teacher) {
      return c.json(
        {
          error: 'Not Found',
          message: 'Teacher not found',
        },
        404
      );
    }
    
    // Get assigned classes
    const classes = await getTeacherClasses(db, teacher.id, schoolId);
    
    return c.json({
      teacher: {
        id: teacher.id,
        email: teacher.email,
        name: teacher.name,
        isActive: teacher.isActive,
        createdAt: teacher.createdAt.toISOString(),
        classes,
      },
    });
  } catch (error) {
    console.error('Get teacher error:', error);
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to retrieve teacher',
      },
      500
    );
  }
});

/**
 * PATCH /api/teachers/:id
 * Update teacher information (school_admin only)
 */
app.patch('/:id', requireSchoolAdmin(), async (c) => {
  try {
    const db = createDb(c.env);
    const schoolId = getSchoolId(c);
    const teacherId = c.req.param('id');
    
    // Parse and validate request body
    const body = await c.req.json();
    const validatedData = updateTeacherSchema.parse(body);
    
    // Check if nothing to update
    if (Object.keys(validatedData).length === 0) {
      return c.json(
        {
          error: 'Bad Request',
          message: 'No fields to update',
        },
        400
      );
    }
    
    // Check if teacher exists
    const [existingTeacher] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, teacherId),
          eq(users.schoolId, schoolId),
          eq(users.role, 'teacher')
        )
      )
      .limit(1);
    
    if (!existingTeacher) {
      return c.json(
        {
          error: 'Not Found',
          message: 'Teacher not found',
        },
        404
      );
    }
    
    // Prepare update data
    const updateData: Partial<NewUser> = {};
    
    // Validate and update email if provided
    if (validatedData.email) {
      const emailAvailable = await isEmailAvailable(
        db,
        schoolId,
        validatedData.email,
        teacherId
      );
      if (!emailAvailable) {
        return c.json(
          {
            error: 'Conflict',
            message: 'A teacher with this email already exists in your school',
          },
          409
        );
      }
      updateData.email = validatedData.email;
    }
    
    // Update name if provided
    if (validatedData.name) {
      updateData.name = validatedData.name;
    }
    
    // Update password if provided
    if (validatedData.password) {
      const passwordValidation = validatePasswordStrength(validatedData.password);
      if (!passwordValidation.valid) {
        return c.json(
          {
            error: 'Validation Error',
            message: 'Password does not meet strength requirements',
            details: passwordValidation.errors,
          },
          400
        );
      }
      updateData.passwordHash = await hashPassword(validatedData.password);
    }
    
    // Update teacher
    const [updatedTeacher] = await db
      .update(users)
      .set(updateData)
      .where(
        and(
          eq(users.id, teacherId),
          eq(users.schoolId, schoolId)
        )
      )
      .returning();
    
    if (!updatedTeacher) {
      throw new Error('Failed to update teacher');
    }
    
    // Get classes
    const classes = await getTeacherClasses(db, updatedTeacher.id, schoolId);
    
    return c.json({
      message: 'Teacher updated successfully',
      teacher: {
        id: updatedTeacher.id,
        email: updatedTeacher.email,
        name: updatedTeacher.name,
        isActive: updatedTeacher.isActive,
        createdAt: updatedTeacher.createdAt.toISOString(),
        classes,
      },
    });
  } catch (error) {
    console.error('Update teacher error:', error);
    
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
        message: 'Failed to update teacher',
      },
      500
    );
  }
});

/**
 * DELETE /api/teachers/:id
 * Soft delete teacher (set isActive = false) (school_admin only)
 */
app.delete('/:id', requireSchoolAdmin(), async (c) => {
  try {
    const db = createDb(c.env);
    const schoolId = getSchoolId(c);
    const teacherId = c.req.param('id');
    
    // Check if teacher exists
    const [existingTeacher] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, teacherId),
          eq(users.schoolId, schoolId),
          eq(users.role, 'teacher')
        )
      )
      .limit(1);
    
    if (!existingTeacher) {
      return c.json(
        {
          error: 'Not Found',
          message: 'Teacher not found',
        },
        404
      );
    }
    
    if (!existingTeacher.isActive) {
      return c.json(
        {
          error: 'Bad Request',
          message: 'Teacher is already inactive',
        },
        400
      );
    }
    
    // Soft delete teacher
    await db
      .update(users)
      .set({ isActive: false })
      .where(
        and(
          eq(users.id, teacherId),
          eq(users.schoolId, schoolId)
        )
      );
    
    return c.json({
      message: 'Teacher deactivated successfully',
      teacherId,
    });
  } catch (error) {
    console.error('Delete teacher error:', error);
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to delete teacher',
      },
      500
    );
  }
});

/**
 * POST /api/teachers/:id/classes
 * Assign classes to a teacher (school_admin only)
 */
app.post('/:id/classes', requireSchoolAdmin(), async (c) => {
  try {
    const db = createDb(c.env);
    const schoolId = getSchoolId(c);
    const teacherId = c.req.param('id');
    
    // Parse and validate request body
    const body = await c.req.json();
    const validatedData = assignClassesSchema.parse(body);
    
    // Check if teacher exists
    const [teacher] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, teacherId),
          eq(users.schoolId, schoolId),
          eq(users.role, 'teacher'),
          eq(users.isActive, true)
        )
      )
      .limit(1);
    
    if (!teacher) {
      return c.json(
        {
          error: 'Not Found',
          message: 'Teacher not found or inactive',
        },
        404
      );
    }
    
    // Get current class assignments
    const currentClasses = await getTeacherClasses(db, teacherId, schoolId);
    
    // Filter out classes that are already assigned
    const newClasses = validatedData.classes.filter(
      (className) => !currentClasses.includes(className)
    );
    
    if (newClasses.length === 0) {
      return c.json(
        {
          message: 'All classes are already assigned to this teacher',
          teacher: {
            id: teacher.id,
            name: teacher.name,
            classes: currentClasses,
          },
        },
        200
      );
    }
    
    // Create new class assignments
    const classAssignments: NewTeacherClass[] = newClasses.map((className) => ({
      teacherId,
      className,
      schoolId,
    }));
    
    await db.insert(teacherClasses).values(classAssignments);
    
    // Get updated classes
    const updatedClasses = await getTeacherClasses(db, teacherId, schoolId);
    
    return c.json(
      {
        message: 'Classes assigned successfully',
        teacher: {
          id: teacher.id,
          name: teacher.name,
          classes: updatedClasses,
        },
        assignedClasses: newClasses,
      },
      201
    );
  } catch (error) {
    console.error('Assign classes error:', error);
    
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
        message: 'Failed to assign classes',
      },
      500
    );
  }
});

/**
 * DELETE /api/teachers/:id/classes/:className
 * Remove class assignment from a teacher (school_admin only)
 */
app.delete('/:id/classes/:className', requireSchoolAdmin(), async (c) => {
  try {
    const db = createDb(c.env);
    const schoolId = getSchoolId(c);
    const teacherId = c.req.param('id');
    const className = c.req.param('className');
    
    // Check if teacher exists
    const [teacher] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, teacherId),
          eq(users.schoolId, schoolId),
          eq(users.role, 'teacher')
        )
      )
      .limit(1);
    
    if (!teacher) {
      return c.json(
        {
          error: 'Not Found',
          message: 'Teacher not found',
        },
        404
      );
    }
    
    // Remove class assignment
    const result = await db
      .delete(teacherClasses)
      .where(
        and(
          eq(teacherClasses.teacherId, teacherId),
          eq(teacherClasses.className, className),
          eq(teacherClasses.schoolId, schoolId)
        )
      )
      .returning();
    
    if (result.length === 0) {
      return c.json(
        {
          error: 'Not Found',
          message: 'Class assignment not found',
        },
        404
      );
    }
    
    // Get updated classes
    const updatedClasses = await getTeacherClasses(db, teacherId, schoolId);
    
    return c.json({
      message: 'Class assignment removed successfully',
      teacher: {
        id: teacher.id,
        name: teacher.name,
        classes: updatedClasses,
      },
      removedClass: className,
    });
  } catch (error) {
    console.error('Remove class assignment error:', error);
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to remove class assignment',
      },
      500
    );
  }
});

export default app;
