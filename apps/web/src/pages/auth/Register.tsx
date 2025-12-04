/**
 * Register Page
 * 
 * School registration page for new organizations
 */

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { register as registerApi, saveAuthData } from '@/services/auth'
import { useSetAtom } from 'jotai'
import { userAtom, schoolAtom, tokenAtom } from '@/hooks/useAuth'

// Validation schema
const registerSchema = z.object({
  schoolName: z
    .string()
    .min(1, 'School name is required')
    .min(3, 'School name must be at least 3 characters'),
  schoolAddress: z
    .string()
    .min(1, 'School address is required')
    .min(10, 'Please provide a complete address'),
  schoolPhone: z
    .string()
    .min(1, 'School phone is required')
    .regex(/^[0-9+\-\s()]+$/, 'Invalid phone number format'),
  adminName: z
    .string()
    .min(1, 'Admin name is required')
    .min(2, 'Name must be at least 2 characters'),
  adminEmail: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  adminPassword: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.adminPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type RegisterFormData = z.infer<typeof registerSchema>

export default function Register() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const setUser = useSetAtom(userAtom)
  const setSchool = useSetAtom(schoolAtom)
  const setToken = useSetAtom(tokenAtom)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    setError(null)
    setIsLoading(true)

    try {
      // Remove confirmPassword from the payload
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirmPassword, ...registrationData } = data
      
      const response = await registerApi(registrationData)
      
      // Save auth data
      saveAuthData(response)
      setToken(response.tokens.accessToken)
      setUser(response.user)
      setSchool(response.school)
      
      // Navigate to dashboard
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Register Your School
          </CardTitle>
          <CardDescription className="text-center">
            Create an account to start using AbsensiQR
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                {error}
              </Alert>
            )}

            {/* School Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">School Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="schoolName">School Name *</Label>
                <Input
                  id="schoolName"
                  type="text"
                  placeholder="e.g., SDN 1 Jakarta"
                  {...register('schoolName')}
                  disabled={isLoading}
                />
                {errors.schoolName && (
                  <p className="text-sm text-red-600">{errors.schoolName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="schoolAddress">School Address *</Label>
                <Input
                  id="schoolAddress"
                  type="text"
                  placeholder="Complete address"
                  {...register('schoolAddress')}
                  disabled={isLoading}
                />
                {errors.schoolAddress && (
                  <p className="text-sm text-red-600">{errors.schoolAddress.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="schoolPhone">School Phone *</Label>
                <Input
                  id="schoolPhone"
                  type="tel"
                  placeholder="e.g., +62 21 1234567"
                  {...register('schoolPhone')}
                  disabled={isLoading}
                />
                {errors.schoolPhone && (
                  <p className="text-sm text-red-600">{errors.schoolPhone.message}</p>
                )}
              </div>
            </div>

            {/* Admin Account */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-semibold">Admin Account</h3>
              
              <div className="space-y-2">
                <Label htmlFor="adminName">Full Name *</Label>
                <Input
                  id="adminName"
                  type="text"
                  placeholder="Your full name"
                  {...register('adminName')}
                  disabled={isLoading}
                />
                {errors.adminName && (
                  <p className="text-sm text-red-600">{errors.adminName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminEmail">Email *</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="admin@school.com"
                  {...register('adminEmail')}
                  disabled={isLoading}
                />
                {errors.adminEmail && (
                  <p className="text-sm text-red-600">{errors.adminEmail.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adminPassword">Password *</Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    placeholder="••••••••"
                    {...register('adminPassword')}
                    disabled={isLoading}
                  />
                  {errors.adminPassword && (
                    <p className="text-sm text-red-600">{errors.adminPassword.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    {...register('confirmPassword')}
                    disabled={isLoading}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Password must be at least 8 characters and contain uppercase, lowercase, and numbers
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>

            <div className="text-center text-sm">
              <span className="text-gray-600">Already have an account? </span>
              <Link
                to="/auth/login"
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
