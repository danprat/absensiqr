/**
 * Audit Log Page
 * 
 * Admin page for viewing and exporting audit logs
 */

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/useToast'
import {
  getAuditLogs,
  getAuditLog,
  exportAuditLogs,
  formatActionType,
  formatEntityType,
  getActionBadgeVariant,
  type AuditLog,
  type AuditLogFilters,
  type AuditAction,
  type AuditEntityType,
} from '@/services/audit'
import {
  FileDown,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertCircle,
} from 'lucide-react'

/**
 * Audit Log Page Component
 */
export function AuditLog() {
  // State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  
  // Filters
  const [selectedAction, setSelectedAction] = useState<AuditAction | ''>('')
  const [selectedEntityType, setSelectedEntityType] = useState<AuditEntityType | ''>('')
  const [userIdFilter, setUserIdFilter] = useState('')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  
  // Dialogs
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  
  // Export loading
  const [isExporting, setIsExporting] = useState(false)
  
  const { toast } = useToast()

  /**
   * Fetch audit logs from API
   */
  const fetchAuditLogs = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const filters: AuditLogFilters = {
        page: currentPage,
        limit: 20,
      }
      
      if (selectedAction) filters.action = selectedAction
      if (selectedEntityType) filters.entityType = selectedEntityType
      if (userIdFilter) filters.userId = userIdFilter
      if (startDateFilter) filters.startDate = new Date(startDateFilter).toISOString()
      if (endDateFilter) filters.endDate = new Date(endDateFilter).toISOString()
      
      const response = await getAuditLogs(filters)
      
      setAuditLogs(response.data)
      setTotalPages(response.pagination.totalPages)
      setTotalCount(response.pagination.total)
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs')
      toast({
        title: 'Error',
        description: 'Failed to fetch audit logs. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, selectedAction, selectedEntityType, userIdFilter, startDateFilter, endDateFilter, toast])

  /**
   * Fetch audit log detail
   */
  const fetchAuditLogDetail = async (id: string) => {
    try {
      setIsLoadingDetail(true)
      const log = await getAuditLog(id)
      setSelectedLog(log)
      setIsDetailDialogOpen(true)
    } catch (err) {
      console.error('Failed to fetch audit log detail:', err)
      toast({
        title: 'Error',
        description: 'Failed to fetch audit log details.',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingDetail(false)
    }
  }

  /**
   * Handle export to CSV
   */
  const handleExport = async () => {
    try {
      setIsExporting(true)
      
      const filters: Omit<AuditLogFilters, 'page' | 'limit'> = {}
      
      if (selectedAction) filters.action = selectedAction
      if (selectedEntityType) filters.entityType = selectedEntityType
      if (userIdFilter) filters.userId = userIdFilter
      if (startDateFilter) filters.startDate = new Date(startDateFilter).toISOString()
      if (endDateFilter) filters.endDate = new Date(endDateFilter).toISOString()
      
      const blobUrl = await exportAuditLogs(filters)
      
      // Create download link
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      // Clean up blob URL
      URL.revokeObjectURL(blobUrl)
      
      toast({
        title: 'Success',
        description: 'Audit logs exported successfully.',
      })
    } catch (err) {
      console.error('Failed to export audit logs:', err)
      toast({
        title: 'Error',
        description: 'Failed to export audit logs. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }

  /**
   * Reset filters
   */
  const handleResetFilters = () => {
    setSelectedAction('')
    setSelectedEntityType('')
    setUserIdFilter('')
    setStartDateFilter('')
    setEndDateFilter('')
    setCurrentPage(1)
  }

  /**
   * Handle pagination
   */
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  /**
   * Format date for display
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  /**
   * Format JSON for display
   */
  const formatJSON = (value: unknown): string => {
    if (value === null || value === undefined) {
      return 'N/A'
    }
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }

  /**
   * Load audit logs on mount and when filters/page change
   */
  useEffect(() => {
    fetchAuditLogs()
  }, [fetchAuditLogs])

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">
            View and export system activity logs
          </p>
        </div>
        <Button
          onClick={handleExport}
          disabled={isExporting || isLoading}
          className="gap-2"
        >
          <FileDown className="h-4 w-4" />
          {isExporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg border p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Action Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Action Type</label>
            <Select
              value={selectedAction}
              onValueChange={(value) => {
                setSelectedAction(value as AuditAction | '')
                setCurrentPage(1)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
                <SelectItem value="password_reset">Password Reset</SelectItem>
                <SelectItem value="bulk_import">Bulk Import</SelectItem>
                <SelectItem value="export">Export</SelectItem>
                <SelectItem value="approve">Approve</SelectItem>
                <SelectItem value="reject">Reject</SelectItem>
                <SelectItem value="scan">Scan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Entity Type Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Entity Type</label>
            <Select
              value={selectedEntityType}
              onValueChange={(value) => {
                setSelectedEntityType(value as AuditEntityType | '')
                setCurrentPage(1)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All entities</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="school">School</SelectItem>
                <SelectItem value="attendance">Attendance</SelectItem>
                <SelectItem value="dispute">Dispute</SelectItem>
                <SelectItem value="class">Class</SelectItem>
                <SelectItem value="export_job">Export Job</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* User ID Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">User ID</label>
            <Input
              placeholder="Filter by user ID..."
              value={userIdFilter}
              onChange={(e) => {
                setUserIdFilter(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>

          {/* Start Date Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Start Date</label>
            <Input
              type="date"
              value={startDateFilter}
              onChange={(e) => {
                setStartDateFilter(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>

          {/* End Date Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">End Date</label>
            <Input
              type="date"
              value={endDateFilter}
              onChange={(e) => {
                setEndDateFilter(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>

          {/* Reset Filters Button */}
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={handleResetFilters}
              className="w-full"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Audit Logs Table */}
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity Type</TableHead>
              <TableHead>Entity ID</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading audit logs...
                </TableCell>
              </TableRow>
            ) : auditLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No audit logs found.
                </TableCell>
              </TableRow>
            ) : (
              auditLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-sm">
                    {formatDate(log.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getActionBadgeVariant(log.action)}>
                      {formatActionType(log.action)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatEntityType(log.entityType)}</TableCell>
                  <TableCell className="font-mono text-xs max-w-[100px] truncate">
                    {log.entityId}
                  </TableCell>
                  <TableCell className="font-mono text-xs max-w-[100px] truncate">
                    {log.userId || 'System'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.ipAddress || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fetchAuditLogDetail(log.id)}
                      disabled={isLoadingDetail}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {!isLoading && auditLogs.length > 0 && (
          <div className="flex items-center justify-between px-4 py-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing page {currentPage} of {totalPages} ({totalCount} total records)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 1 || isLoading}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages || isLoading}
                className="gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Detailed information about this audit log entry
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ID</label>
                  <p className="font-mono text-sm mt-1">{selectedLog.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                  <p className="text-sm mt-1">{formatDate(selectedLog.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Action</label>
                  <div className="mt-1">
                    <Badge variant={getActionBadgeVariant(selectedLog.action)}>
                      {formatActionType(selectedLog.action)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Entity Type</label>
                  <p className="text-sm mt-1">{formatEntityType(selectedLog.entityType)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Entity ID</label>
                  <p className="font-mono text-sm mt-1">{selectedLog.entityId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">User ID</label>
                  <p className="font-mono text-sm mt-1">{selectedLog.userId || 'System'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">IP Address</label>
                  <p className="text-sm mt-1">{selectedLog.ipAddress || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">User Agent</label>
                  <p className="text-xs mt-1 truncate" title={selectedLog.userAgent || 'N/A'}>
                    {selectedLog.userAgent || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Old Value */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Old Value</label>
                <pre className="mt-2 bg-muted p-3 rounded-md text-xs overflow-x-auto">
                  {formatJSON(selectedLog.oldValue)}
                </pre>
              </div>

              {/* New Value */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">New Value</label>
                <pre className="mt-2 bg-muted p-3 rounded-md text-xs overflow-x-auto">
                  {formatJSON(selectedLog.newValue)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
