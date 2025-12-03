/**
 * History Page
 * View and filter attendance history records
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { attendanceService } from '@/services/attendance'
import { AttendanceTable } from '@/components/attendance/AttendanceTable'
import {
  AttendanceFilters,
  type AttendanceFilterValues,
} from '@/components/attendance/AttendanceFilters'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type {
  AttendanceHistoryRecord,
  AttendanceHistoryResponse,
  AttendanceStatus,
} from '@/services/attendance'
import { Calendar, FileText, User, Clock, CheckCircle2, XCircle, AlertCircle, Activity } from 'lucide-react'

/**
 * Status configuration for detail view
 */
const statusConfig: Record<
  AttendanceStatus,
  { label: string; icon: React.ElementType; color: string }
> = {
  hadir: { label: 'Hadir', icon: CheckCircle2, color: 'text-green-600 dark:text-green-400' },
  alpha: { label: 'Alpha', icon: XCircle, color: 'text-red-600 dark:text-red-400' },
  izin: { label: 'Izin', icon: AlertCircle, color: 'text-yellow-600 dark:text-yellow-400' },
  sakit: { label: 'Sakit', icon: Activity, color: 'text-blue-600 dark:text-blue-400' },
}

/**
 * History Page Component
 * Displays attendance history with filtering and export capabilities
 */
export const History: React.FC = () => {
  const { token } = useAuth()
  const { toast } = useToast()

  // State
  const [records, setRecords] = useState<AttendanceHistoryRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [filters, setFilters] = useState<AttendanceFilterValues>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const [selectedRecord, setSelectedRecord] = useState<AttendanceHistoryRecord | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)

  // Pagination limit
  const LIMIT = 20

  /**
   * Fetch attendance history
   */
  const fetchHistory = useCallback(
    async (page: number = 1): Promise<void> => {
      if (!token) return

      setIsLoading(true)

      try {
        const response: AttendanceHistoryResponse = await attendanceService.getAttendanceHistory(
          token,
          {
            ...filters,
            page,
            limit: LIMIT,
          }
        )

        setRecords(response.data)
        setCurrentPage(response.pagination.page)
        setTotalPages(response.pagination.totalPages)
        setTotalRecords(response.pagination.total)
      } catch (error) {
        console.error('Failed to fetch attendance history:', error)
        toast({
          title: 'Error',
          description: 'Failed to load attendance history. Please try again.',
          variant: 'destructive',
        })
        setRecords([])
      } finally {
        setIsLoading(false)
      }
    },
    [token, filters, toast]
  )

  /**
   * Handle filters change
   */
  const handleFiltersChange = (newFilters: AttendanceFilterValues): void => {
    setFilters(newFilters)
  }

  /**
   * Apply filters and fetch data
   */
  const handleApplyFilters = (): void => {
    setCurrentPage(1)
    fetchHistory(1)
  }

  /**
   * Reset filters
   */
  const handleResetFilters = (): void => {
    setFilters({})
    setCurrentPage(1)
    fetchHistory(1)
  }

  /**
   * Handle page change
   */
  const handlePageChange = (page: number): void => {
    setCurrentPage(page)
    fetchHistory(page)
  }

  /**
   * Handle row click to show details
   */
  const handleRowClick = (record: AttendanceHistoryRecord): void => {
    setSelectedRecord(record)
    setShowDetailDialog(true)
  }

  /**
   * Export attendance data to CSV
   */
  const handleExport = async (): Promise<void> => {
    if (!token || records.length === 0) {
      toast({
        title: 'No data to export',
        description: 'Please apply filters to get data before exporting.',
        variant: 'destructive',
      })
      return
    }

    setIsExporting(true)

    try {
      // Fetch all records for export (without pagination)
      const response: AttendanceHistoryResponse = await attendanceService.getAttendanceHistory(
        token,
        {
          ...filters,
          limit: 10000, // High limit to get all records
        }
      )

      // Convert to CSV
      const csvContent = convertToCSV(response.data)

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)

      link.setAttribute('href', url)
      link.setAttribute('download', `attendance-history-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: 'Export successful',
        description: `Exported ${response.data.length} records to CSV.`,
      })
    } catch (error) {
      console.error('Failed to export:', error)
      toast({
        title: 'Export failed',
        description: 'Failed to export data. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }

  /**
   * Convert records to CSV format
   */
  const convertToCSV = (data: AttendanceHistoryRecord[]): string => {
    const headers = ['Date', 'Student Name', 'Student Number', 'Class', 'Status', 'Scan Time', 'Notes', 'Synced Offline']
    const rows = data.map((record) => [
      record.date,
      record.student.name,
      record.student.studentNumber,
      record.student.class,
      record.status.toUpperCase(),
      new Date(record.scanTime).toLocaleString('id-ID'),
      record.notes || '',
      record.syncedFromOffline ? 'Yes' : 'No',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    return csvContent
  }

  /**
   * Format date for display
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  /**
   * Format time for display
   */
  const formatTime = (dateTimeString: string): string => {
    const date = new Date(dateTimeString)
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  // Load initial data
  useEffect(() => {
    fetchHistory(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Attendance History</h1>
        <p className="text-muted-foreground mt-2">
          View and filter attendance records. Click on a row to see details.
        </p>
      </div>

      {/* Filters */}
      <AttendanceFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
        onExport={handleExport}
        isExporting={isExporting}
        isLoading={isLoading}
      />

      {/* Table */}
      <AttendanceTable
        records={records}
        isLoading={isLoading}
        onRowClick={handleRowClick}
        currentPage={currentPage}
        totalPages={totalPages}
        totalRecords={totalRecords}
        onPageChange={handlePageChange}
      />

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Attendance Details</DialogTitle>
            <DialogDescription>
              Complete information about this attendance record
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-6 py-4">
              {/* Student Info */}
              <div className="flex items-start gap-4">
                {selectedRecord.student.photoUrl ? (
                  <img
                    src={selectedRecord.student.photoUrl}
                    alt={selectedRecord.student.name}
                    className="h-20 w-20 rounded-full object-cover border-2"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted border-2 text-2xl font-bold text-muted-foreground">
                    {selectedRecord.student.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 space-y-1">
                  <h3 className="text-xl font-bold">{selectedRecord.student.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{selectedRecord.student.studentNumber}</span>
                    <span>•</span>
                    <span className="font-semibold">{selectedRecord.student.class}</span>
                  </div>
                </div>
              </div>

              {/* Attendance Details */}
              <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
                {/* Date */}
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Date</p>
                    <p className="text-base font-semibold">{formatDate(selectedRecord.date)}</p>
                  </div>
                </div>

                {/* Time */}
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Scan Time</p>
                    <p className="text-base font-semibold">{formatTime(selectedRecord.scanTime)}</p>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-start gap-3">
                  <Activity className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <div className="mt-1 flex items-center gap-2">
                      {(() => {
                        const config = statusConfig[selectedRecord.status]
                        const Icon = config.icon
                        return (
                          <>
                            <Icon className={`h-5 w-5 ${config.color}`} />
                            <span className="text-base font-semibold">{config.label}</span>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selectedRecord.notes && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">Notes</p>
                      <p className="text-base mt-1">{selectedRecord.notes}</p>
                    </div>
                  </div>
                )}

                {/* Offline Sync Badge */}
                {selectedRecord.syncedFromOffline && (
                  <div className="pt-2 border-t">
                    <Badge variant="outline" className="text-blue-600 border-blue-600">
                      <Activity className="mr-1 h-3 w-3" />
                      Synced from Offline
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default History
