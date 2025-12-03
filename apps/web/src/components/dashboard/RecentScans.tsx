import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDistance } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { UserCheck, Clock, UserX, AlertCircle } from 'lucide-react'

export interface AttendanceScan {
  id: number
  studentName: string
  studentNis: string
  className: string
  status: 'present' | 'late' | 'absent' | 'excused'
  scanTime: string
  location?: string
}

interface RecentScansProps {
  scans: AttendanceScan[]
  isLoading?: boolean
  maxItems?: number
}

const STATUS_CONFIG = {
  present: {
    label: 'Present',
    variant: 'default' as const,
    icon: UserCheck,
    className: 'bg-green-500 hover:bg-green-600',
  },
  late: {
    label: 'Late',
    variant: 'secondary' as const,
    icon: Clock,
    className: 'bg-yellow-500 hover:bg-yellow-600',
  },
  absent: {
    label: 'Absent',
    variant: 'destructive' as const,
    icon: UserX,
    className: 'bg-red-500 hover:bg-red-600',
  },
  excused: {
    label: 'Excused',
    variant: 'outline' as const,
    icon: AlertCircle,
    className: 'bg-blue-500 hover:bg-blue-600 text-white',
  },
}

const ScanItemSkeleton = () => (
  <div className="flex items-center space-x-4 animate-pulse">
    <div className="h-10 w-10 bg-muted rounded-full"></div>
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-muted rounded w-32"></div>
      <div className="h-3 bg-muted rounded w-48"></div>
    </div>
    <div className="h-6 w-16 bg-muted rounded"></div>
  </div>
)

export function RecentScans({ scans, isLoading, maxItems = 10 }: RecentScansProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance Scans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <ScanItemSkeleton key={i} />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const displayScans = scans.slice(0, maxItems)

  if (displayScans.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance Scans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <UserCheck className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No recent scans. Start scanning QR codes to see attendance data here.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Attendance Scans</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayScans.map((scan) => {
            const config = STATUS_CONFIG[scan.status]
            const Icon = config.icon
            const timeAgo = formatDistance(new Date(scan.scanTime), new Date(), {
              addSuffix: true,
              locale: idLocale,
            })

            return (
              <div
                key={scan.id}
                className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    config.className
                  }`}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  <p className="text-sm font-medium leading-none">
                    {scan.studentName}
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({scan.studentNis})
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {scan.className} • {timeAgo}
                    {scan.location && ` • ${scan.location}`}
                  </p>
                </div>
                <Badge className={config.className}>{config.label}</Badge>
              </div>
            )
          })}
        </div>
        {scans.length > maxItems && (
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Showing {maxItems} of {scans.length} recent scans
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
