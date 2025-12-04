import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RefreshCw, Calendar } from 'lucide-react'
import { AttendanceChart, AttendanceTrendData } from '@/components/charts/AttendanceChart'
import { AttendancePieChart, AttendanceStatusData } from '@/components/charts/AttendancePieChart'
import { StatsCards, AttendanceStats } from '@/components/dashboard/StatsCards'
import { RecentScans, AttendanceScan } from '@/components/dashboard/RecentScans'
import { apiClient, ApiClientError } from '@/services/api'

interface ApiWeeklyTrend {
  date: string
  hadir: number
  alpha: number
  izin: number
  sakit: number
}

interface ApiRecentScan {
  id: string
  status: string
  scanTime: string
  student: {
    name: string
    class: string
  }
}

interface AttendanceStatsResponse {
  today: {
    date: string
    totalStudents: number
    scanned: number
    notScanned: number
    hadir: number
    alpha: number
    izin: number
    sakit: number
    attendanceRate: number
  }
  weeklyTrend: ApiWeeklyTrend[]
  recentScans: ApiRecentScan[]
}

const AUTO_REFRESH_INTERVAL = 30000 // 30 seconds

export function Dashboard() {
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [weeklyTrend, setWeeklyTrend] = useState<AttendanceTrendData[]>([])
  const [todaySummary, setTodaySummary] = useState<AttendanceStatusData[]>([])
  const [recentScans, setRecentScans] = useState<AttendanceScan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [dateRange, setDateRange] = useState<'week' | 'month'>('week')

  const fetchDashboardData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setIsLoading(true)
      } else {
        setIsRefreshing(true)
      }
      setError(null)

      // Get auth token from localStorage
      const token = localStorage.getItem('auth_token')
      
      // Fetch stats (includes today, weeklyTrend, and recentScans)
      const statsResponse = await apiClient.get<AttendanceStatsResponse>(
        `/api/attendance/stats?range=${dateRange}`,
        { token: token || undefined }
      )

      // Map API response to component state
      const { today, weeklyTrend: trend, recentScans: scans } = statsResponse
      
      // Map Indonesian status to English for frontend components
      const statusMap: Record<string, 'present' | 'late' | 'absent' | 'excused'> = {
        hadir: 'present',
        alpha: 'absent',
        izin: 'excused',
        sakit: 'excused', // sick is treated as excused
      }
      
      // Convert today stats to AttendanceStats format
      setStats({
        totalStudents: today.totalStudents,
        presentToday: today.hadir,
        absentToday: today.alpha,
        lateToday: 0, // API doesn't provide late count separately
        excusedToday: today.izin + today.sakit,
        attendanceRate: today.attendanceRate,
      })
      
      // Convert weeklyTrend from Indonesian to English keys
      const mappedTrend: AttendanceTrendData[] = trend.map(day => ({
        date: day.date,
        present: day.hadir,
        absent: day.alpha,
        late: 0, // API doesn't track late separately
        excused: day.izin + day.sakit,
      }))
      setWeeklyTrend(mappedTrend)
      
      // Convert today's summary to pie chart format
      setTodaySummary([
        { status: 'present', count: today.hadir },
        { status: 'absent', count: today.alpha },
        { status: 'late', count: 0 },
        { status: 'excused', count: today.izin + today.sakit },
      ])
      
      // Convert recentScans to AttendanceScan format
      setRecentScans(scans.map((scan, index) => ({
        id: index + 1,
        studentName: scan.student.name,
        studentNis: '', // API doesn't provide student number in recentScans
        className: scan.student.class,
        status: statusMap[scan.status] || 'absent',
        scanTime: scan.scanTime,
      })))
      setLastRefresh(new Date())
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to load dashboard data')
      }
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [dateRange])

  // Initial load
  useEffect(() => {
    fetchDashboardData(true)
  }, [fetchDashboardData])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData(false)
    }, AUTO_REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [fetchDashboardData])

  const handleRefresh = () => {
    fetchDashboardData(false)
  }

  const handleDateRangeChange = (range: 'week' | 'month') => {
    setDateRange(range)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time attendance statistics and insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border">
            <Button
              variant={dateRange === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleDateRangeChange('week')}
              className="rounded-r-none"
            >
              <Calendar className="h-4 w-4 mr-1" />
              Week
            </Button>
            <Button
              variant={dateRange === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleDateRangeChange('month')}
              className="rounded-l-none"
            >
              <Calendar className="h-4 w-4 mr-1" />
              Month
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Last refresh timestamp */}
      {!isLoading && (
        <div className="text-xs text-muted-foreground">
          Last updated: {lastRefresh.toLocaleTimeString('id-ID')}
        </div>
      )}

      {/* Stats Cards */}
      <StatsCards stats={stats} isLoading={isLoading} />

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Trend Chart */}
        {isLoading ? (
          <Card>
            <CardHeader>
              <div className="h-6 bg-muted rounded w-48 animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] bg-muted rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ) : (
          <AttendanceChart
            data={weeklyTrend}
            chartType="line"
            title={`Attendance Trends - Last ${dateRange === 'week' ? '7 Days' : '30 Days'}`}
            height={300}
          />
        )}

        {/* Today's Summary Pie Chart */}
        {isLoading ? (
          <Card>
            <CardHeader>
              <div className="h-6 bg-muted rounded w-48 animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] bg-muted rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ) : (
          <AttendancePieChart
            data={todaySummary}
            title="Today's Attendance Summary"
            height={300}
            showPercentage
          />
        )}
      </div>

      {/* Recent Scans */}
      <RecentScans scans={recentScans} isLoading={isLoading} maxItems={10} />
    </div>
  )
}
