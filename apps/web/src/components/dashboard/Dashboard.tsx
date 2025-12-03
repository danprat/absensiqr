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

interface AttendanceStatsResponse {
  stats: AttendanceStats
  weeklyTrend: AttendanceTrendData[]
  todaySummary: AttendanceStatusData[]
}

interface AttendanceSummaryResponse {
  recentScans: AttendanceScan[]
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
      
      // Fetch stats and summary in parallel
      const [statsResponse, summaryResponse] = await Promise.all([
        apiClient.get<AttendanceStatsResponse>(
          `/api/attendance/stats?range=${dateRange}`,
          { token: token || undefined }
        ),
        apiClient.get<AttendanceSummaryResponse>(
          '/api/attendance/summary?limit=20',
          { token: token || undefined }
        ),
      ])

      setStats(statsResponse.stats)
      setWeeklyTrend(statsResponse.weeklyTrend)
      setTodaySummary(statsResponse.todaySummary)
      setRecentScans(summaryResponse.recentScans)
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
