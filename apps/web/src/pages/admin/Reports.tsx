/**
 * Reports Page
 * Attendance reports with filtering, charts, and export functionality
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { attendanceService } from '@/services/attendance'
import type { AttendanceHistoryRecord, AttendanceStatus } from '@/services/attendance'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const statusConfig: Record<AttendanceStatus, { label: string; color: string; bgColor: string }> = {
  hadir: { label: 'Hadir', color: 'text-green-700', bgColor: 'bg-green-100' },
  alpha: { label: 'Alpha', color: 'text-red-700', bgColor: 'bg-red-100' },
  izin: { label: 'Izin', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  sakit: { label: 'Sakit', color: 'text-blue-700', bgColor: 'bg-blue-100' },
}

export function Reports() {
  const { token } = useAuth()
  const { toast } = useToast()

  const [records, setRecords] = useState<AttendanceHistoryRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Filters
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [classFilter, setClassFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)

  // Summary stats
  const [summary, setSummary] = useState({
    total: 0,
    hadir: 0,
    alpha: 0,
    izin: 0,
    sakit: 0,
  })

  const fetchReports = useCallback(async (page: number = 1) => {
    if (!token) return

    setIsLoading(true)
    try {
      const filters: Record<string, string | number> = {
        page,
        limit: 20,
      }

      if (startDate) filters.startDate = startDate
      if (endDate) filters.endDate = endDate
      if (classFilter && classFilter !== 'all') filters.class = classFilter
      if (statusFilter && statusFilter !== 'all') filters.status = statusFilter

      const response = await attendanceService.getAttendanceHistory(token, filters)

      setRecords(response.data)
      setCurrentPage(response.pagination.page)
      setTotalPages(response.pagination.totalPages)
      setTotalRecords(response.pagination.total)

      // Calculate summary from current page data
      const newSummary = response.data.reduce(
        (acc, record) => {
          acc.total++
          acc[record.status]++
          return acc
        },
        { total: 0, hadir: 0, alpha: 0, izin: 0, sakit: 0 }
      )
      setSummary(newSummary)
    } catch (error) {
      console.error('Failed to fetch reports:', error)
      toast({
        title: 'Error',
        description: 'Failed to load reports. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [token, startDate, endDate, classFilter, statusFilter, toast])

  const handleExport = async () => {
    if (!token) return

    setIsExporting(true)
    try {
      const filters: Record<string, string | number> = {
        limit: 10000,
      }
      if (startDate) filters.startDate = startDate
      if (endDate) filters.endDate = endDate
      if (classFilter && classFilter !== 'all') filters.class = classFilter
      if (statusFilter && statusFilter !== 'all') filters.status = statusFilter

      const response = await attendanceService.getAttendanceHistory(token, filters)

      // Convert to CSV
      const headers = ['Tanggal', 'NIS', 'Nama', 'Kelas', 'Status', 'Waktu Scan', 'Catatan']
      const rows = response.data.map((record) => [
        record.date,
        record.student.studentNumber,
        record.student.name,
        record.student.class,
        statusConfig[record.status].label,
        new Date(record.scanTime).toLocaleString('id-ID'),
        record.notes || '',
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n')

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `laporan-absensi-${startDate}-${endDate}.csv`
      link.click()

      toast({
        title: 'Export berhasil',
        description: `${response.data.length} data berhasil diekspor`,
      })
    } catch (error) {
      console.error('Export failed:', error)
      toast({
        title: 'Export gagal',
        description: 'Gagal mengekspor data. Silakan coba lagi.',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }

  useEffect(() => {
    fetchReports(1)
  }, [fetchReports])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance Reports</h1>
          <p className="text-muted-foreground">
            View and export attendance data with customizable filters
          </p>
        </div>
        <Button onClick={handleExport} disabled={isExporting || records.length === 0}>
          {isExporting ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Filter Reports
          </CardTitle>
          <CardDescription>Set filters to generate specific reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  <SelectItem value="X-A">X-A</SelectItem>
                  <SelectItem value="X-B">X-B</SelectItem>
                  <SelectItem value="XI-A">XI-A</SelectItem>
                  <SelectItem value="XI-B">XI-B</SelectItem>
                  <SelectItem value="XII-A">XII-A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="hadir">Hadir</SelectItem>
                  <SelectItem value="alpha">Alpha</SelectItem>
                  <SelectItem value="izin">Izin</SelectItem>
                  <SelectItem value="sakit">Sakit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={() => fetchReports(1)} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                )}
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{totalRecords}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Hadir</p>
                <p className="text-2xl font-bold text-green-600">{summary.hadir}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Alpha</p>
                <p className="text-2xl font-bold text-red-600">{summary.alpha}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Izin</p>
                <p className="text-2xl font-bold text-yellow-600">{summary.izin}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Sakit</p>
                <p className="text-2xl font-bold text-blue-600">{summary.sakit}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Attendance Data
          </CardTitle>
          <CardDescription>
            Showing {records.length} of {totalRecords} records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No attendance records found for the selected filters.</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>NIS</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Waktu Scan</TableHead>
                      <TableHead>Catatan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatDate(record.date)}</TableCell>
                        <TableCell className="font-mono">{record.student.studentNumber}</TableCell>
                        <TableCell className="font-medium">{record.student.name}</TableCell>
                        <TableCell>{record.student.class}</TableCell>
                        <TableCell>
                          <Badge
                            className={`${statusConfig[record.status].bgColor} ${statusConfig[record.status].color}`}
                          >
                            {statusConfig[record.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatTime(record.scanTime)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {record.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchReports(currentPage - 1)}
                      disabled={currentPage <= 1 || isLoading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchReports(currentPage + 1)}
                      disabled={currentPage >= totalPages || isLoading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Reports
