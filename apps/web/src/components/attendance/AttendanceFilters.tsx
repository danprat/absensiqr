/**
 * AttendanceFilters Component
 * Filter controls for attendance history
 */

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import type { AttendanceStatus } from '@/services/attendance'
import { Filter, X, Download } from 'lucide-react'

/**
 * Filter values interface
 */
export interface AttendanceFilterValues {
  startDate?: string
  endDate?: string
  class?: string
  status?: AttendanceStatus
}

/**
 * Props for AttendanceFilters component
 */
interface AttendanceFiltersProps {
  /** Current filter values */
  filters: AttendanceFilterValues
  /** Callback when filters change */
  onFiltersChange: (filters: AttendanceFilterValues) => void
  /** Callback when filters are applied */
  onApplyFilters: () => void
  /** Callback when filters are reset */
  onResetFilters: () => void
  /** Callback when export is clicked */
  onExport?: () => void
  /** Whether export is in progress */
  isExporting?: boolean
  /** Available class options */
  classOptions?: string[]
  /** Whether filters are currently loading */
  isLoading?: boolean
}

/**
 * Get today's date in YYYY-MM-DD format
 */
const getTodayDate = (): string => {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

/**
 * Get date 7 days ago in YYYY-MM-DD format
 */
const getWeekAgoDate = (): string => {
  const date = new Date()
  date.setDate(date.getDate() - 7)
  return date.toISOString().split('T')[0]
}

/**
 * AttendanceFilters Component
 * Provides filter controls for attendance history
 */
export const AttendanceFilters: React.FC<AttendanceFiltersProps> = ({
  filters,
  onFiltersChange,
  onApplyFilters,
  onResetFilters,
  onExport,
  isExporting = false,
  classOptions = [],
  isLoading = false,
}) => {
  const [localFilters, setLocalFilters] = useState<AttendanceFilterValues>(filters)
  const [hasChanges, setHasChanges] = useState(false)

  // Sync local filters with prop filters
  useEffect(() => {
    setLocalFilters(filters)
    setHasChanges(false)
  }, [filters])

  /**
   * Handle individual filter change
   */
  const handleFilterChange = <K extends keyof AttendanceFilterValues>(
    key: K,
    value: AttendanceFilterValues[K]
  ): void => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
    setHasChanges(true)
  }

  /**
   * Handle filter removal
   */
  const handleRemoveFilter = <K extends keyof AttendanceFilterValues>(key: K): void => {
    const newFilters = { ...localFilters }
    delete newFilters[key]
    setLocalFilters(newFilters)
    setHasChanges(true)
  }

  /**
   * Apply filters
   */
  const handleApply = (): void => {
    onFiltersChange(localFilters)
    onApplyFilters()
    setHasChanges(false)
  }

  /**
   * Reset all filters
   */
  const handleReset = (): void => {
    const emptyFilters: AttendanceFilterValues = {}
    setLocalFilters(emptyFilters)
    onFiltersChange(emptyFilters)
    onResetFilters()
    setHasChanges(false)
  }

  /**
   * Set quick date range presets
   */
  const handleQuickRange = (preset: 'today' | 'week' | 'month'): void => {
    const endDate = getTodayDate()
    let startDate = endDate

    switch (preset) {
      case 'today':
        startDate = endDate
        break
      case 'week':
        startDate = getWeekAgoDate()
        break
      case 'month': {
        const date = new Date()
        date.setMonth(date.getMonth() - 1)
        startDate = date.toISOString().split('T')[0]
        break
      }
    }

    const newFilters = { ...localFilters, startDate, endDate }
    setLocalFilters(newFilters)
    setHasChanges(true)
  }

  /**
   * Count active filters
   */
  const activeFilterCount = Object.keys(localFilters).length

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Filters</h3>
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </div>
            {onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                disabled={isExporting}
              >
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? 'Exporting...' : 'Export CSV'}
              </Button>
            )}
          </div>

          {/* Quick Date Presets */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-muted-foreground self-center">Quick:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickRange('today')}
              disabled={isLoading}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickRange('week')}
              disabled={isLoading}
            >
              Last 7 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickRange('month')}
              disabled={isLoading}
            >
              Last 30 Days
            </Button>
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <div className="flex gap-1">
                <Input
                  id="startDate"
                  type="date"
                  value={localFilters.startDate || ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  disabled={isLoading}
                  className="flex-1"
                />
                {localFilters.startDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFilter('startDate')}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <div className="flex gap-1">
                <Input
                  id="endDate"
                  type="date"
                  value={localFilters.endDate || ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  disabled={isLoading}
                  className="flex-1"
                />
                {localFilters.endDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFilter('endDate')}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Class Filter */}
            <div className="space-y-2">
              <Label htmlFor="class">Class</Label>
              <div className="flex gap-1">
                <Select
                  value={localFilters.class || 'all'}
                  onValueChange={(value) =>
                    value === 'all'
                      ? handleRemoveFilter('class')
                      : handleFilterChange('class', value)
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger id="class" className="flex-1">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classOptions.length > 0 ? (
                      classOptions.map((className) => (
                        <SelectItem key={className} value={className}>
                          {className}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="X-1">X-1</SelectItem>
                        <SelectItem value="X-2">X-2</SelectItem>
                        <SelectItem value="XI-1">XI-1</SelectItem>
                        <SelectItem value="XI-2">XI-2</SelectItem>
                        <SelectItem value="XII-1">XII-1</SelectItem>
                        <SelectItem value="XII-2">XII-2</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <div className="flex gap-1">
                <Select
                  value={localFilters.status || 'all'}
                  onValueChange={(value) =>
                    value === 'all'
                      ? handleRemoveFilter('status')
                      : handleFilterChange('status', value as AttendanceStatus)
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger id="status" className="flex-1">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="hadir">✓ Hadir</SelectItem>
                    <SelectItem value="alpha">✗ Alpha</SelectItem>
                    <SelectItem value="izin">ⓘ Izin</SelectItem>
                    <SelectItem value="sakit">⚕ Sakit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              onClick={handleApply}
              disabled={!hasChanges || isLoading}
              className="flex-1 md:flex-none"
            >
              <Filter className="mr-2 h-4 w-4" />
              Apply Filters
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={activeFilterCount === 0 || isLoading}
              className="flex-1 md:flex-none"
            >
              <X className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
