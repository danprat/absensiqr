/**
 * Student PIN Setup Page
 * 
 * Interface for students to setup or change their PIN
 * Used for first-time setup or PIN reset
 */

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { setupPin, getStudentToken, type StudentPinSetup } from '@/services/studentPortal'
import { ApiClientError } from '@/services/api'

/**
 * PIN validation rules
 */
const PIN_LENGTH = 6
const PIN_PATTERN = /^\d{6}$/

/**
 * Student Setup PIN Component
 * Handles PIN creation/change with validation
 */
const SetupPin: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  
  // Form state
  const [pinData, setPinData] = useState<StudentPinSetup>({
    newPin: '',
    confirmPin: '',
  })
  
  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [showPins, setShowPins] = useState({
    newPin: false,
    confirmPin: false,
  })
  const [errors, setErrors] = useState<Partial<StudentPinSetup>>({})

  /**
   * Validate form inputs
   */
  const validateForm = (): boolean => {
    const newErrors: Partial<StudentPinSetup> = {}
    
    // Validate new PIN
    if (!pinData.newPin) {
      newErrors.newPin = 'PIN baru wajib diisi'
    } else if (pinData.newPin.length !== PIN_LENGTH) {
      newErrors.newPin = `PIN harus ${PIN_LENGTH} digit`
    } else if (!PIN_PATTERN.test(pinData.newPin)) {
      newErrors.newPin = 'PIN harus berupa angka'
    }
    
    // Validate confirmation PIN
    if (!pinData.confirmPin) {
      newErrors.confirmPin = 'Konfirmasi PIN wajib diisi'
    } else if (pinData.confirmPin !== pinData.newPin) {
      newErrors.confirmPin = 'PIN tidak cocok'
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
    
    const token = getStudentToken()
    
    if (!token) {
      toast({
        title: 'Sesi Berakhir',
        description: 'Silakan login kembali',
        variant: 'destructive',
      })
      navigate('/student/login')
      return
    }
    
    setIsLoading(true)
    
    try {
      await setupPin(pinData, token)
      
      // Show success toast
      toast({
        title: 'PIN Berhasil Diatur',
        description: 'PIN Anda telah berhasil diperbarui',
      })
      
      // Navigate back to attendance page
      navigate('/student/attendance')
    } catch (error) {
      console.error('Setup PIN error:', error)
      
      let errorMessage = 'Terjadi kesalahan saat mengatur PIN'
      
      if (error instanceof ApiClientError) {
        if (error.status === 401) {
          errorMessage = 'Sesi Anda telah berakhir. Silakan login kembali'
          setTimeout(() => navigate('/student/login'), 2000)
        } else if (error.status === 400) {
          errorMessage = 'Data tidak valid. Pastikan PIN sesuai format'
        } else {
          errorMessage = error.message
        }
      }
      
      toast({
        title: 'Setup PIN Gagal',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle numeric PIN input
   */
  const handlePinChange = (field: keyof StudentPinSetup) => (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const value = e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH)
    
    setPinData(prev => ({
      ...prev,
      [field]: value,
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
   * Toggle PIN visibility
   */
  const toggleShowPin = (field: keyof typeof showPins): void => {
    setShowPins(prev => ({
      ...prev,
      [field]: !prev[field],
    }))
  }

  /**
   * Calculate PIN strength
   */
  const getPinStrength = (): { level: number; text: string; color: string } => {
    if (pinData.newPin.length < PIN_LENGTH) {
      return { level: 0, text: '', color: '' }
    }
    
    const uniqueDigits = new Set(pinData.newPin).size
    const isSequential = /012|123|234|345|456|567|678|789/.test(pinData.newPin) ||
                        /987|876|765|654|543|432|321|210/.test(pinData.newPin)
    const isRepeating = /(.)\1{2,}/.test(pinData.newPin)
    
    if (isSequential || isRepeating) {
      return { level: 1, text: 'Lemah', color: 'text-red-500' }
    }
    
    if (uniqueDigits <= 3) {
      return { level: 2, text: 'Sedang', color: 'text-yellow-500' }
    }
    
    return { level: 3, text: 'Kuat', color: 'text-green-500' }
  }

  const pinStrength = getPinStrength()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Atur PIN
          </CardTitle>
          <CardDescription className="text-center">
            Buat PIN 6 digit untuk akun Anda
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New PIN Input */}
            <div className="space-y-2">
              <Label htmlFor="newPin">PIN Baru (6 digit)</Label>
              <div className="relative">
                <Input
                  id="newPin"
                  type={showPins.newPin ? 'text' : 'password'}
                  placeholder="000000"
                  value={pinData.newPin}
                  onChange={handlePinChange('newPin')}
                  disabled={isLoading}
                  className={errors.newPin ? 'border-red-500' : ''}
                  maxLength={PIN_LENGTH}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => toggleShowPin('newPin')}
                  disabled={isLoading}
                >
                  <span className="text-xs">
                    {showPins.newPin ? 'Sembunyikan' : 'Tampilkan'}
                  </span>
                </Button>
              </div>
              {errors.newPin && (
                <p className="text-sm text-red-500">{errors.newPin}</p>
              )}
              {pinStrength.level > 0 && (
                <p className={`text-sm ${pinStrength.color}`}>
                  Kekuatan PIN: {pinStrength.text}
                </p>
              )}
            </div>

            {/* Confirm PIN Input */}
            <div className="space-y-2">
              <Label htmlFor="confirmPin">Konfirmasi PIN</Label>
              <div className="relative">
                <Input
                  id="confirmPin"
                  type={showPins.confirmPin ? 'text' : 'password'}
                  placeholder="000000"
                  value={pinData.confirmPin}
                  onChange={handlePinChange('confirmPin')}
                  disabled={isLoading}
                  className={errors.confirmPin ? 'border-red-500' : ''}
                  maxLength={PIN_LENGTH}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => toggleShowPin('confirmPin')}
                  disabled={isLoading}
                >
                  <span className="text-xs">
                    {showPins.confirmPin ? 'Sembunyikan' : 'Tampilkan'}
                  </span>
                </Button>
              </div>
              {errors.confirmPin && (
                <p className="text-sm text-red-500">{errors.confirmPin}</p>
              )}
              {pinData.confirmPin.length === PIN_LENGTH && 
               pinData.confirmPin === pinData.newPin && (
                <p className="text-sm text-green-500">
                  ✓ PIN cocok
                </p>
              )}
            </div>

            {/* PIN Guidelines */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800 font-medium mb-2">Tips PIN yang Aman:</p>
              <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                <li>Hindari urutan angka (123456, 654321)</li>
                <li>Hindari angka yang sama berulang (111111, 000000)</li>
                <li>Gunakan kombinasi angka yang sulit ditebak</li>
                <li>Jangan bagikan PIN Anda kepada siapapun</li>
              </ul>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Memproses...' : 'Simpan PIN'}
            </Button>

            {/* Cancel Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => navigate(-1)}
              disabled={isLoading}
            >
              Batal
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default SetupPin
