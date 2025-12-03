/**
 * ClassRoster Component
 * Displays class roster with attendance controls for manual entry
 */

import React, { useState } from 'react'
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
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { AttendanceStatus, ClassRosterStudent } from '@/services/attendance'
import { CheckCircle2, XCircle, AlertCircle, UserX } from 'lucide-react'

/**
 * Props for ClassRoster component
 */
interface ClassRosterProps {
  /** List of students in the class */
  students: ClassRosterStudent[]
  /** Whether data is currently loading */
  isLoading?: boolean
  /** Callback when attendance status changes for a student */
  onStatusChange: (studentId: string, status: AttendanceStatus) => void
  /** Callback when saving individual student */
  onSaveStudent?: (studentId: string) => Promise<void>
  /** Whether save operations are in progress */
  isSaving?: boolean
  /** IDs of students currently being saved */
  savingStudentIds?: Set<string>
}

/**
 * Status badge configuration
 */
const statusConfig: Record<
  AttendanceStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }
> = {
  hadir: { label: 'Hadir', variant: 'default', icon: CheckCircle2 },
  alpha: { label: 'Alpha', variant: 'destructive', icon: XCircle },
  izin: { label: 'Izin', variant: 'secondary', icon: AlertCircle },
  sakit: { label: 'Sakit', variant: 'outline', icon: UserX },
}

/**
 * ClassRoster Component
 * Displays student roster with attendance status and controls
 */
export const ClassRoster: React.FC<ClassRosterProps> = ({
  students,
  isLoading = false,
  onStatusChange,
  onSaveStudent,
  isSaving = false,
  savingStudentIds = new Set(),
}) => {
  const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set())
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<ClassRosterStudent | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>('hadir')

  /**
   * Handle status change for a student
   */
  const handleStatusChange = (studentId: string, status: AttendanceStatus): void => {
    onStatusChange(studentId, status)
    setPendingChanges((prev) => new Set(prev).add(studentId))
  }

  /**
   * Open confirmation dialog for saving
   */
  const openConfirmDialog = (student: ClassRosterStudent, status: AttendanceStatus): void => {
    setSelectedStudent(student)
    setSelectedStatus(status)
    setShowConfirmDialog(true)
  }

  /**
   * Confirm and save student attendance
   */
  const handleConfirmSave = async (): Promise<void> => {
    if (selectedStudent && onSaveStudent) {
      await onSaveStudent(selectedStudent.id)
      setPendingChanges((prev) => {
        const newSet = new Set(prev)
        newSet.delete(selectedStudent.id)
        return newSet
      })
    }
    setShowConfirmDialog(false)
    setSelectedStudent(null)
  }

  /**
   * Get student's current status
   */
  const getStudentStatus = (student: ClassRosterStudent): AttendanceStatus => {
    return student.attendance?.status || 'alpha'
  }

  /**
   * Check if student has been scanned
   */
  const isScanned = (student: ClassRosterStudent): boolean => {
    return student.attendance !== null
  }

  /**
   * Render status badge
   */
  const renderStatusBadge = (status: AttendanceStatus): JSX.Element => {
    const config = statusConfig[status]
    const Icon = config.icon
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-sm text-muted-foreground">Loading roster...</p>
        </div>
      </div>
    )
  }

  if (students.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No students found in this class. Please select a different class or date.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">No.</TableHead>
              <TableHead className="w-[100px]">Photo</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-[120px]">Student #</TableHead>
              <TableHead className="w-[150px]">Current Status</TableHead>
              <TableHead className="w-[200px]">Set Status</TableHead>
              <TableHead className="w-[100px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student, index) => {
              const currentStatus = getStudentStatus(student)
              const scanned = isScanned(student)
              const isPending = pendingChanges.has(student.id)
              const isSavingStudent = savingStudentIds.has(student.id)

              return (
                <TableRow
                  key={student.id}
                  className={!scanned ? 'bg-yellow-50 dark:bg-yellow-950/20' : undefined}
                >
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    {student.photoUrl ? (
                      <img
                        src={student.photoUrl}
                        alt={student.name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <UserX className="h-6 w-6" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{student.name}</span>
                      {!scanned && (
                        <span className="text-xs text-yellow-600 dark:text-yellow-400">
                          Not yet scanned
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{student.studentNumber}</TableCell>
                  <TableCell>
                    {scanned ? (
                      <div className="flex flex-col gap-1">
                        {renderStatusBadge(currentStatus)}
                        {student.attendance?.scanTime && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(student.attendance.scanTime).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        No record
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={currentStatus}
                      onValueChange={(value) =>
                        handleStatusChange(student.id, value as AttendanceStatus)
                      }
                      disabled={isSavingStudent}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hadir">✓ Hadir</SelectItem>
                        <SelectItem value="alpha">✗ Alpha</SelectItem>
                        <SelectItem value="izin">ⓘ Izin</SelectItem>
                        <SelectItem value="sakit">⚕ Sakit</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {onSaveStudent && (
                      <Button
                        size="sm"
                        variant={isPending ? 'default' : 'outline'}
                        disabled={!isPending || isSavingStudent}
                        onClick={() => openConfirmDialog(student, currentStatus)}
                      >
                        {isSavingStudent ? 'Saving...' : 'Save'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Attendance</DialogTitle>
            <DialogDescription>
              Are you sure you want to save this attendance record?
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                {selectedStudent.photoUrl ? (
                  <img
                    src={selectedStudent.photoUrl}
                    alt={selectedStudent.name}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <UserX className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold">{selectedStudent.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedStudent.studentNumber} • {selectedStudent.class}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label>Status:</Label>
                {renderStatusBadge(selectedStatus)}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Confirm & Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
