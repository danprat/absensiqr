/**
 * Dispute Modal Component
 * 
 * Modal for students to submit attendance disputes
 * Includes reason input with validation
 */

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  submitDispute,
  getStudentToken,
  type StudentAttendanceRecord,
} from '@/services/studentPortal'
import { ApiClientError } from '@/services/api'

/**
 * Dispute Modal Props
 */
interface DisputeModalProps {
  isOpen: boolean
  onClose: () => void
  attendance: StudentAttendanceRecord
  onSuccess: () => void
}

/**
 * Minimum and maximum reason length
 */
const MIN_REASON_LENGTH = 10
const MAX_REASON_LENGTH = 1000

/**
 * Format date helper
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Get status label
 */
const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    hadir: 'Hadir',
    alpha: 'Alpha',
    izin: 'Izin',
    sakit: 'Sakit',
  }
  return labels[status] || status
}

/**
 * Dispute Modal Component
 */
const DisputeModal: React.FC<DisputeModalProps> = ({
  isOpen,
  onClose,
  attendance,
  onSuccess,
}) => {
  const { toast } = useToast()
  
  // Form state
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)

  /**
   * Reset form when modal opens/closes
   */
  useEffect(() => {
    if (isOpen) {
      setReason('')
      setError('')
    }
  }, [isOpen])

  /**
   * Validate reason
   */
  const validateReason = (): boolean => {
    if (!reason.trim()) {
      setError('Alasan wajib diisi')
      return false
    }
    
    if (reason.trim().length < MIN_REASON_LENGTH) {
      setError(`Alasan minimal ${MIN_REASON_LENGTH} karakter`)
      return false
    }
    
    if (reason.length > MAX_REASON_LENGTH) {
      setError(`Alasan maksimal ${MAX_REASON_LENGTH} karakter`)
      return false
    }
    
    setError('')
    return true
  }

  /**
   * Handle reason change
   */
  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setReason(e.target.value)
    
    // Clear error when user starts typing
    if (error) {
      setError('')
    }
  }

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    
    if (!validateReason()) {
      return
    }
    
    const token = getStudentToken()
    
    if (!token) {
      toast({
        title: 'Sesi Berakhir',
        description: 'Silakan login kembali',
        variant: 'destructive',
      })
      onClose()
      return
    }
    
    setIsSubmitting(true)
    
    try {
      await submitDispute(
        {
          attendanceId: attendance.id,
          reason: reason.trim(),
        },
        token
      )
      
      toast({
        title: 'Keberatan Berhasil Diajukan',
        description: 'Keberatan Anda akan ditinjau oleh guru',
      })
      
      onSuccess()
    } catch (error) {
      console.error('Submit dispute error:', error)
      
      let errorMessage = 'Gagal mengajukan keberatan'
      
      if (error instanceof ApiClientError) {
        if (error.status === 404) {
          errorMessage = 'Data absensi tidak ditemukan'
        } else if (error.status === 409) {
          errorMessage = 'Keberatan untuk absensi ini sudah pernah diajukan'
        } else if (error.status === 401) {
          errorMessage = 'Sesi Anda telah berakhir'
        } else {
          errorMessage = error.message
        }
      }
      
      toast({
        title: 'Pengajuan Gagal',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * Get remaining characters
   */
  const remainingChars = MAX_REASON_LENGTH - reason.length
  const charsColor = remainingChars < 100 ? 'text-red-500' : 'text-gray-500'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Ajukan Keberatan Absensi</DialogTitle>
            <DialogDescription>
              Jelaskan alasan keberatan Anda terhadap data absensi ini
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Attendance Info */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Tanggal:</span>
                <span className="text-sm font-medium">
                  {formatDate(attendance.date)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <span className="text-sm font-medium">
                  {getStatusLabel(attendance.status)}
                </span>
              </div>
              
              {attendance.scanTime && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Waktu Scan:</span>
                  <span className="text-sm font-medium">
                    {new Date(attendance.scanTime).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Reason Input */}
            <div className="space-y-2">
              <Label htmlFor="reason">
                Alasan Keberatan <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="reason"
                className={`
                  flex min-h-[120px] w-full rounded-md border border-input
                  bg-background px-3 py-2 text-sm ring-offset-background
                  placeholder:text-muted-foreground
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-ring focus-visible:ring-offset-2
                  disabled:cursor-not-allowed disabled:opacity-50
                  resize-none
                  ${error ? 'border-red-500' : ''}
                `}
                placeholder="Jelaskan alasan keberatan Anda secara detail (minimal 10 karakter)..."
                value={reason}
                onChange={handleReasonChange}
                disabled={isSubmitting}
                maxLength={MAX_REASON_LENGTH}
              />
              
              <div className="flex justify-between items-center">
                <div>
                  {error && (
                    <p className="text-sm text-red-500">{error}</p>
                  )}
                </div>
                <p className={`text-xs ${charsColor}`}>
                  {remainingChars} karakter tersisa
                </p>
              </div>
            </div>

            {/* Guidelines */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800 font-medium mb-2">
                Tips mengajukan keberatan:
              </p>
              <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                <li>Jelaskan alasan dengan jelas dan lengkap</li>
                <li>Sertakan bukti atau informasi pendukung jika ada</li>
                <li>Keberatan akan ditinjau oleh guru Anda</li>
                <li>Anda akan mendapat pemberitahuan hasil peninjauan</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
            >
              {isSubmitting ? 'Mengirim...' : 'Ajukan Keberatan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default DisputeModal
