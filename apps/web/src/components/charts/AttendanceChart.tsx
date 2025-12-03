import { useMemo } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface AttendanceTrendData {
  date: string
  present: number
  absent: number
  late: number
  excused: number
}

interface AttendanceChartProps {
  data: AttendanceTrendData[]
  chartType?: 'line' | 'bar'
  title?: string
  height?: number
}

interface CustomTooltipPayload {
  name?: string
  value?: number
  color?: string
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string> & { payload?: CustomTooltipPayload[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="font-medium mb-2">{label}</p>
        {payload.map((entry: CustomTooltipPayload, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function AttendanceChart({
  data,
  chartType = 'line',
  title = 'Attendance Trends',
  height = 300,
}: AttendanceChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      date: new Date(item.date).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
      }),
    }))
  }, [data])

  const chartConfig = {
    present: {
      color: 'hsl(142, 76%, 36%)',
      label: 'Present',
    },
    late: {
      color: 'hsl(48, 96%, 53%)',
      label: 'Late',
    },
    absent: {
      color: 'hsl(0, 84%, 60%)',
      label: 'Absent',
    },
    excused: {
      color: 'hsl(221, 83%, 53%)',
      label: 'Excused',
    },
  }

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    }

    if (chartType === 'bar') {
      return (
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="date" className="text-xs" />
          <YAxis className="text-xs" />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="present" fill={chartConfig.present.color} name={chartConfig.present.label} />
          <Bar dataKey="late" fill={chartConfig.late.color} name={chartConfig.late.label} />
          <Bar dataKey="absent" fill={chartConfig.absent.color} name={chartConfig.absent.label} />
          <Bar dataKey="excused" fill={chartConfig.excused.color} name={chartConfig.excused.label} />
        </BarChart>
      )
    }

    return (
      <LineChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="date" className="text-xs" />
        <YAxis className="text-xs" />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line
          type="monotone"
          dataKey="present"
          stroke={chartConfig.present.color}
          name={chartConfig.present.label}
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="late"
          stroke={chartConfig.late.color}
          name={chartConfig.late.label}
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="absent"
          stroke={chartConfig.absent.color}
          name={chartConfig.absent.label}
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="excused"
          stroke={chartConfig.excused.color}
          name={chartConfig.excused.label}
          strokeWidth={2}
        />
      </LineChart>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
