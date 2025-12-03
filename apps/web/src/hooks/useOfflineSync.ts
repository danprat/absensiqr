/**
 * useOfflineSync Hook
 * Manages offline scan queue and synchronization with backend
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { dbHelpers, type PendingScan } from '@/lib/db'
import {
  attendanceService,
  type OfflineScanItem,
  type SyncOfflineScansResponse,
  type AttendanceStatus,
} from '@/services/attendance'

export interface UseOfflineSyncConfig {
  token: string | null
  schoolId: string | null
  autoSync?: boolean
  syncInterval?: number
  maxRetries?: number
  backoffMultiplier?: number
}

export interface SyncStatus {
  isSyncing: boolean
  lastSyncTime: number | null
  pendingCount: number
  syncError: string | null
}

export interface UseOfflineSyncReturn {
  isOnline: boolean
  syncStatus: SyncStatus
  queueScan: (scan: QueuedScanData) => Promise<void>
  triggerSync: () => Promise<SyncOfflineScansResponse | null>
  clearSyncError: () => void
  getPendingScans: () => Promise<PendingScan[]>
}

export interface QueuedScanData {
  studentId: string
  qrCode: string
  status: AttendanceStatus
  scanTime: number
  location?: string
  notes?: string
}

const DEFAULT_SYNC_INTERVAL = 30000 // 30 seconds
const DEFAULT_MAX_RETRIES = 3
const DEFAULT_BACKOFF_MULTIPLIER = 2

/**
 * Hook for managing offline scans and synchronization
 */
export function useOfflineSync(config: UseOfflineSyncConfig): UseOfflineSyncReturn {
  const {
    token,
    schoolId,
    autoSync = true,
    syncInterval = DEFAULT_SYNC_INTERVAL,
    maxRetries = DEFAULT_MAX_RETRIES,
    backoffMultiplier = DEFAULT_BACKOFF_MULTIPLIER,
  } = config

  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSyncTime: null,
    pendingCount: 0,
    syncError: null,
  })

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const retryCountRef = useRef(0)
  const isSyncingRef = useRef(false)

  /**
   * Update online status
   */
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  /**
   * Get count of pending scans
   */
  const updatePendingCount = useCallback(async () => {
    try {
      const pending = await dbHelpers.getPendingScans()
      setSyncStatus((prev) => ({ ...prev, pendingCount: pending.length }))
    } catch (error) {
      console.error('Error getting pending scans count:', error)
    }
  }, [])

  /**
   * Queue a scan to IndexedDB
   */
  const queueScan = useCallback(
    async (scan: QueuedScanData) => {
      if (!schoolId) {
        throw new Error('School ID is required to queue scans')
      }

      try {
        await dbHelpers.addPendingScan({
          student_id: scan.studentId,
          school_id: schoolId,
          scan_time: scan.scanTime,
          location: scan.location,
          notes: scan.notes,
        })

        await updatePendingCount()
      } catch (error) {
        console.error('Error queuing scan:', error)
        throw error
      }
    },
    [schoolId, updatePendingCount]
  )

  /**
   * Get all pending scans
   */
  const getPendingScans = useCallback(async (): Promise<PendingScan[]> => {
    try {
      return await dbHelpers.getPendingScans()
    } catch (error) {
      console.error('Error getting pending scans:', error)
      return []
    }
  }, [])

  /**
   * Convert PendingScan to OfflineScanItem format
   */
  const convertToOfflineScanItem = (scan: PendingScan): OfflineScanItem => {
    // In a real scenario, we'd need to fetch the QR code from the scan data
    // For now, we'll use a placeholder. In production, store qrCode in PendingScan
    return {
      qrCode: `SCAN_${scan.student_id}`, // This should be the actual QR code
      status: 'hadir', // Default status, should be stored in PendingScan
      timestamp: new Date(scan.scan_time).toISOString(),
      notes: scan.notes || undefined,
    }
  }

  /**
   * Sync pending scans with backend
   */
  const triggerSync = useCallback(async (): Promise<SyncOfflineScansResponse | null> => {
    // Prevent concurrent syncs
    if (isSyncingRef.current) {
      return null
    }

    // Check requirements
    if (!isOnline || !token || !schoolId) {
      return null
    }

    try {
      isSyncingRef.current = true
      setSyncStatus((prev) => ({ ...prev, isSyncing: true, syncError: null }))

      // Get pending scans
      const pendingScans = await dbHelpers.getPendingScans()

      if (pendingScans.length === 0) {
        setSyncStatus((prev) => ({
          ...prev,
          isSyncing: false,
          lastSyncTime: Date.now(),
        }))
        retryCountRef.current = 0
        return { synced: 0, failed: 0, conflicts: [] }
      }

      // Convert to API format
      const scansToSync: OfflineScanItem[] = pendingScans.map(convertToOfflineScanItem)

      // Sync with backend
      const result = await attendanceService.syncOfflineScans(token, scansToSync)

      // Mark synced scans as synced in IndexedDB
      if (result.synced > 0) {
        // Mark scans as synced (in production, track which specific scans succeeded)
        const syncedScans = pendingScans.slice(0, result.synced)
        for (const scan of syncedScans) {
          if (scan.id) {
            await dbHelpers.markScanAsSynced(scan.id)
          }
        }
      }

      // Clean up synced scans
      await dbHelpers.clearSyncedScans()

      // Update status
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: Date.now(),
        pendingCount: result.failed,
        syncError: null,
      }))

      // Reset retry count on success
      retryCountRef.current = 0

      return result
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to sync offline scans'

      // Implement exponential backoff
      retryCountRef.current += 1

      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        syncError: errorMessage,
      }))

      console.error('Sync error:', error)
      return null
    } finally {
      isSyncingRef.current = false
    }
  }, [isOnline, token, schoolId])

  /**
   * Clear sync error
   */
  const clearSyncError = useCallback(() => {
    setSyncStatus((prev) => ({ ...prev, syncError: null }))
  }, [])

  /**
   * Auto-sync on online status change and interval
   */
  useEffect(() => {
    if (!autoSync || !isOnline || !token || !schoolId) {
      return
    }

    // Trigger sync when coming online
    triggerSync()

    // Set up periodic sync with exponential backoff
    const scheduleNextSync = () => {
      const backoffDelay =
        syncInterval * Math.pow(backoffMultiplier, Math.min(retryCountRef.current, maxRetries))

      syncIntervalRef.current = setTimeout(() => {
        triggerSync().then(() => {
          scheduleNextSync()
        })
      }, backoffDelay)
    }

    scheduleNextSync()

    return () => {
      if (syncIntervalRef.current) {
        clearTimeout(syncIntervalRef.current)
      }
    }
  }, [
    autoSync,
    isOnline,
    token,
    schoolId,
    syncInterval,
    maxRetries,
    backoffMultiplier,
    triggerSync,
  ])

  /**
   * Update pending count on mount
   */
  useEffect(() => {
    updatePendingCount()
  }, [updatePendingCount])

  return {
    isOnline,
    syncStatus,
    queueScan,
    triggerSync,
    clearSyncError,
    getPendingScans,
  }
}
