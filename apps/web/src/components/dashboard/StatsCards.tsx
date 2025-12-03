import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserCheck, UserX, Clock, TrendingUp, AlertCircle } from 'lucide-react'
import { LucideIcon } from 'lucide-react'

export interface AttendanceStats {
  totalStudents: number
  presentToday: number
  absentToday: number
  lateToday: number
  excusedToday: number
  attendanceRate: number
}

interface StatsCardsProps {
  stats: AttendanceStats | null
  isLoading?: boolean
}

interface StatCardData {
  title: string
  value: string | number
  description: string
  icon: LucideIcon
  iconColor: string
}

const Skeleton = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-muted rounded w-16 mb-2"></div>
    <div className="h-8 bg-muted rounded w-24"></div>
  </div>
)

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-24"></div>
              <div className="h-4 w-4 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <Skeleton />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const cardData: StatCardData[] = [
    {
      title: 'Total Students',
      value: stats?.totalStudents ?? 0,
      description: 'Registered students',
      icon: Users,
      iconColor: 'text-blue-500',
    },
    {
      title: 'Present Today',
      value: stats?.presentToday ?? 0,
      description: `${stats ? Math.round((stats.presentToday / stats.totalStudents) * 100) : 0}% of total`,
      icon: UserCheck,
      iconColor: 'text-green-500',
    },
    {
      title: 'Absent Today',
      value: stats?.absentToday ?? 0,
      description: `${stats ? Math.round((stats.absentToday / stats.totalStudents) * 100) : 0}% of total`,
      icon: UserX,
      iconColor: 'text-red-500',
    },
    {
      title: 'Late Arrivals',
      value: stats?.lateToday ?? 0,
      description: 'Late check-ins',
      icon: Clock,
      iconColor: 'text-yellow-500',
    },
    {
      title: 'Excused',
      value: stats?.excusedToday ?? 0,
      description: 'With permission',
      icon: AlertCircle,
      iconColor: 'text-blue-500',
    },
    {
      title: 'Attendance Rate',
      value: stats ? `${stats.attendanceRate.toFixed(1)}%` : '0%',
      description: 'Overall rate',
      icon: TrendingUp,
      iconColor: 'text-purple-500',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cardData.map((card, index) => {
        const Icon = card.icon
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <Icon className={`h-4 w-4 ${card.iconColor}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
