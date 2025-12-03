import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QRScanner } from '@/components/scanner/QRScanner'
import { ScanResult } from '@/components/scanner/ScanResult'
import { OfflineIndicator } from '@/components/OfflineIndicator'
import { useAuth } from '@/hooks/useAuth'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { attendanceService, type ScanAttendanceResponse } from '@/services/attendance'
import type { QRScanResult, QRScanError } from '@/hooks/useQRScanner'
import { ApiClientError } from '@/services/api'

export function ScanPage() {
  const { token, school } = useAuth()
  const [scanResult, setScanResult] = useState<ScanAttendanceResponse | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Initialize offline sync
  const { isOnline, syncStatus, queueScan, triggerSync } = useOfflineSync({
    token,
    schoolId: school?.id || null,
    autoSync: true,
    syncInterval: 30000, // 30 seconds
  })

  /**
   * Handle successful QR scan
   */
  const handleScanSuccess = useCallback(
    async (result: QRScanResult) => {
      // Prevent duplicate processing
      if (isProcessing) return

      setIsProcessing(true)
      setScanError(null)
      setScanResult(null)

      try {
        if (!token) {
          throw new Error('Authentication required. Please login.')
        }

        // Device info for tracking
        const deviceInfo = {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          timestamp: result.timestamp,
        }

        if (isOnline) {
          // Online: Submit directly to API
          const response = await attendanceService.scanAttendance(token, {
            qrCode: result.decodedText,
            status: 'hadir', // Default status
            timestamp: new Date(result.timestamp).toISOString(),
            deviceInfo,
          })
          setScanResult(response)
        } else {
          // Offline: Queue for later sync
          // Parse QR code to get student ID (assuming format: SCHOOL_ID:STUDENT_ID)
          const qrParts = result.decodedText.split(':')
          if (qrParts.length !== 2) {
            throw new Error('Invalid QR code format')
          }

          await queueScan({
            studentId: qrParts[1],
            qrCode: result.decodedText,
            status: 'hadir',
            scanTime: result.timestamp,
            notes: 'Offline scan',
          })

          // Show offline success message
          setScanResult({
            success: true,
            student: {
              id: qrParts[1],
              name: 'Student',
              class: 'Unknown',
              studentNumber: 'N/A',
            },
            status: 'hadir',
            scanTime: new Date(result.timestamp).toISOString(),
            warnings: ['Scan saved offline. Will sync when connection is restored.'],
          })
        }
      } catch (error) {
        console.error('Scan error:', error)

        if (error instanceof ApiClientError) {
          setScanError(error.message)
        } else if (error instanceof Error) {
          setScanError(error.message)
        } else {
          setScanError('Failed to process scan. Please try again.')
        }
      } finally {
        setIsProcessing(false)
      }
    },
    [token, isOnline, isProcessing, queueScan]
  )

  /**
   * Handle scanner errors (camera/permission issues)
   */
  const handleScanError = useCallback((error: QRScanError) => {
    console.error('Scanner error:', error)
    // Don't set scanError for minor scanner issues, only for critical errors
    if (error.name === 'PermissionError') {
      setScanError(error.message)
    }
  }, [])

  /**
   * Clear scan result and continue scanning
   */
  const handleClearResult = useCallback(() => {
    setScanResult(null)
    setScanError(null)
  }, [])

  /**
   * Trigger manual sync
   */
  const handleManualSync = useCallback(async () => {
    try {
      const result = await triggerSync()
      if (result && result.synced > 0) {
        // Show success notification (could use toast here)
        console.log(`Successfully synced ${result.synced} scans`)
      }
    } catch (error) {
      console.error('Manual sync failed:', error)
    }
  }, [triggerSync])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Scan QR Code</h2>
          <p className="text-muted-foreground">Scan student QR codes for attendance</p>
        </div>
        <OfflineIndicator
          isOnline={isOnline}
          syncStatus={syncStatus}
          onSyncClick={handleManualSync}
        />
      </div>

      {/* Scanner Card */}
      <Card>
        <CardHeader>
          <CardTitle>QR Scanner</CardTitle>
        </CardHeader>
        <CardContent>
          {scanResult || scanError ? (
            // Show result
            <ScanResult
              result={scanResult}
              error={scanError}
              onClose={handleClearResult}
            />
          ) : (
            // Show scanner
            <QRScanner
              onScanSuccess={handleScanSuccess}
              onScanError={handleScanError}
              isEnabled={!isProcessing}
            />
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      {!scanResult && !scanError && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>📱 <strong>How to scan:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Allow camera permissions when prompted</li>
                <li>Point the camera at the student's QR code</li>
                <li>Wait for automatic detection and processing</li>
                <li>View scan result and continue to next student</li>
              </ol>
              <p className="mt-4">
                💡 <strong>Offline mode:</strong> Scans are automatically saved when offline and synced
                when connection is restored.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
