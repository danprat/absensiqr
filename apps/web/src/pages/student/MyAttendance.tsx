/**
 * My Attendance Page (Student Portal)
 * 
 * Student self-service page to view their own attendance records
 * Includes ability to submit disputes for attendance records
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  getMyAttendance,
  getMyDisputes,
  getStudentToken,
  getSavedStudentInfo,
  clearStudentAuthData,
  type StudentAttendanceRecord,
  type DisputeRecord,
  type AttendanceFilters,
} from '@/services/studentPortal'
import { ApiClientError } from '@/services/api'
import DisputeModal from '@/components/student/DisputeModal'

/**
 * Status badge styling
 */
const getStatusBadge = (status: string): { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string } => {
  switch (status) {
    case 'hadir':
      return { variant: 'default', label: 'Hadir' }
    case 'izin':
      return { variant: 'secondary', label: 'Izin' }
    case 'sakit':
      return { variant: 'secondary', label: 'Sakit' }
    case 'alpha':
      return { variant: 'destructive', label: 'Alpha' }
    default:
      return { variant: 'outline', label: status }
  }
}

/**
 * Format date to Indonesian locale
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
 * Format time
 */
const formatTime = (timeString: string | null): string => {
  if (!timeString) return '-'
  const time = new Date(timeString)
  return time.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * My Attendance Component
 */
const MyAttendance: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  
  // Auth state
  const [studentInfo] = useState(getSavedStudentInfo())
  const [token] = useState(getStudentToken())
  
  // Data state
  const [attendance, setAttendance] = useState<StudentAttendanceRecord[]>([])
  const [disputes, setDisputes] = useState<DisputeRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Filter state
  const [filters] = useState<AttendanceFilters>({
    limit: 30,
    offset: 0,
  })
  
  // Modal state
  const [selectedAttendance, setSelectedAttendance] = useState<StudentAttendanceRecord | null>(null)
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false)

  /**
   * Check authentication
   */
  useEffect(() => {
    if (!token || !studentInfo) {
      toast({
        title: 'Sesi Berakhir',
        description: 'Silakan login kembali',
        variant: 'destructive',
      })
      navigate('/student/login')
    }
  }, [token, studentInfo, navigate, toast])

  /**
   * Fetch attendance data
   */
  const fetchAttendance = useCallback(async (showLoader = true): Promise<void> => {
    if (!token) return
    
    if (showLoader) {
      setIsLoading(true)
    } else {
      setIsRefreshing(true)
    }
    
    try {
      const [attendanceResponse, disputesResponse] = await Promise.all([
        getMyAttendance(filters, token),
        getMyDisputes(token),
      ])
      
      setAttendance(attendanceResponse.attendance)
      setDisputes(disputesResponse.disputes)
    } catch (error) {
      console.error('Fetch attendance error:', error)
      
      let errorMessage = 'Gagal memuat data absensi'
      
      if (error instanceof ApiClientError) {
        if (error.status === 401) {
          errorMessage = 'Sesi Anda telah berakhir'
          clearStudentAuthData()
          setTimeout(() => navigate('/student/login'), 2000)
        } else {
          errorMessage = error.message
        }
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [token, filters, navigate, toast])

  /**
   * Initial data load
   */
  useEffect(() => {
    fetchAttendance()
  }, [fetchAttendance])

  /**
   * Handle logout
   */
  const handleLogout = (): void => {
    clearStudentAuthData()
    toast({
      title: 'Logout Berhasil',
      description: 'Anda telah keluar dari sistem',
    })
    navigate('/student/login')
  }

  /**
   * Open dispute modal
   */
  const handleOpenDispute = (record: StudentAttendanceRecord): void => {
    setSelectedAttendance(record)
    setIsDisputeModalOpen(true)
  }

  /**
   * Close dispute modal
   */
  const handleCloseDispute = (): void => {
    setSelectedAttendance(null)
    setIsDisputeModalOpen(false)
  }

  /**
   * Handle dispute submission success
   */
  const handleDisputeSubmitted = (): void => {
    handleCloseDispute()
    // Refresh data to show new dispute
    fetchAttendance(false)
  }

  /**
   * Get dispute for attendance record
   */
  const getDisputeForRecord = (attendanceId: string): DisputeRecord | undefined => {
    return disputes.find(dispute => dispute.attendanceId === attendanceId)
  }

  /**
   * Calculate attendance summary
   */
  const getAttendanceSummary = () => {
    const summary = {
      total: attendance.length,
      hadir: 0,
      izin: 0,
      sakit: 0,
      alpha: 0,
    }
    
    attendance.forEach(record => {
      summary[record.status]++
    })
    
    return summary
  }

  const summary = getAttendanceSummary()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Portal Siswa
              </h1>
              {studentInfo && (
                <p className="text-sm text-gray-600">
                  {studentInfo.name} ({studentInfo.studentNumber}) - Kelas {studentInfo.class}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('/student/setup-pin')}
              >
                Ubah PIN
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                Keluar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total</CardDescription>
              <CardTitle className="text-3xl">{summary.total}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Hadir</CardDescription>
              <CardTitle className="text-3xl text-green-600">{summary.hadir}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Izin</CardDescription>
              <CardTitle className="text-3xl text-blue-600">{summary.izin}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Sakit</CardDescription>
              <CardTitle className="text-3xl text-yellow-600">{summary.sakit}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Alpha</CardDescription>
              <CardTitle className="text-3xl text-red-600">{summary.alpha}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Attendance List */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Riwayat Absensi</CardTitle>
                <CardDescription>Daftar absensi Anda</CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => fetchAttendance(false)}
                disabled={isRefreshing}
              >
                {isRefreshing ? 'Memperbarui...' : 'Perbarui'}
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            {attendance.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Belum ada data absensi</p>
              </div>
            ) : (
              <div className="space-y-4">
                {attendance.map((record) => {
                  const statusBadge = getStatusBadge(record.status)
                  const dispute = getDisputeForRecord(record.id)
                  
                  return (
                    <div
                      key={record.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant={statusBadge.variant}>
                              {statusBadge.label}
                            </Badge>
                            {record.syncedFromOffline && (
                              <Badge variant="outline" className="text-xs">
                                Offline
                              </Badge>
                            )}
                            {dispute && (
                              <Badge
                                variant={
                                  dispute.status === 'pending'
                                    ? 'secondary'
                                    : dispute.status === 'approved'
                                    ? 'default'
                                    : 'destructive'
                                }
                                className="text-xs"
                              >
                                Dispute: {dispute.status}
                              </Badge>
                            )}
                          </div>
                          
                          <p className="font-medium text-gray-900 mb-1">
                            {formatDate(record.date)}
                          </p>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>Waktu Scan: {formatTime(record.scanTime)}</p>
                            {record.notes && (
                              <p>Catatan: {record.notes}</p>
                            )}
                            {dispute?.teacherNotes && (
                              <p className="text-blue-600">
                                Catatan Guru: {dispute.teacherNotes}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          {!dispute && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDispute(record)}
                            >
                              Ajukan Keberatan
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dispute Modal */}
      {selectedAttendance && (
        <DisputeModal
          isOpen={isDisputeModalOpen}
          onClose={handleCloseDispute}
          attendance={selectedAttendance}
          onSuccess={handleDisputeSubmitted}
        />
      )}
    </div>
  )
}

export default MyAttendance
