/**
 * useQRScanner Hook
 * Manages QR code scanning with html5-qrcode
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export interface QRScannerConfig {
  fps?: number
  qrbox?: number | { width: number; height: number }
  aspectRatio?: number
  disableFlip?: boolean
  rememberLastUsedCamera?: boolean
}

export interface QRScanResult {
  decodedText: string
  timestamp: number
}

export interface QRScanError {
  message: string
  name: string
}

export interface UseQRScannerReturn {
  isScanning: boolean
  isPaused: boolean
  hasPermission: boolean | null
  error: QRScanError | null
  lastScan: QRScanResult | null
  startScanning: () => Promise<void>
  stopScanning: () => Promise<void>
  pauseScanning: () => void
  resumeScanning: () => void
  clearError: () => void
}

const DEFAULT_CONFIG: QRScannerConfig = {
  fps: 10,
  qrbox: { width: 250, height: 250 },
  aspectRatio: 1.0,
  disableFlip: false,
  rememberLastUsedCamera: true,
}

/**
 * Hook for QR code scanning functionality
 */
export function useQRScanner(
  elementId: string,
  onScanSuccess: (result: QRScanResult) => void,
  onScanError?: (error: QRScanError) => void,
  config?: QRScannerConfig
): UseQRScannerReturn {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<QRScanError | null>(null)
  const [lastScan, setLastScan] = useState<QRScanResult | null>(null)

  // Merge config with defaults
  const scannerConfig: QRScannerConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  }

  /**
   * Request camera permissions
   */
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      // Stop the stream immediately after getting permission
      stream.getTracks().forEach((track) => track.stop())
      setHasPermission(true)
      return true
    } catch (err) {
      const errorObj: QRScanError = {
        name: 'PermissionError',
        message:
          err instanceof Error
            ? err.message
            : 'Camera permission denied. Please enable camera access in your browser settings.',
      }
      setError(errorObj)
      setHasPermission(false)
      if (onScanError) {
        onScanError(errorObj)
      }
      return false
    }
  }, [onScanError])

  /**
   * Handle successful scan
   */
  const handleScanSuccess = useCallback(
    (decodedText: string) => {
      const result: QRScanResult = {
        decodedText,
        timestamp: Date.now(),
      }
      setLastScan(result)
      onScanSuccess(result)
    },
    [onScanSuccess]
  )

  /**
   * Handle scan error (typically when no QR code is detected)
   */
  const handleScanError = useCallback(
    (errorMessage: string) => {
      // Ignore "No QR code found" errors as they're expected during scanning
      if (
        errorMessage.includes('No MultiFormat Readers') ||
        errorMessage.includes('NotFoundException')
      ) {
        return
      }

      const errorObj: QRScanError = {
        name: 'ScanError',
        message: errorMessage,
      }

      // Only call onScanError for actual errors, not for "no code found" messages
      if (onScanError && !errorMessage.includes('No QR code found')) {
        onScanError(errorObj)
      }
    },
    [onScanError]
  )

  /**
   * Start scanning
   */
  const startScanning = useCallback(async () => {
    try {
      // Check if already scanning
      if (isScanning || scannerRef.current) {
        return
      }

      // Request permissions first
      const hasPermissionGranted = await requestPermissions()
      if (!hasPermissionGranted) {
        return
      }

      // Initialize scanner
      const html5QrCode = new Html5Qrcode(elementId)
      scannerRef.current = html5QrCode

      // Start scanning with back camera
      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: scannerConfig.fps || 10,
          qrbox: scannerConfig.qrbox,
          aspectRatio: scannerConfig.aspectRatio,
          disableFlip: scannerConfig.disableFlip,
        },
        handleScanSuccess,
        handleScanError
      )

      setIsScanning(true)
      setIsPaused(false)
      setError(null)
    } catch (err) {
      const errorObj: QRScanError = {
        name: 'ScannerInitError',
        message:
          err instanceof Error
            ? err.message
            : 'Failed to initialize QR scanner. Please check camera permissions.',
      }
      setError(errorObj)
      setIsScanning(false)
      if (onScanError) {
        onScanError(errorObj)
      }
    }
  }, [
    elementId,
    isScanning,
    scannerConfig,
    handleScanSuccess,
    handleScanError,
    requestPermissions,
    onScanError,
  ])

  /**
   * Stop scanning
   */
  const stopScanning = useCallback(async () => {
    try {
      if (scannerRef.current && isScanning) {
        await scannerRef.current.stop()
        scannerRef.current.clear()
        scannerRef.current = null
        setIsScanning(false)
        setIsPaused(false)
      }
    } catch (err) {
      console.error('Error stopping scanner:', err)
    }
  }, [isScanning])

  /**
   * Pause scanning
   */
  const pauseScanning = useCallback(() => {
    if (scannerRef.current && isScanning && !isPaused) {
      scannerRef.current.pause()
      setIsPaused(true)
    }
  }, [isScanning, isPaused])

  /**
   * Resume scanning
   */
  const resumeScanning = useCallback(() => {
    if (scannerRef.current && isScanning && isPaused) {
      scannerRef.current.resume()
      setIsPaused(false)
    }
  }, [isScanning, isPaused])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current
          .stop()
          .then(() => {
            if (scannerRef.current) {
              scannerRef.current.clear()
            }
          })
          .catch((err) => {
            console.error('Error cleaning up scanner:', err)
          })
      }
    }
  }, [isScanning])

  return {
    isScanning,
    isPaused,
    hasPermission,
    error,
    lastScan,
    startScanning,
    stopScanning,
    pauseScanning,
    resumeScanning,
    clearError,
  }
}
