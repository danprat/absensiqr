import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
// NOTE: vite-plugin-pwa v1.2.0 has build issues with zod v3.22.3
// PWA functionality is implemented using custom service worker registration in main.tsx
// and manifest.json in public/ directory. Service worker file (sw.js) needs to be
// created manually or plugin version needs to be updated to latest (v0.20.x)
export default defineConfig({
  plugins: [
    react(),
    // VitePWA temporarily disabled due to build issues with zod package
    // TODO: Update vite-plugin-pwa to v0.20.x or later to fix the issue
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
