import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Serve the generated manifest and service worker in local development
      // so the manifest link in index.html never falls through to the SPA HTML.
      devOptions: {
        enabled: true,
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg', 'bekasikab.png'],
      manifest: {
        name: 'SIM Aparat Desa PWA',
        short_name: 'ApkDesa',
        description: 'Sistem Informasi Kependudukan & Layanan Aparat Desa Mobile',
        theme_color: '#0f766e',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      // Cache only the application shell. Authenticated Supabase responses
      // contain PII and must never enter a shared service-worker cache.
      workbox: {}
    })
  ]
});
