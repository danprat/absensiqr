/**
 * StudentForm Component
 * 
 * Form for creating and editing student records
 */

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Student } from '@/services/students'

/**
 * Form validation schema
 */
const studentFormSchema = z.object({
  studentNumber: z
    .string()
    .min(1, 'Student number is required')
    .max(50, 'Student number must be at most 50 characters'),
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(255, 'Name must be at most 255 characters'),
  class: z
    .string()
    .min(1, 'Class is required')
    .max(50, 'Class must be at most 50 characters'),
  email: z
    .string()
    .email('Invalid email format')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .max(20, 'Phone must be at most 20 characters')
    .optional()
    .or(z.literal('')),
  photoUrl: z
    .string()
    .url('Invalid URL format')
    .optional()
    .or(z.literal('')),
  pin: z
    .string()
    .length(6, 'PIN must be exactly 6 digits')
    .regex(/^\d{6}$/, 'PIN must contain only digits'),
})

export type StudentFormData = z.infer<typeof studentFormSchema>

export interface StudentFormProps {
  student?: Student
  onSubmit: (data: StudentFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

/**
 * StudentForm Component
 */
export function StudentForm({
  student,
  onSubmit,
  onCancel,
  isLoading = false,
}: StudentFormProps) {
  const isEditMode = !!student

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      studentNumber: student?.studentNumber || '',
      name: student?.name || '',
      class: student?.class || '',
      email: student?.email || '',
      phone: student?.phone || '',
      photoUrl: student?.photoUrl || '',
      pin: '',
    },
  })

  const handleFormSubmit = async (data: StudentFormData) => {
    try {
      await onSubmit(data)
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Student Number */}
      <div className="space-y-2">
        <Label htmlFor="studentNumber">
          Student Number <span className="text-red-500">*</span>
        </Label>
        <Input
          id="studentNumber"
          {...register('studentNumber')}
          placeholder="e.g., 2024001"
          disabled={isLoading || isSubmitting}
        />
        {errors.studentNumber && (
          <p className="text-sm text-red-500">{errors.studentNumber.message}</p>
        )}
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Full Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="e.g., John Doe"
          disabled={isLoading || isSubmitting}
        />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      {/* Class */}
      <div className="space-y-2">
        <Label htmlFor="class">
          Class <span className="text-red-500">*</span>
        </Label>
        <Input
          id="class"
          {...register('class')}
          placeholder="e.g., 10A"
          disabled={isLoading || isSubmitting}
        />
        {errors.class && (
          <p className="text-sm text-red-500">{errors.class.message}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Email (Optional)</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          placeholder="student@example.com"
          disabled={isLoading || isSubmitting}
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email.message}</p>
        )}
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone">Phone (Optional)</Label>
        <Input
          id="phone"
          {...register('phone')}
          placeholder="081234567890"
          disabled={isLoading || isSubmitting}
        />
        {errors.phone && (
          <p className="text-sm text-red-500">{errors.phone.message}</p>
        )}
      </div>

      {/* Photo URL */}
      <div className="space-y-2">
        <Label htmlFor="photoUrl">Photo URL (Optional)</Label>
        <Input
          id="photoUrl"
          {...register('photoUrl')}
          placeholder="https://example.com/photo.jpg"
          disabled={isLoading || isSubmitting}
        />
        {errors.photoUrl && (
          <p className="text-sm text-red-500">{errors.photoUrl.message}</p>
        )}
      </div>

      {/* PIN */}
      <div className="space-y-2">
        <Label htmlFor="pin">
          PIN (6 digits) <span className="text-red-500">*</span>
        </Label>
        <Input
          id="pin"
          type="password"
          {...register('pin')}
          placeholder="123456"
          maxLength={6}
          disabled={isLoading || isSubmitting}
        />
        {errors.pin && (
          <p className="text-sm text-red-500">{errors.pin.message}</p>
        )}
        {isEditMode && (
          <p className="text-xs text-muted-foreground">
            Leave blank to keep current PIN
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading || isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || isSubmitting}>
          {isLoading || isSubmitting
            ? 'Saving...'
            : isEditMode
              ? 'Update Student'
              : 'Create Student'}
        </Button>
      </div>
    </form>
  )
}
