# PWA Implementation - AbsensiQR

## Overview
Complete Progressive Web App implementation for offline support and installability.

## Implemented Features

### 1. Service Worker (`public/sw.js`)
- **Precaching**: App shell and static assets cached on install
- **Network First**: API calls with fallback to cache for offline support
- **Cache First**: Images and fonts for optimal performance
- **Stale While Revalidate**: Other resources for balance between freshness and speed
- **Automatic cleanup**: Old caches are removed on activation

### 2. PWA Manifest (`public/manifest.json`)
- Complete PWA metadata (name, description, icons)
- App shortcuts for quick access to Scan and Dashboard
- Installable as standalone app
- Optimized for mobile (portrait-primary orientation)
- Indonesian language support (id-ID)

### 3. PWA Components (`src/components/PWAPrompt.tsx`)

#### `<PWAPrompt />` Component
- Shows native install prompt after 3 seconds
- Handles `beforeinstallprompt` event
- Dismissible by user
- Auto-hides if app is already installed
- Accessible UI with proper ARIA labels

#### `<OfflineIndicator />` Component  
- Shows banner when offline
- Monitors online/offline events
- User-friendly Indonesian messages

#### Hooks
- `useIsInstalled()`: Check if app is running as installed PWA
- `useOnlineStatus()`: Monitor network connection status

### 4. IndexedDB Integration (`src/lib/db.ts`)
Existing Dexie.js implementation provides:
- **cached_students**: Student data for offline access
- **pending_scans**: Queue scans when offline, sync when online
- **cached_attendance**: Attendance history for offline viewing

Helper functions for:
- Caching students and attendance
- Managing pending scans
- Clearing caches by school

### 5. HTML Enhancements (`index.html`)
- PWA meta tags (theme-color, viewport)
- Apple Touch Icon support
- Microsoft Tiles configuration
- Proper manifest link

### 6. Service Worker Registration (`src/main.tsx`)
- Automatic registration on page load
- Console logging for debugging
- Error handling

## Usage

### Installing the App
1. Visit the app in a supported browser (Chrome, Edge, Safari)
2. After 3 seconds, install prompt will appear
3. Click "Install" to add to home screen
4. App opens in standalone mode

### Offline Functionality
- **Automatic**: App works offline automatically
- **Visual indicator**: Yellow banner shows when offline
- **Syncing**: Pending scans sync automatically when back online

### Using Offline Data
```typescript
import { dbHelpers } from '@/lib/db'

// Cache students for offline access
await dbHelpers.cacheStudent({
  id: '123',
  school_id: 'school-1',
  name: 'John Doe',
  identifier: 'ST001',
  is_active: true
})

// Add scan when offline
await dbHelpers.addPendingScan({
  student_id: '123',
  school_id: 'school-1',
  scan_time: Date.now(),
  location: 'Main Gate'
})

// Get pending scans to sync
const pendingScans = await dbHelpers.getPendingScans()
```

## Known Issues & Resolutions

### Build Error with vite-plugin-pwa v1.2.0
**Issue**: vite-plugin-pwa v1.2.0 has compatibility issues with zod v3.22.3, causing build failures.

**Error Message**:
```
Missing "./v4/core" specifier in "zod" package
```

**Resolution Applied**: 
- Disabled vite-plugin-pwa in vite.config.ts
- Created custom service worker (`public/sw.js`) with equivalent functionality
- Service worker is manually registered in `main.tsx`
- Build now succeeds with full PWA functionality

**Future Fix**:
Update vite-plugin-pwa to latest version (v0.20.x or higher):
```bash
npm install -D vite-plugin-pwa@latest
```

Then restore PWA plugin configuration in `vite.config.ts`.

### TypeScript Validation
✅ All TypeScript checks pass with `npm run typecheck`

## File Structure
```
apps/web/
├── public/
│   ├── sw.js                    # Service worker
│   ├── manifest.json            # PWA manifest
│   └── icons/
│       ├── icon-192x192.png     # App icon
│       └── icon-512x512.png     # App icon (large)
├── src/
│   ├── components/
│   │   └── PWAPrompt.tsx        # Install prompt & offline indicator
│   ├── lib/
│   │   └── db.ts                # IndexedDB (Dexie)
│   ├── App.tsx                  # Integrated PWA components
│   └── main.tsx                 # SW registration
├── index.html                   # PWA meta tags
└── vite.config.ts               # Build config
```

## Testing

### Test Offline Mode
1. Open DevTools → Network tab
2. Select "Offline" throttling
3. Reload page - app should still work
4. Yellow offline indicator should appear
5. Try navigating - cached pages load instantly

### Test Install Prompt
1. Open app in Chrome/Edge (desktop or mobile)
2. Wait 3 seconds
3. Install prompt should appear bottom-right
4. Click "Install" button
5. App should open in standalone window

### Test Service Worker
1. Open DevTools → Application tab
2. Check Service Workers section
3. Should see "sw.js" registered and activated
4. Check Cache Storage
5. Should see caches: `absensiqr-v1`, `absensiqr-api-v1`, `absensiqr-images-v1`

### Test Data Sync
1. Go offline
2. Scan a student QR code (will queue in IndexedDB)
3. Go back online
4. Pending scan should sync automatically
5. Check browser console for sync logs

## Performance Metrics
- **First Load**: Full network request
- **Subsequent Loads**: Instant from cache
- **Offline**: 100% functional for cached content
- **API Calls**: 10s network timeout, then cache fallback
- **Images**: Cached up to 30 days
- **Static Assets**: Cached up to 7 days

## Browser Support
- ✅ Chrome/Edge 90+
- ✅ Safari 15+ (iOS and macOS)
- ✅ Firefox 90+
- ⚠️ Internet Explorer: Not supported

## Maintenance

### Clearing Cache
To clear all caches programmatically:
```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.controller?.postMessage({
    type: 'CLEAR_CACHE'
  });
}
```

### Updating Service Worker
When deploying updates:
1. Increment `CACHE_VERSION` in `sw.js`
2. Deploy new version
3. Service worker updates automatically
4. Users get update on next page load

### Monitoring
Check these in DevTools Console:
- `[SW] Install event` - Service worker installing
- `[SW] Activate event` - Service worker activated
- `[SW] Precaching app shell` - Assets being cached
- `[SW] Deleting old cache` - Old caches cleaned up
