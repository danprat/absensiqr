/**
 * TeacherForm Component
 * 
 * Form for creating and editing teacher records with class assignment
 */

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import type { Teacher } from '@/services/teachers'

/**
 * Form validation schema
 */
const teacherFormSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .min(1, 'Email is required'),
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(255, 'Name must be at most 255 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .optional()
    .or(z.literal('')),
})

export type TeacherFormData = z.infer<typeof teacherFormSchema> & {
  classes?: string[]
}

export interface TeacherFormProps {
  teacher?: Teacher
  availableClasses?: string[]
  onSubmit: (data: TeacherFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

/**
 * TeacherForm Component
 */
export function TeacherForm({
  teacher,
  availableClasses = [],
  onSubmit,
  onCancel,
  isLoading = false,
}: TeacherFormProps) {
  const isEditMode = !!teacher
  
  // State for class management
  const [selectedClasses, setSelectedClasses] = useState<string[]>(
    teacher?.classes || []
  )
  const [classInput, setClassInput] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Omit<TeacherFormData, 'classes'>>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: {
      email: teacher?.email || '',
      name: teacher?.name || '',
      password: '',
    },
  })

  const handleFormSubmit = async (data: Omit<TeacherFormData, 'classes'>) => {
    try {
      const submitData: TeacherFormData = {
        ...data,
        classes: selectedClasses,
      }
      
      // Remove password if empty in edit mode
      if (isEditMode && !submitData.password) {
        delete submitData.password
      }
      
      await onSubmit(submitData)
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const handleAddClass = (className: string) => {
    const trimmedClass = className.trim()
    if (trimmedClass && !selectedClasses.includes(trimmedClass)) {
      setSelectedClasses([...selectedClasses, trimmedClass])
      setClassInput('')
    }
  }

  const handleRemoveClass = (className: string) => {
    setSelectedClasses(selectedClasses.filter((c) => c !== className))
  }

  const handleClassKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddClass(classInput)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">
          Email <span className="text-red-500">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          placeholder="teacher@example.com"
          disabled={isLoading || isSubmitting}
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email.message}</p>
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

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="password">
          Password {!isEditMode && <span className="text-red-500">*</span>}
        </Label>
        <Input
          id="password"
          type="password"
          {...register('password')}
          placeholder="Min. 8 characters"
          disabled={isLoading || isSubmitting}
        />
        {errors.password && (
          <p className="text-sm text-red-500">{errors.password.message}</p>
        )}
        {isEditMode && (
          <p className="text-xs text-muted-foreground">
            Leave blank to keep current password
          </p>
        )}
      </div>

      {/* Class Assignment */}
      <div className="space-y-2">
        <Label htmlFor="classes">Assigned Classes</Label>
        <div className="space-y-2">
          {/* Class input */}
          <div className="flex gap-2">
            <Input
              id="classes"
              value={classInput}
              onChange={(e) => setClassInput(e.target.value)}
              onKeyPress={handleClassKeyPress}
              placeholder="Type class name and press Enter (e.g., 10A, 11B)"
              disabled={isLoading || isSubmitting}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => handleAddClass(classInput)}
              disabled={isLoading || isSubmitting || !classInput.trim()}
            >
              Add
            </Button>
          </div>

          {/* Available classes as quick add buttons */}
          {availableClasses.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Quick add (click to add):
              </p>
              <div className="flex flex-wrap gap-2">
                {availableClasses
                  .filter((cls) => !selectedClasses.includes(cls))
                  .map((cls) => (
                    <Button
                      key={cls}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddClass(cls)}
                      disabled={isLoading || isSubmitting}
                    >
                      {cls}
                    </Button>
                  ))}
              </div>
            </div>
          )}

          {/* Selected classes */}
          {selectedClasses.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Selected classes ({selectedClasses.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedClasses.map((cls) => (
                  <Badge
                    key={cls}
                    variant="default"
                    className="flex items-center gap-1 pr-1"
                  >
                    {cls}
                    <button
                      type="button"
                      onClick={() => handleRemoveClass(cls)}
                      disabled={isLoading || isSubmitting}
                      className="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
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
              ? 'Update Teacher'
              : 'Create Teacher'}
        </Button>
      </div>
    </form>
  )
}
