/**
 * Student Login Page
 * 
 * Login interface for students using student number and PIN
 * Separate auth flow from admin/teacher login
 */

import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { studentLogin, saveStudentAuthData, type StudentLoginCredentials } from '@/services/studentPortal'
import { ApiClientError } from '@/services/api'

/**
 * Student Login Component
 * Handles student authentication with student number and PIN
 */
const StudentLogin: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  
  // Form state
  const [credentials, setCredentials] = useState<StudentLoginCredentials>({
    studentNumber: '',
    pin: '',
  })
  
  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [errors, setErrors] = useState<Partial<StudentLoginCredentials>>({})

  /**
   * Validate form inputs
   */
  const validateForm = (): boolean => {
    const newErrors: Partial<StudentLoginCredentials> = {}
    
    if (!credentials.studentNumber.trim()) {
      newErrors.studentNumber = 'Nomor siswa wajib diisi'
    }
    
    if (!credentials.pin) {
      newErrors.pin = 'PIN wajib diisi'
    } else if (credentials.pin.length !== 6) {
      newErrors.pin = 'PIN harus 6 digit'
    } else if (!/^\d{6}$/.test(credentials.pin)) {
      newErrors.pin = 'PIN harus berupa angka'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsLoading(true)
    
    try {
      const response = await studentLogin(credentials)
      
      // Save auth data
      saveStudentAuthData(response)
      
      // Show success toast
      toast({
        title: 'Login Berhasil',
        description: `Selamat datang, ${response.student.name}!`,
      })
      
      // Navigate to student dashboard
      navigate('/student/attendance')
    } catch (error) {
      console.error('Student login error:', error)
      
      let errorMessage = 'Terjadi kesalahan saat login'
      
      if (error instanceof ApiClientError) {
        if (error.status === 401) {
          errorMessage = 'Nomor siswa atau PIN salah'
        } else if (error.status === 403) {
          errorMessage = 'Akun siswa tidak aktif'
        } else {
          errorMessage = error.message
        }
      }
      
      toast({
        title: 'Login Gagal',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle input changes
   */
  const handleChange = (field: keyof StudentLoginCredentials) => (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    setCredentials(prev => ({
      ...prev,
      [field]: e.target.value,
    }))
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }))
    }
  }

  /**
   * Handle PIN input with numeric validation
   */
  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCredentials(prev => ({
      ...prev,
      pin: value,
    }))
    
    // Clear error for PIN field
    if (errors.pin) {
      setErrors(prev => ({
        ...prev,
        pin: undefined,
      }))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Portal Siswa
          </CardTitle>
          <CardDescription className="text-center">
            Masuk dengan nomor siswa dan PIN Anda
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Student Number Input */}
            <div className="space-y-2">
              <Label htmlFor="studentNumber">Nomor Siswa</Label>
              <Input
                id="studentNumber"
                type="text"
                placeholder="Contoh: 2024001"
                value={credentials.studentNumber}
                onChange={handleChange('studentNumber')}
                disabled={isLoading}
                className={errors.studentNumber ? 'border-red-500' : ''}
                autoComplete="username"
              />
              {errors.studentNumber && (
                <p className="text-sm text-red-500">{errors.studentNumber}</p>
              )}
            </div>

            {/* PIN Input */}
            <div className="space-y-2">
              <Label htmlFor="pin">PIN (6 digit)</Label>
              <div className="relative">
                <Input
                  id="pin"
                  type={showPin ? 'text' : 'password'}
                  placeholder="000000"
                  value={credentials.pin}
                  onChange={handlePinChange}
                  disabled={isLoading}
                  className={errors.pin ? 'border-red-500' : ''}
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPin(!showPin)}
                  disabled={isLoading}
                >
                  {showPin ? (
                    <span className="text-xs">Sembunyikan</span>
                  ) : (
                    <span className="text-xs">Tampilkan</span>
                  )}
                </Button>
              </div>
              {errors.pin && (
                <p className="text-sm text-red-500">{errors.pin}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Memproses...' : 'Masuk'}
            </Button>

            {/* Help Text */}
            <div className="text-center text-sm text-gray-600 space-y-2">
              <p>
                Lupa PIN? Hubungi guru atau admin sekolah Anda.
              </p>
              <div className="pt-4 border-t">
                <Link 
                  to="/auth/login" 
                  className="text-primary hover:underline"
                >
                  Masuk sebagai Guru/Admin
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default StudentLogin
