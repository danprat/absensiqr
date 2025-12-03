/**
 * OfflineIndicator Component
 * Shows online/offline status and pending sync count
 */

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Cloud, CloudOff, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import { type SyncStatus } from '@/hooks/useOfflineSync'

export interface OfflineIndicatorProps {
  isOnline: boolean
  syncStatus: SyncStatus
  onSyncClick?: () => void
  className?: string
}

/**
 * Format last sync time
 */
function formatLastSyncTime(timestamp: number | null): string {
  if (!timestamp) {
    return 'Never'
  }

  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)

  if (minutes < 1) {
    return 'Just now'
  } else if (minutes < 60) {
    return `${minutes}m ago`
  } else if (hours < 24) {
    return `${hours}h ago`
  } else {
    return new Date(timestamp).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
}

/**
 * OfflineIndicator component
 */
export function OfflineIndicator({
  isOnline,
  syncStatus,
  onSyncClick,
  className = '',
}: OfflineIndicatorProps) {
  const { isSyncing, lastSyncTime, pendingCount, syncError } = syncStatus

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Online/Offline Status Badge */}
      <Badge
        variant={isOnline ? 'default' : 'secondary'}
        className={`flex items-center gap-1.5 px-3 py-1.5 ${
          isOnline ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-500 hover:bg-gray-600'
        }`}
      >
        {isOnline ? (
          <>
            <Cloud className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Online</span>
          </>
        ) : (
          <>
            <CloudOff className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Offline</span>
          </>
        )}
      </Badge>

      {/* Pending Count Badge */}
      {pendingCount > 0 && (
        <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
          <span className="text-xs font-medium">
            {pendingCount} pending scan{pendingCount !== 1 ? 's' : ''}
          </span>
        </Badge>
      )}

      {/* Sync Success Indicator */}
      {isOnline && pendingCount === 0 && lastSyncTime && !syncError && (
        <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          <span className="text-xs text-muted-foreground">Synced {formatLastSyncTime(lastSyncTime)}</span>
        </Badge>
      )}

      {/* Sync Error Indicator */}
      {syncError && (
        <Badge variant="destructive" className="flex items-center gap-1.5 px-3 py-1.5">
          <AlertCircle className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Sync failed</span>
        </Badge>
      )}

      {/* Manual Sync Button */}
      {isOnline && onSyncClick && pendingCount > 0 && (
        <Button
          onClick={onSyncClick}
          size="sm"
          variant="outline"
          disabled={isSyncing}
          className="h-8"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span className="text-xs">{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
        </Button>
      )}
    </div>
  )
}
