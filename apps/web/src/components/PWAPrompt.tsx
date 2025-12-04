import { useEffect, useState } from 'react'

/**
 * Interface for the beforeinstallprompt event
 * @see https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent
 */
interface BeforeInstallPromptEvent extends Event {
  /**
   * Returns an array of DOMString items containing the platforms on which the event was dispatched.
   * This is provided for user agents that want to present a choice of versions to the user such as,
   * for example, "web" or "play" which would allow the user to chose between a web version or
   * an Android version.
   */
  readonly platforms: string[]

  /**
   * Returns a Promise that resolves to a DOMString containing either "accepted" or "dismissed".
   */
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>

  /**
   * Allows a developer to show the install prompt at a time of their own choosing.
   * This method returns a Promise.
   */
  prompt: () => Promise<void>
}

/**
 * PWA installation prompt component
 * Shows a native install prompt for supported browsers
 */
export function PWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState<boolean>(false)
  const [isInstalled, setIsInstalled] = useState<boolean>(false)

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      // Check if running in standalone mode (already installed)
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true)
        return true
      }

      // Check if running as PWA on iOS
      if ((window.navigator as unknown as { standalone?: boolean }).standalone === true) {
        setIsInstalled(true)
        return true
      }

      return false
    }

    if (checkInstalled()) {
      return
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()

      // Stash the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      // Show the install prompt after a short delay
      setTimeout(() => {
        setShowPrompt(true)
      }, 3000) // Wait 3 seconds before showing prompt
    }

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
      console.log('PWA installed successfully')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  /**
   * Handle install button click
   */
  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return
    }

    // Show the install prompt
    await deferredPrompt.prompt()

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
    }

    // Clear the deferred prompt
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  /**
   * Handle dismiss button click
   */
  const handleDismiss = () => {
    setShowPrompt(false)
  }

  // Don't show if already installed or prompt not available
  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null
  }

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-lg bg-white p-4 shadow-lg md:left-auto md:right-8"
      role="dialog"
      aria-labelledby="pwa-prompt-title"
      aria-describedby="pwa-prompt-description"
    >
      <div className="flex items-start gap-3">
        {/* App Icon */}
        <div className="flex-shrink-0">
          <img
            src="/icons/icon-192x192.png"
            alt="AbsensiQR Logo"
            className="h-12 w-12 rounded-lg"
          />
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3
            id="pwa-prompt-title"
            className="text-lg font-semibold text-gray-900"
          >
            Install AbsensiQR
          </h3>
          <p
            id="pwa-prompt-description"
            className="mt-1 text-sm text-gray-600"
          >
            Install app untuk akses cepat dan fitur offline
          </p>

          {/* Actions */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleInstallClick}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              type="button"
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              type="button"
            >
              Nanti
            </button>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none"
          type="button"
          aria-label="Close install prompt"
        >
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

/**
 * Hook to check if app is running as installed PWA
 */
export function useIsInstalled(): boolean {
  const [isInstalled, setIsInstalled] = useState<boolean>(false)

  useEffect(() => {
    const checkInstalled = (): boolean => {
      // Check if running in standalone mode
      if (window.matchMedia('(display-mode: standalone)').matches) {
        return true
      }

      // Check if running as PWA on iOS
      if ((window.navigator as unknown as { standalone?: boolean }).standalone === true) {
        return true
      }

      return false
    }

    setIsInstalled(checkInstalled())
  }, [])

  return isInstalled
}

/**
 * Hook to check online/offline status
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine)

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

  return isOnline
}

/**
 * Offline indicator component
 * Shows a banner when the app is offline
 */
export function OfflineIndicator() {
  const isOnline = useOnlineStatus()

  if (isOnline) {
    return null
  }

  return (
    <div
      className="fixed left-0 right-0 top-0 z-50 bg-yellow-500 px-4 py-2 text-center text-sm font-medium text-white"
      role="alert"
    >
      <span className="inline-flex items-center gap-2">
        <svg
          className="h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        Mode Offline - Data akan disinkronkan saat terhubung
      </span>
    </div>
  )
}
