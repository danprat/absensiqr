/**
 * Forgot Password Page
 * 
 * Request password reset link via email
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { forgotPassword } from '@/services/auth'

// Validation schema
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export default function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setError(null)
    setSuccess(false)
    setIsLoading(true)

    try {
      await forgotPassword(data.email)
      setSuccess(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to send reset link. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Forgot Password
          </CardTitle>
          <CardDescription className="text-center">
            Enter your email to receive a password reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <Alert>
                <p className="font-medium">Check your email!</p>
                <p className="text-sm mt-1">
                  We've sent a password reset link to your email address.
                  Please check your inbox and follow the instructions.
                </p>
              </Alert>

              <div className="text-center text-sm">
                <Link
                  to="/auth/login"
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  Back to login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  {error}
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@school.com"
                  {...register('email')}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>

              <div className="text-center text-sm space-y-2">
                <Link
                  to="/auth/login"
                  className="text-blue-600 hover:text-blue-500 font-medium block"
                >
                  Back to login
                </Link>
                <div>
                  <span className="text-gray-600">Don't have an account? </span>
                  <Link
                    to="/auth/register"
                    className="text-blue-600 hover:text-blue-500 font-medium"
                  >
                    Register
                  </Link>
                </div>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
