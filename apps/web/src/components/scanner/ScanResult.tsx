/**
 * ScanResult Component
 * Displays feedback after scanning a QR code
 */

import { type ScanAttendanceResponse } from '@/services/attendance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, XCircle, AlertCircle, User, Calendar, Clock, X } from 'lucide-react'

export interface ScanResultProps {
  result: ScanAttendanceResponse | null
  error: string | null
  onClose: () => void
  className?: string
}

/**
 * Get status badge variant
 */
function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'hadir':
      return 'default'
    case 'alpha':
      return 'destructive'
    case 'izin':
    case 'sakit':
      return 'secondary'
    default:
      return 'outline'
  }
}

/**
 * Get status display text
 */
function getStatusText(status: string): string {
  switch (status) {
    case 'hadir':
      return 'Present'
    case 'alpha':
      return 'Absent'
    case 'izin':
      return 'Excused'
    case 'sakit':
      return 'Sick'
    default:
      return status
  }
}

/**
 * Format date/time
 */
function formatDateTime(isoString: string): { date: string; time: string } {
  const dateObj = new Date(isoString)
  const date = dateObj.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const time = dateObj.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return { date, time }
}

/**
 * ScanResult component showing success or error feedback
 */
export function ScanResult({ result, error, onClose, className = '' }: ScanResultProps) {
  // Don't render if no result or error
  if (!result && !error) {
    return null
  }

  const isSuccess = result?.success && !error
  const { date, time } = result?.scanTime ? formatDateTime(result.scanTime) : { date: '', time: '' }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Success Result */}
      {isSuccess && result && (
        <Card className="border-2 border-green-500 bg-green-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <CardTitle className="text-green-900">Scan Successful</CardTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Student Info */}
            <div className="space-y-3">
              {/* Student Photo */}
              {result.student.photoUrl && (
                <div className="flex justify-center">
                  <img
                    src={result.student.photoUrl}
                    alt={result.student.name}
                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
                  />
                </div>
              )}

              {/* Student Details */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-600" />
                  <span className="font-semibold">{result.student.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Class:</span>
                    <span className="ml-2 font-medium">{result.student.class}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Student #:</span>
                    <span className="ml-2 font-medium">{result.student.studentNumber}</span>
                  </div>
                </div>
              </div>

              {/* Attendance Status */}
              <div className="flex items-center justify-center gap-2 pt-2">
                <span className="text-sm text-gray-600">Status:</span>
                <Badge variant={getStatusVariant(result.status)} className="text-sm px-3 py-1">
                  {getStatusText(result.status)}
                </Badge>
              </div>

              {/* Scan Time */}
              <div className="flex items-center justify-center gap-4 text-sm text-gray-600 pt-2 border-t">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{date}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{time}</span>
                </div>
              </div>
            </div>

            {/* Warnings */}
            {result.warnings && result.warnings.length > 0 && (
              <Alert variant="default" className="bg-yellow-50 border-yellow-300">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-900">Warnings</AlertTitle>
                <AlertDescription className="text-yellow-800">
                  <ul className="list-disc list-inside space-y-1 text-sm mt-1">
                    {result.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Result */}
      {error && (
        <Card className="border-2 border-red-500 bg-red-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-6 w-6 text-red-600" />
                <CardTitle className="text-red-900">Scan Failed</CardTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Continue Button */}
      <div className="flex justify-center">
        <Button onClick={onClose} size="lg" variant={isSuccess ? 'default' : 'destructive'}>
          Continue Scanning
        </Button>
      </div>
    </div>
  )
}
