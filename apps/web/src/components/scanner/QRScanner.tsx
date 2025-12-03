/**
 * QRScanner Component
 * Renders QR code scanner interface with camera feed
 */

import { useEffect, useRef } from 'react'
import { useQRScanner, type QRScanResult, type QRScanError } from '@/hooks/useQRScanner'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Camera, CameraOff, Pause, Play, AlertCircle } from 'lucide-react'

export interface QRScannerProps {
  onScanSuccess: (result: QRScanResult) => void
  onScanError?: (error: QRScanError) => void
  isEnabled?: boolean
  className?: string
}

const SCANNER_ELEMENT_ID = 'qr-scanner-reader'

/**
 * QR Scanner component with camera feed
 */
export function QRScanner({
  onScanSuccess,
  onScanError,
  isEnabled = true,
  className = '',
}: QRScannerProps) {
  const {
    isScanning,
    isPaused,
    hasPermission,
    error,
    startScanning,
    stopScanning,
    pauseScanning,
    resumeScanning,
    clearError,
  } = useQRScanner(SCANNER_ELEMENT_ID, onScanSuccess, onScanError, {
    fps: 10,
    qrbox: { width: 250, height: 250 },
    aspectRatio: 1.0,
    disableFlip: false,
    rememberLastUsedCamera: true,
  })

  const hasStartedRef = useRef(false)

  /**
   * Auto-start scanner when enabled
   */
  useEffect(() => {
    if (isEnabled && !isScanning && !hasStartedRef.current) {
      hasStartedRef.current = true
      startScanning()
    }

    // Cleanup on unmount or when disabled
    return () => {
      if (!isEnabled && isScanning) {
        stopScanning()
        hasStartedRef.current = false
      }
    }
  }, [isEnabled, isScanning, startScanning, stopScanning])

  /**
   * Handle start button click
   */
  const handleStart = async () => {
    clearError()
    await startScanning()
  }

  /**
   * Handle stop button click
   */
  const handleStop = async () => {
    await stopScanning()
    hasStartedRef.current = false
  }

  /**
   * Handle pause/resume toggle
   */
  const handlePauseResume = () => {
    if (isPaused) {
      resumeScanning()
    } else {
      pauseScanning()
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Scanner Error</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Permission Denied Alert */}
      {hasPermission === false && !error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Camera Permission Required</AlertTitle>
          <AlertDescription>
            Please allow camera access to scan QR codes. You may need to enable it in your browser
            settings.
          </AlertDescription>
        </Alert>
      )}

      {/* Scanner Container */}
      <div className="relative rounded-lg overflow-hidden bg-black">
        <div
          id={SCANNER_ELEMENT_ID}
          className="w-full min-h-[400px] max-h-[600px]"
          style={{ aspectRatio: '1/1' }}
        />

        {/* Overlay when paused */}
        {isPaused && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-white text-center">
              <Pause className="h-16 w-16 mx-auto mb-2" />
              <p className="text-lg font-semibold">Scanner Paused</p>
            </div>
          </div>
        )}

        {/* Overlay when not scanning */}
        {!isScanning && !error && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <div className="text-white text-center">
              <CameraOff className="h-16 w-16 mx-auto mb-2 opacity-50" />
              <p className="text-lg font-semibold">Scanner Inactive</p>
              <p className="text-sm text-gray-300 mt-1">Click Start to begin scanning</p>
            </div>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex gap-2 justify-center">
        {!isScanning ? (
          <Button onClick={handleStart} size="lg" className="min-w-[120px]">
            <Camera className="mr-2 h-5 w-5" />
            Start Scanning
          </Button>
        ) : (
          <>
            <Button onClick={handlePauseResume} variant="outline" size="lg">
              {isPaused ? (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="mr-2 h-5 w-5" />
                  Pause
                </>
              )}
            </Button>
            <Button onClick={handleStop} variant="destructive" size="lg">
              <CameraOff className="mr-2 h-5 w-5" />
              Stop
            </Button>
          </>
        )}
      </div>

      {/* Scanning Status */}
      {isScanning && !isPaused && (
        <div className="text-center text-sm text-muted-foreground">
          <div className="inline-flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Scanning for QR codes...</span>
          </div>
        </div>
      )}
    </div>
  )
}
