/**
 * Manual Attendance Page
 * Allows teachers to manually record attendance without QR scanning
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  attendanceService,
  type AttendanceStatus,
  type ClassRosterResponse,
  type ClassRosterStudent,
} from '@/services/attendance'
import { ClassRoster } from '@/components/attendance/ClassRoster'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/useToast'
import { Calendar, Users, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react'

/**
 * Class options (to be fetched from API or config)
 */
const AVAILABLE_CLASSES = [
  '7A', '7B', '7C', '7D',
  '8A', '8B', '8C', '8D',
  '9A', '9B', '9C', '9D',
  '10A', '10B', '10C', '10D',
  '11A', '11B', '11C', '11D',
  '12A', '12B', '12C', '12D',
]

/**
 * Student attendance state with modified status
 */
interface StudentAttendanceState extends ClassRosterStudent {
  modifiedStatus?: AttendanceStatus
}

/**
 * ManualAttendance Page Component
 */
export const ManualAttendance: React.FC = () => {
  const { token } = useAuth()
  const { toast } = useToast()

  // Page state
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [rosterData, setRosterData] = useState<ClassRosterResponse | null>(null)
  const [students, setStudents] = useState<StudentAttendanceState[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savingStudentIds, setSavingStudentIds] = useState<Set<string>>(new Set())
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showBulkDialog, setShowBulkDialog] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<AttendanceStatus>('hadir')

  /**
   * Load class roster
   */
  const loadClassRoster = useCallback(async (): Promise<void> => {
    if (!selectedClass || !token) return

    setIsLoading(true)
    try {
      const data = await attendanceService.getClassRoster(token, selectedClass, selectedDate)
      setRosterData(data)
      setStudents(data.roster)
      setHasUnsavedChanges(false)
      
      toast({
        title: 'Roster loaded',
        description: `Loaded ${data.roster.length} students from ${data.class}`,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load roster'
      toast({
        title: 'Error loading roster',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [selectedClass, selectedDate, token, toast])

  /**
   * Load roster when class or date changes
   */
  useEffect(() => {
    if (selectedClass) {
      void loadClassRoster()
    }
  }, [selectedClass, selectedDate, loadClassRoster])

  /**
   * Handle status change for a student
   */
  const handleStatusChange = (studentId: string, status: AttendanceStatus): void => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId
          ? { ...student, modifiedStatus: status }
          : student
      )
    )
    setHasUnsavedChanges(true)
  }

  /**
   * Save individual student attendance
   */
  const saveStudentAttendance = async (studentId: string): Promise<void> => {
    if (!token) return

    const student = students.find((s) => s.id === studentId)
    if (!student || !student.modifiedStatus) return

    setSavingStudentIds((prev) => new Set(prev).add(studentId))

    try {
      await attendanceService.submitManualAttendance(token, {
        studentId: student.id,
        status: student.modifiedStatus,
        date: selectedDate,
        notes: 'Manual entry by teacher',
      })

      // Update local state
      setStudents((prev) =>
        prev.map((s) =>
          s.id === studentId
            ? {
                ...s,
                attendance: {
                  id: `temp-${Date.now()}`,
                  status: student.modifiedStatus!,
                  scanTime: new Date().toISOString(),
                  notes: 'Manual entry by teacher',
                },
                modifiedStatus: undefined,
              }
            : s
        )
      )

      toast({
        title: 'Attendance saved',
        description: `Recorded ${student.modifiedStatus} for ${student.name}`,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save attendance'
      toast({
        title: 'Error saving attendance',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setSavingStudentIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(studentId)
        return newSet
      })
    }
  }

  /**
   * Save all modified attendance records
   */
  const saveAllAttendance = async (): Promise<void> => {
    if (!token) return

    const modifiedStudents = students.filter((s) => s.modifiedStatus)
    if (modifiedStudents.length === 0) {
      toast({
        title: 'No changes to save',
        description: 'Please modify at least one student status',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    let successCount = 0
    let errorCount = 0

    for (const student of modifiedStudents) {
      try {
        await attendanceService.submitManualAttendance(token, {
          studentId: student.id,
          status: student.modifiedStatus!,
          date: selectedDate,
          notes: 'Manual entry by teacher',
        })
        successCount++
      } catch (error) {
        errorCount++
        console.error(`Failed to save attendance for ${student.name}:`, error)
      }
    }

    setIsSaving(false)

    if (errorCount === 0) {
      toast({
        title: 'All attendance saved',
        description: `Successfully saved ${successCount} records`,
      })
      setHasUnsavedChanges(false)
      // Reload roster to get fresh data
      await loadClassRoster()
    } else {
      toast({
        title: 'Partially saved',
        description: `${successCount} succeeded, ${errorCount} failed`,
        variant: 'destructive',
      })
    }
  }

  /**
   * Apply bulk status to all unscanned students
   */
  const applyBulkStatus = (): void => {
    const unscannedStudents = students.filter((s) => !s.attendance)
    
    setStudents((prev) =>
      prev.map((student) =>
        !student.attendance
          ? { ...student, modifiedStatus: bulkStatus }
          : student
      )
    )
    
    setHasUnsavedChanges(true)
    setShowBulkDialog(false)
    
    toast({
      title: 'Bulk status applied',
      description: `Set ${bulkStatus} for ${unscannedStudents.length} unscanned students`,
    })
  }

  /**
   * Get students with current or modified status
   */
  const getStudentsWithStatus = (): ClassRosterStudent[] => {
    return students.map((student) => ({
      ...student,
      attendance: student.modifiedStatus
        ? {
            id: student.attendance?.id || 'temp',
            status: student.modifiedStatus,
            scanTime: student.attendance?.scanTime || new Date().toISOString(),
            notes: student.attendance?.notes || null,
          }
        : student.attendance,
    }))
  }

  /**
   * Count unscanned students
   */
  const unscannedCount = students.filter((s) => !s.attendance).length

  return (
    <div className="container mx-auto max-w-7xl space-y-6 py-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manual Attendance Entry</h1>
        <p className="text-muted-foreground">
          Record attendance manually for students who missed QR scanning
        </p>
      </div>

      {/* Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Class and Date
          </CardTitle>
          <CardDescription>
            Choose a class and date to view and manage attendance records
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Class Selection */}
            <div className="space-y-2">
              <Label htmlFor="class-select">Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger id="class-select">
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_CLASSES.map((className) => (
                    <SelectItem key={className} value={className}>
                      Class {className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <Label htmlFor="date-select">Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  id="date-select"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Roster Summary */}
          {rosterData && (
            <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-base">
                  {rosterData.class}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {new Date(rosterData.date).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <span>
                  Total: <strong>{rosterData.summary.total}</strong>
                </span>
                <span className="text-green-600">
                  Hadir: <strong>{rosterData.summary.hadir}</strong>
                </span>
                <span className="text-red-600">
                  Alpha: <strong>{rosterData.summary.alpha}</strong>
                </span>
                <span className="text-blue-600">
                  Izin: <strong>{rosterData.summary.izin}</strong>
                </span>
                <span className="text-yellow-600">
                  Sakit: <strong>{rosterData.summary.sakit}</strong>
                </span>
                {unscannedCount > 0 && (
                  <span className="text-orange-600">
                    Not scanned: <strong>{unscannedCount}</strong>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {selectedClass && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={loadClassRoster} variant="outline" disabled={isLoading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {unscannedCount > 0 && (
                <Button onClick={() => setShowBulkDialog(true)} variant="secondary">
                  <Users className="mr-2 h-4 w-4" />
                  Mark All Unscanned ({unscannedCount})
                </Button>
              )}
              {hasUnsavedChanges && (
                <Button onClick={saveAllAttendance} disabled={isSaving}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving All...' : 'Save All Changes'}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warning for unsaved changes */}
      {hasUnsavedChanges && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes. Don't forget to save before leaving this page.
          </AlertDescription>
        </Alert>
      )}

      {/* Class Roster Table */}
      {selectedClass ? (
        <Card>
          <CardHeader>
            <CardTitle>Class Roster</CardTitle>
            <CardDescription>
              View and update attendance status for each student
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClassRoster
              students={getStudentsWithStatus()}
              isLoading={isLoading}
              onStatusChange={handleStatusChange}
              onSaveStudent={saveStudentAttendance}
              isSaving={isSaving}
              savingStudentIds={savingStudentIds}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">
              Please select a class and date to view the roster
            </p>
          </CardContent>
        </Card>
      )}

      {/* Bulk Action Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark All Unscanned Students</DialogTitle>
            <DialogDescription>
              Select a status to apply to all students who haven't been scanned yet
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v as AttendanceStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hadir">✓ Hadir</SelectItem>
                  <SelectItem value="alpha">✗ Alpha</SelectItem>
                  <SelectItem value="izin">ⓘ Izin</SelectItem>
                  <SelectItem value="sakit">⚕ Sakit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Alert>
              <AlertDescription>
                This will set the status for <strong>{unscannedCount}</strong> unscanned students.
                You can still modify individual statuses before saving.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Cancel
            </Button>
            <Button onClick={applyBulkStatus}>Apply to All</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
