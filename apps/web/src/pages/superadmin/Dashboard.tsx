/**
 * Super Admin Dashboard
 * Platform-wide statistics and school management
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { superAdminService } from '@/services/superAdmin'
import type { PlatformStats, PendingSchool, ActivityLog, SchoolDetails, SchoolListItem } from '@/services/superAdmin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Building2,
  Users,
  GraduationCap,
  QrCode,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  Shield,
  Activity,
  TrendingUp,
  Search,
  Ban,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

type TabType = 'overview' | 'schools' | 'pending'

export function SuperAdminDashboard() {
  const { token } = useAuth()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [pendingSchools, setPendingSchools] = useState<PendingSchool[]>([])
  const [allSchools, setAllSchools] = useState<SchoolListItem[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // School details dialog
  const [selectedSchool, setSelectedSchool] = useState<SchoolDetails | null>(null)
  const [showSchoolDialog, setShowSchoolDialog] = useState(false)
  const [loadingSchoolId, setLoadingSchoolId] = useState<string | null>(null)
  
  // Action dialogs
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    type: 'approve' | 'reject' | 'suspend' | 'reactivate'
    schoolId: string
    schoolName: string
  } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Filters & pagination for schools list
  const [schoolsPage, setSchoolsPage] = useState(1)
  const [schoolsTotalPages, setSchoolsTotalPages] = useState(1)
  const [schoolsFilter, setSchoolsFilter] = useState('all')
  const [schoolsSearch, setSchoolsSearch] = useState('')

  const fetchStats = useCallback(async () => {
    if (!token) return
    try {
      const data = await superAdminService.getStats(token)
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }, [token])

  const fetchPendingSchools = useCallback(async () => {
    if (!token) return
    try {
      const data = await superAdminService.getPendingSchools(token)
      setPendingSchools(data.schools)
    } catch (error) {
      console.error('Failed to fetch pending schools:', error)
    }
  }, [token])

  const fetchAllSchools = useCallback(async (page: number = 1) => {
    if (!token) return
    try {
      const params: { page: number; limit: number; status?: string; search?: string } = {
        page,
        limit: 10,
      }
      if (schoolsFilter !== 'all') params.status = schoolsFilter
      if (schoolsSearch) params.search = schoolsSearch

      const data = await superAdminService.getAllSchools(token, params)
      setAllSchools(data.schools)
      setSchoolsPage(data.pagination.page)
      setSchoolsTotalPages(data.pagination.totalPages)
    } catch (error) {
      console.error('Failed to fetch schools:', error)
    }
  }, [token, schoolsFilter, schoolsSearch])

  const fetchActivityLogs = useCallback(async () => {
    if (!token) return
    try {
      const data = await superAdminService.getActivityLogs(token)
      setActivityLogs(data.activities)
    } catch (error) {
      console.error('Failed to fetch activity logs:', error)
    }
  }, [token])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    await Promise.all([
      fetchStats(),
      fetchPendingSchools(),
      fetchActivityLogs(),
    ])
    setIsLoading(false)
  }, [fetchStats, fetchPendingSchools, fetchActivityLogs])

  const handleViewSchool = async (schoolId: string) => {
    if (!token) return
    setLoadingSchoolId(schoolId)
    try {
      const details = await superAdminService.getSchoolDetails(token, schoolId)
      setSelectedSchool(details)
      setShowSchoolDialog(true)
    } catch (error) {
      console.error('Failed to fetch school details:', error)
      toast({ title: 'Error', description: 'Failed to load school details.', variant: 'destructive' })
    } finally {
      setLoadingSchoolId(null)
    }
  }

  const handleSchoolAction = async () => {
    if (!token || !actionDialog) return
    
    setIsProcessing(true)
    try {
      switch (actionDialog.type) {
        case 'approve':
          await superAdminService.approveSchool(token, actionDialog.schoolId)
          toast({ title: 'Success', description: `${actionDialog.schoolName} has been approved.` })
          break
        case 'reject':
          await superAdminService.rejectSchool(token, actionDialog.schoolId)
          toast({ title: 'Success', description: `${actionDialog.schoolName} has been rejected.` })
          break
        case 'suspend':
          await superAdminService.suspendSchool(token, actionDialog.schoolId, 'Suspended by admin')
          toast({ title: 'Success', description: `${actionDialog.schoolName} has been suspended.` })
          break
        case 'reactivate':
          await superAdminService.reactivateSchool(token, actionDialog.schoolId)
          toast({ title: 'Success', description: `${actionDialog.schoolName} has been reactivated.` })
          break
      }
      // Refresh data
      await Promise.all([fetchStats(), fetchPendingSchools(), fetchAllSchools(schoolsPage)])
    } catch (error) {
      console.error('School action failed:', error)
      toast({ title: 'Error', description: 'Action failed. Please try again.', variant: 'destructive' })
    } finally {
      setIsProcessing(false)
      setActionDialog(null)
    }
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (activeTab === 'schools') {
      // Use setTimeout to ensure state is settled before fetching
      const timer = setTimeout(() => {
        fetchAllSchools(1)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="mr-1 h-3 w-3" />Active</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="mr-1 h-3 w-3" />Pending</Badge>
      case 'suspended':
        return <Badge className="bg-red-100 text-red-700"><Ban className="mr-1 h-3 w-3" />Suspended</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Super Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Platform-wide management and school administration
          </p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === 'overview' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </Button>
        <Button
          variant={activeTab === 'schools' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('schools')}
        >
          All Schools ({stats?.totalSchools || 0})
        </Button>
        <Button
          variant={activeTab === 'pending' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('pending')}
        >
          Pending Approval ({stats?.pendingSchools || 0})
        </Button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Stats Cards */}
          {stats && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalSchools}</div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      {stats.activeSchools} Active
                    </Badge>
                    {stats.pendingSchools > 0 && (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                        {stats.pendingSchools} Pending
                      </Badge>
                    )}
                    {stats.suspendedSchools > 0 && (
                      <Badge variant="outline" className="text-red-600 border-red-600">
                        {stats.suspendedSchools} Suspended
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground mt-1">Admins, teachers, and staff</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalStudents}</div>
                  <p className="text-xs text-muted-foreground mt-1">Registered across all schools</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">QR Scans</CardTitle>
                  <QrCode className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.scansToday}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <TrendingUp className="h-3 w-3" />
                    {stats.scansThisWeek} this week
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest platform activity logs</CardDescription>
            </CardHeader>
            <CardContent>
              {activityLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No recent activity</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activityLogs.slice(0, 10).map((log) => (
                    <div key={log.id} className="flex items-start gap-3 text-sm border-b pb-3 last:border-0">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{log.userName} - {log.action}</p>
                        <p className="text-muted-foreground text-xs">{log.schoolName} • {log.entityType}</p>
                        <p className="text-muted-foreground text-xs">{formatDate(log.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Schools Tab */}
      {activeTab === 'schools' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              All Schools
            </CardTitle>
            <CardDescription>Manage all registered schools</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or subdomain..."
                    value={schoolsSearch}
                    onChange={(e) => setSchoolsSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={schoolsFilter} onValueChange={setSchoolsFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => fetchAllSchools(1)}>
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
            </div>

            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>School</TableHead>
                    <TableHead>Subdomain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allSchools.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No schools found
                      </TableCell>
                    </TableRow>
                  ) : (
                    allSchools.map((school) => (
                      <TableRow key={school.id}>
                        <TableCell className="font-medium">{school.name}</TableCell>
                        <TableCell className="font-mono text-sm">{school.subdomain}</TableCell>
                        <TableCell>{getStatusBadge(school.status)}</TableCell>
                        <TableCell>{school.studentCount} / {school.maxStudents}</TableCell>
                        <TableCell className="text-sm">{school.adminEmail || '-'}</TableCell>
                        <TableCell className="text-sm">{formatDate(school.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewSchool(school.id)}
                              disabled={loadingSchoolId === school.id}
                            >
                              {loadingSchoolId === school.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                            {school.status === 'active' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => setActionDialog({
                                  open: true,
                                  type: 'suspend',
                                  schoolId: school.id,
                                  schoolName: school.name,
                                })}
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                            {school.status === 'suspended' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => setActionDialog({
                                  open: true,
                                  type: 'reactivate',
                                  schoolId: school.id,
                                  schoolName: school.name,
                                })}
                              >
                                <PlayCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {schoolsTotalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">Page {schoolsPage} of {schoolsTotalPages}</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchAllSchools(schoolsPage - 1)}
                    disabled={schoolsPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchAllSchools(schoolsPage + 1)}
                    disabled={schoolsPage >= schoolsTotalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pending Approval Tab */}
      {activeTab === 'pending' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Approval
            </CardTitle>
            <CardDescription>Schools waiting for your approval</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingSchools.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="font-medium">All caught up!</p>
                <p className="text-sm">No schools pending approval</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingSchools.map((school) => (
                  <div
                    key={school.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50/50"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold text-lg">{school.name}</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {school.subdomain}.absensiqr.app
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Admin: {school.adminName} ({school.adminEmail})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Registered: {formatDate(school.createdAt)} • Timezone: {school.timezone}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewSchool(school.id)}
                        disabled={loadingSchoolId === school.id}
                      >
                        {loadingSchoolId === school.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Eye className="mr-1 h-4 w-4" />
                            View
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => setActionDialog({
                          open: true,
                          type: 'approve',
                          schoolId: school.id,
                          schoolName: school.name,
                        })}
                      >
                        <CheckCircle className="mr-1 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setActionDialog({
                          open: true,
                          type: 'reject',
                          schoolId: school.id,
                          schoolName: school.name,
                        })}
                      >
                        <XCircle className="mr-1 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* School Details Dialog */}
      <Dialog open={showSchoolDialog} onOpenChange={setShowSchoolDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>School Details</DialogTitle>
            <DialogDescription>Detailed information about the selected school</DialogDescription>
          </DialogHeader>

          {selectedSchool && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">School Name</p>
                  <p className="font-semibold">{selectedSchool.school.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Subdomain</p>
                  <p className="font-mono">{selectedSchool.school.subdomain}.absensiqr.app</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  {getStatusBadge(selectedSchool.school.status)}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Timezone</p>
                  <p>{selectedSchool.school.timezone}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">School Hours</p>
                  <p>{selectedSchool.school.schoolHours.start} - {selectedSchool.school.schoolHours.end}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Max Students</p>
                  <p>{selectedSchool.school.maxStudents}</p>
                </div>
              </div>

              {selectedSchool.admin && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Admin Information</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Name</p>
                      <p>{selectedSchool.admin.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p>{selectedSchool.admin.email}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Statistics</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Users</p>
                      <p className="text-xl font-bold">{selectedSchool.statistics.users.total}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Students</p>
                      <p className="text-xl font-bold">
                        {selectedSchool.statistics.students.active} / {selectedSchool.statistics.students.total}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Attendance (30d)</p>
                      <p className="text-xl font-bold">{selectedSchool.statistics.attendanceLast30Days}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSchoolDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Confirmation Dialog */}
      <AlertDialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionDialog?.type === 'approve' && 'Approve School'}
              {actionDialog?.type === 'reject' && 'Reject School'}
              {actionDialog?.type === 'suspend' && 'Suspend School'}
              {actionDialog?.type === 'reactivate' && 'Reactivate School'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionDialog?.type === 'approve' && (
                <>Are you sure you want to approve <strong>{actionDialog.schoolName}</strong>? They will be able to use the platform immediately.</>
              )}
              {actionDialog?.type === 'reject' && (
                <>Are you sure you want to reject <strong>{actionDialog.schoolName}</strong>? This will delete their registration.</>
              )}
              {actionDialog?.type === 'suspend' && (
                <>Are you sure you want to suspend <strong>{actionDialog.schoolName}</strong>? Users will not be able to log in.</>
              )}
              {actionDialog?.type === 'reactivate' && (
                <>Are you sure you want to reactivate <strong>{actionDialog.schoolName}</strong>? Users will be able to log in again.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSchoolAction}
              disabled={isProcessing}
              className={
                actionDialog?.type === 'reject' || actionDialog?.type === 'suspend'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              }
            >
              {isProcessing ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>
                  {actionDialog?.type === 'approve' && <CheckCircle className="mr-2 h-4 w-4" />}
                  {actionDialog?.type === 'reject' && <XCircle className="mr-2 h-4 w-4" />}
                  {actionDialog?.type === 'suspend' && <Ban className="mr-2 h-4 w-4" />}
                  {actionDialog?.type === 'reactivate' && <PlayCircle className="mr-2 h-4 w-4" />}
                </>
              )}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default SuperAdminDashboard
