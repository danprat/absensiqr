/**
 * AttendanceTable Component
 * Reusable table for displaying attendance history records
 */

import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { AttendanceHistoryRecord, AttendanceStatus } from '@/services/attendance'
import { CheckCircle2, XCircle, AlertCircle, Activity, ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Props for AttendanceTable component
 */
interface AttendanceTableProps {
  /** List of attendance records to display */
  records: AttendanceHistoryRecord[]
  /** Whether data is currently loading */
  isLoading?: boolean
  /** Callback when a row is clicked */
  onRowClick?: (record: AttendanceHistoryRecord) => void
  /** Current page number */
  currentPage?: number
  /** Total number of pages */
  totalPages?: number
  /** Total number of records */
  totalRecords?: number
  /** Callback for page change */
  onPageChange?: (page: number) => void
}

/**
 * Status badge configuration with colors
 */
const statusConfig: Record<
  AttendanceStatus,
  { 
    label: string
    className: string
    icon: React.ElementType
  }
> = {
  hadir: { 
    label: 'Hadir', 
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-800',
    icon: CheckCircle2 
  },
  alpha: { 
    label: 'Alpha', 
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-800',
    icon: XCircle 
  },
  izin: { 
    label: 'Izin', 
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800',
    icon: AlertCircle 
  },
  sakit: { 
    label: 'Sakit', 
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800',
    icon: Activity 
  },
}

/**
 * Format date to Indonesian locale
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Format time to Indonesian locale
 */
const formatTime = (dateTimeString: string): string => {
  const date = new Date(dateTimeString)
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * AttendanceTable Component
 * Displays attendance records in a table format with pagination
 */
export const AttendanceTable: React.FC<AttendanceTableProps> = ({
  records,
  isLoading = false,
  onRowClick,
  currentPage = 1,
  totalPages = 1,
  totalRecords = 0,
  onPageChange,
}) => {
  /**
   * Render status badge with color
   */
  const renderStatusBadge = (status: AttendanceStatus): JSX.Element => {
    const config = statusConfig[status]
    const Icon = config.icon
    return (
      <Badge className={config.className}>
        <Icon className="mr-1 h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  /**
   * Handle row click
   */
  const handleRowClick = (record: AttendanceHistoryRecord): void => {
    if (onRowClick) {
      onRowClick(record)
    }
  }

  /**
   * Handle previous page
   */
  const handlePreviousPage = (): void => {
    if (currentPage > 1 && onPageChange) {
      onPageChange(currentPage - 1)
    }
  }

  /**
   * Handle next page
   */
  const handleNextPage = (): void => {
    if (currentPage < totalPages && onPageChange) {
      onPageChange(currentPage + 1)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-sm text-muted-foreground">Loading attendance records...</p>
        </div>
      </div>
    )
  }

  // Empty state
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Activity className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No attendance records found</h3>
        <p className="text-sm text-muted-foreground">
          Try adjusting your filters or select a different date range.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Date</TableHead>
              <TableHead>Student Name</TableHead>
              <TableHead className="w-[120px]">Class</TableHead>
              <TableHead className="w-[100px]">Time</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="hidden md:table-cell">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow
                key={record.id}
                className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : undefined}
                onClick={() => handleRowClick(record)}
              >
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{formatDate(record.date)}</span>
                    {record.syncedFromOffline && (
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        Synced offline
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {record.student.photoUrl ? (
                      <img
                        src={record.student.photoUrl}
                        alt={record.student.name}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                        {record.student.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="font-medium">{record.student.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {record.student.studentNumber}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium">{record.student.class}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-mono">{formatTime(record.scanTime)}</span>
                </TableCell>
                <TableCell>
                  {renderStatusBadge(record.status)}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {record.notes ? (
                    <span className="text-sm text-muted-foreground line-clamp-2">
                      {record.notes}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">No notes</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            Showing page {currentPage} of {totalPages} ({totalRecords} total records)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
