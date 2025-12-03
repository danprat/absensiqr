import { useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  TooltipProps,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface AttendanceStatusData {
  status: 'present' | 'absent' | 'late' | 'excused'
  count: number
}

interface AttendancePieChartProps {
  data: AttendanceStatusData[]
  title?: string
  height?: number
  showPercentage?: boolean
}

const STATUS_COLORS: Record<AttendanceStatusData['status'], string> = {
  present: 'hsl(142, 76%, 36%)',
  late: 'hsl(48, 96%, 53%)',
  absent: 'hsl(0, 84%, 60%)',
  excused: 'hsl(221, 83%, 53%)',
}

const STATUS_LABELS: Record<AttendanceStatusData['status'], string> = {
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
  excused: 'Excused',
}

interface CustomTooltipPayload {
  payload?: { name: string; value: number; percentage: string }
}

const CustomTooltip = ({ active, payload }: TooltipProps<number, string> & { payload?: CustomTooltipPayload[] }) => {
  if (active && payload && payload.length && payload[0].payload) {
    const data = payload[0].payload as { name: string; value: number; percentage: string }
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="font-medium">{data.name}</p>
        <p className="text-sm text-muted-foreground">
          Count: {data.value} ({data.percentage})
        </p>
      </div>
    )
  }
  return null
}

const renderLabel = (entry: any) => {
  return `${entry.percentage || ''}`
}

export function AttendancePieChart({
  data,
  title = 'Attendance Status Distribution',
  height = 300,
  showPercentage = true,
}: AttendancePieChartProps) {
  const chartData = useMemo(() => {
    const total = data.reduce((sum, item) => sum + item.count, 0)

    return data
      .filter((item) => item.count > 0)
      .map((item) => ({
        name: STATUS_LABELS[item.status],
        value: item.count,
        percentage: total > 0 ? `${((item.count / total) * 100).toFixed(1)}%` : '0%',
        color: STATUS_COLORS[item.status],
      }))
  }, [data])

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">No attendance data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={showPercentage ? renderLabel : false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry) => {
                const data = entry.payload as { value: number; percentage: string }
                return `${value}: ${data.value} (${data.percentage})`
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
