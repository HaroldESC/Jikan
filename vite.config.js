import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Lazy chunks of the export libs (v3.0): they are only needed when the user
// exports to PDF/XLSX, so they are NOT precached. They get cached on first use
// by the StaleWhileRevalidate rule for /assets/*.
const LAZY_CHUNKS = [
  '**/xlsx-*.js',
  '**/jspdf*.js',
  '**/html2canvas*.js',
  '**/index.es-*.js',
  '**/purify.es-*.js',
]

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // App data lives in IndexedDB/localStorage/Supabase, never in the bundle,
      // so a new build can be picked up without asking the user first.
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifestFilename: 'manifest.webmanifest',
      includeAssets: [
        'icon.svg',
        'icon-192.png',
        'icon-512.png',
        'icon-maskable-512.png',
        'apple-touch-icon.png',
      ],
      manifest: {
        id: '/',
        name: 'Jikan — Planificador de horario',
        short_name: 'Jikan',
        description:
          'Planificador de horario circular de 24 h: actividades por día, estadísticas, pomodoro y recordatorios. Funciona sin cuenta y sin conexión.',
        lang: 'es',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#0f172a',
        theme_color: '#7c5cff',
        categories: ['productivity', 'education', 'utilities'],
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        globIgnores: [...LAZY_CHUNKS, 'sw.js', 'workbox-*.js', 'registerSW.js'],
        // The main bundle is ~530 kB; anything bigger is a lazy export lib.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: 'index.html',
        // Supabase auth must never be answered from the cache.
        navigateFallbackDenylist: [/^\/api\//, /\/auth\/v1\//, /\/rest\/v1\//],
        runtimeCaching: [
          {
            // Supabase (cross origin): always the network. RLS decisions must be
            // taken live, so a stale row or a revoked token would be a bug.
            urlPattern: ({ url }) =>
              url.origin !== self.location.origin && /supabase\.(co|in)/.test(url.hostname),
            handler: 'NetworkOnly',
          },
          {
            // Lazy chunks (PDF/XLSX export): cached the first time they are used.
            urlPattern: ({ request }) => request.destination === 'script',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'jikan-assets',
              expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'jikan-images',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
        ],
      },
      devOptions: {
        // Off by default: the dev server has no precache manifest and a SW would
        // cache the HMR client. Enabled on demand for offline testing.
        enabled: false,
      },
    }),
  ],
  server: {
    port: 7000,
    open: true,
  },
})