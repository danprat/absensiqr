/**
 * Disputes Page
 * View and resolve attendance disputes for teacher's assigned classes
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { disputesService } from '@/services/disputes'
import { DisputeDetail } from '@/components/disputes/DisputeDetail'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  Clock,
  User,
  Calendar,
  Activity,
} from 'lucide-react'
import type {
  Dispute,
  DisputeDetail as DisputeDetailType,
  DisputesListResponse,
  DisputeStatus,
} from '@/services/disputes'
import type { AttendanceStatus } from '@/services/attendance'

/**
 * Status configuration
 */
const disputeStatusConfig: Record<
  DisputeStatus | 'all',
  { label: string; color: string; icon?: React.ElementType }
> = {
  all: { label: 'All Disputes', color: '' },
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    icon: Clock,
  },
  approved: {
    label: 'Approved',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    icon: XCircle,
  },
}

const attendanceStatusConfig: Record<
  AttendanceStatus,
  { label: string; icon: React.ElementType }
> = {
  hadir: { label: 'Hadir', icon: CheckCircle2 },
  alpha: { label: 'Alpha', icon: XCircle },
  izin: { label: 'Izin', icon: AlertCircle },
  sakit: { label: 'Sakit', icon: Activity },
}

/**
 * Disputes Page Component
 */
export const Disputes: React.FC = () => {
  const { token } = useAuth()
  const { toast } = useToast()

  // State
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isResolving, setIsResolving] = useState<boolean>(false)
  const [statusFilter, setStatusFilter] = useState<DisputeStatus | 'all'>('pending')
  const [selectedDispute, setSelectedDispute] = useState<DisputeDetailType | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState<boolean>(false)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [totalRecords, setTotalRecords] = useState<number>(0)

  // Pagination limit
  const LIMIT = 20

  /**
   * Fetch disputes list
   */
  const fetchDisputes = useCallback(
    async (page: number = 1): Promise<void> => {
      if (!token) return

      setIsLoading(true)

      try {
        const response: DisputesListResponse = await disputesService.getDisputes(token, {
          status: statusFilter,
          page,
          limit: LIMIT,
        })

        setDisputes(response.disputes)
        setCurrentPage(response.pagination.page)
        setTotalPages(response.pagination.totalPages)
        setTotalRecords(response.pagination.total)
      } catch (error) {
        console.error('Failed to fetch disputes:', error)
        toast({
          title: 'Error',
          description: 'Failed to load disputes. Please try again.',
          variant: 'destructive',
        })
        setDisputes([])
      } finally {
        setIsLoading(false)
      }
    },
    [token, statusFilter, toast]
  )

  /**
   * Handle status filter change
   */
  const handleStatusFilterChange = (value: string): void => {
    setStatusFilter(value as DisputeStatus | 'all')
    setCurrentPage(1)
  }

  /**
   * Handle view dispute details
   */
  const handleViewDetails = async (dispute: Dispute): Promise<void> => {
    if (!token) return

    try {
      const response = await disputesService.getDispute(token, dispute.id)
      setSelectedDispute(response.dispute)
      setShowDetailDialog(true)
    } catch (error) {
      console.error('Failed to fetch dispute details:', error)
      toast({
        title: 'Error',
        description: 'Failed to load dispute details. Please try again.',
        variant: 'destructive',
      })
    }
  }

  /**
   * Handle resolve dispute
   */
  const handleResolveDispute = async (
    id: string,
    status: 'approved' | 'rejected',
    notes: string
  ): Promise<void> => {
    if (!token) return

    setIsResolving(true)

    try {
      await disputesService.resolveDispute(token, id, {
        status,
        teacherNotes: notes,
      })

      toast({
        title: 'Success',
        description: `Dispute ${status} successfully.`,
      })

      // Refresh disputes list
      await fetchDisputes(currentPage)
      
      // Close dialog
      setShowDetailDialog(false)
      setSelectedDispute(null)
    } catch (error) {
      console.error('Failed to resolve dispute:', error)
      toast({
        title: 'Error',
        description: 'Failed to resolve dispute. Please try again.',
        variant: 'destructive',
      })
      throw error // Re-throw to prevent dialog from closing
    } finally {
      setIsResolving(false)
    }
  }

  /**
   * Handle page change
   */
  const handlePageChange = (page: number): void => {
    setCurrentPage(page)
    fetchDisputes(page)
  }

  /**
   * Format date for display
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  /**
   * Format time for display
   */
  const formatDateTime = (dateTimeString: string): string => {
    const date = new Date(dateTimeString)
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  /**
   * Load initial data and refresh when filter changes
   */
  useEffect(() => {
    fetchDisputes(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  /**
   * Count disputes by status for stats
   */
  const pendingCount = disputes.filter((d) => d.status === 'pending').length
  const approvedCount = disputes.filter((d) => d.status === 'approved').length
  const rejectedCount = disputes.filter((d) => d.status === 'rejected').length

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Disputes Management</h1>
          <p className="text-muted-foreground mt-2">
            Review and resolve attendance disputes from students
          </p>
        </div>
        <Button
          onClick={() => fetchDisputes(currentPage)}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {statusFilter === 'all' && totalRecords > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{approvedCount}</div>
              <p className="text-xs text-muted-foreground">Disputes approved</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rejectedCount}</div>
              <p className="text-xs text-muted-foreground">Disputes rejected</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Disputes</CardTitle>
          <CardDescription>Filter disputes by status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-64">
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Disputes</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {disputes.length} of {totalRecords} disputes
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disputes Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {disputeStatusConfig[statusFilter].label}
            {statusFilter === 'pending' && pendingCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingCount} pending
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {statusFilter === 'pending'
              ? 'Review and resolve pending disputes'
              : `View ${statusFilter === 'all' ? 'all' : statusFilter} disputes`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : disputes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No disputes found</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {statusFilter === 'pending'
                  ? "There are no pending disputes at the moment. Great job!"
                  : `No ${statusFilter === 'all' ? '' : statusFilter} disputes found.`}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Attendance Date</TableHead>
                    <TableHead>Attendance Status</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {disputes.map((dispute) => {
                    const statusConfig = disputeStatusConfig[dispute.status]
                    const StatusIcon = statusConfig.icon
                    const attendanceConfig = attendanceStatusConfig[dispute.attendance.status]
                    const AttendanceIcon = attendanceConfig.icon

                    return (
                      <TableRow
                        key={dispute.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleViewDetails(dispute)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{dispute.student.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {dispute.student.studentNumber}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">{dispute.student.class}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{formatDate(dispute.attendance.date)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <AttendanceIcon className="h-4 w-4" />
                            <span>{attendanceConfig.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusConfig.color}>
                            {StatusIcon && <StatusIcon className="mr-1 h-3 w-3" />}
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDateTime(dispute.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewDetails(dispute)
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || isLoading}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || isLoading}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dispute Detail Dialog */}
      <DisputeDetail
        dispute={selectedDispute}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        onResolve={handleResolveDispute}
        isResolving={isResolving}
      />
    </div>
  )
}

export default Disputes
