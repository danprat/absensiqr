/**
 * DisputeDetail Component
 * Dialog for viewing dispute details and resolving (approve/reject)
 */

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  User,
  Calendar,
  Clock,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Activity,
} from 'lucide-react'
import type { DisputeDetail as DisputeDetailType, DisputeStatus } from '@/services/disputes'
import type { AttendanceStatus } from '@/services/attendance'

/**
 * Props interface
 */
interface DisputeDetailProps {
  dispute: DisputeDetailType | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onResolve: (id: string, status: 'approved' | 'rejected', notes: string) => Promise<void>
  isResolving?: boolean
}

/**
 * Status configuration
 */
const attendanceStatusConfig: Record<
  AttendanceStatus,
  { label: string; icon: React.ElementType; color: string }
> = {
  hadir: {
    label: 'Hadir',
    icon: CheckCircle2,
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  alpha: {
    label: 'Alpha',
    icon: XCircle,
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  },
  izin: {
    label: 'Izin',
    icon: AlertCircle,
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  },
  sakit: {
    label: 'Sakit',
    icon: Activity,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
}

const disputeStatusConfig: Record<
  DisputeStatus,
  { label: string; color: string }
> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
}

/**
 * DisputeDetail Component
 */
export const DisputeDetail: React.FC<DisputeDetailProps> = ({
  dispute,
  open,
  onOpenChange,
  onResolve,
  isResolving = false,
}) => {
  const [notes, setNotes] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState<boolean>(false)

  /**
   * Handle resolve action
   */
  const handleResolve = async (status: 'approved' | 'rejected'): Promise<void> => {
    if (!dispute) return

    if (!notes.trim()) {
      alert('Please provide notes for your decision')
      return
    }

    setIsProcessing(true)
    try {
      await onResolve(dispute.id, status, notes.trim())
      setNotes('')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to resolve dispute:', error)
    } finally {
      setIsProcessing(false)
    }
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

  if (!dispute) return null

  const attendanceConfig = attendanceStatusConfig[dispute.attendance.status]
  const AttendanceIcon = attendanceConfig.icon
  const disputeConfig = disputeStatusConfig[dispute.status]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dispute Details</DialogTitle>
          <DialogDescription>
            Review and resolve this attendance dispute
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Student Info */}
          <div className="flex items-start gap-4 pb-4 border-b">
            {dispute.student.photoUrl ? (
              <img
                src={dispute.student.photoUrl}
                alt={dispute.student.name}
                className="h-20 w-20 rounded-full object-cover border-2"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted border-2 text-2xl font-bold text-muted-foreground">
                {dispute.student.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 space-y-2">
              <h3 className="text-xl font-bold">{dispute.student.name}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{dispute.student.studentNumber}</span>
                <span>•</span>
                <span className="font-semibold">{dispute.student.class}</span>
              </div>
              {dispute.student.email && (
                <p className="text-sm text-muted-foreground">{dispute.student.email}</p>
              )}
              {dispute.student.phone && (
                <p className="text-sm text-muted-foreground">{dispute.student.phone}</p>
              )}
            </div>
            <Badge className={disputeConfig.color}>{disputeConfig.label}</Badge>
          </div>

          {/* Attendance Details */}
          <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
            <h4 className="font-semibold text-base">Attendance Record</h4>

            {/* Date */}
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Date</p>
                <p className="text-base font-semibold">{formatDate(dispute.attendance.date)}</p>
              </div>
            </div>

            {/* Scan Time */}
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Scan Time</p>
                <p className="text-base font-semibold">{formatTime(dispute.attendance.scanTime)}</p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-start gap-3">
              <Activity className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <div className="mt-1 flex items-center gap-2">
                  <AttendanceIcon className="h-5 w-5" />
                  <Badge className={attendanceConfig.color}>{attendanceConfig.label}</Badge>
                </div>
              </div>
            </div>

            {/* Attendance Notes */}
            {dispute.attendance.notes && (
              <div className="flex items-start gap-3 pt-2 border-t">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Attendance Notes</p>
                  <p className="text-base mt-1">{dispute.attendance.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Dispute Reason */}
          <div className="space-y-2 rounded-lg border p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <h4 className="font-semibold text-base">Dispute Reason</h4>
            </div>
            <p className="text-base pl-7">{dispute.reason}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground pl-7 pt-1">
              <Clock className="h-3 w-3" />
              <span>Submitted on {formatDate(dispute.createdAt)}</span>
            </div>
          </div>

          {/* Teacher Notes (if resolved) */}
          {dispute.teacherNotes && (
            <div className="space-y-2 rounded-lg border p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h4 className="font-semibold text-base">Teacher Notes</h4>
              </div>
              <p className="text-base pl-7">{dispute.teacherNotes}</p>
              {dispute.resolvedAt && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground pl-7 pt-1">
                  <Clock className="h-3 w-3" />
                  <span>Resolved on {formatDate(dispute.resolvedAt)}</span>
                </div>
              )}
            </div>
          )}

          {/* Resolution Form (if pending) */}
          {dispute.status === 'pending' && (
            <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
              <h4 className="font-semibold text-base">Resolve This Dispute</h4>
              
              <div className="space-y-2">
                <Label htmlFor="teacher-notes" className="text-base">
                  Your Notes <span className="text-destructive">*</span>
                </Label>
                <textarea
                  id="teacher-notes"
                  placeholder="Provide detailed notes about your decision..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  disabled={isProcessing || isResolving}
                />
                <p className="text-xs text-muted-foreground">
                  Explain why you're approving or rejecting this dispute (required)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {dispute.status === 'pending' && (
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing || isResolving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleResolve('rejected')}
              disabled={isProcessing || isResolving || !notes.trim()}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button
              variant="default"
              onClick={() => handleResolve('approved')}
              disabled={isProcessing || isResolving || !notes.trim()}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default DisputeDetail
