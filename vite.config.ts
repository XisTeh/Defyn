/// <reference types="node" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { OFFLINE_GLOB_PATTERNS } from './src/platform/offline-policy';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'pwa-192.png', 'pwa-512.png', 'pwa-maskable-512.png'],
      manifest: {
        id: '/',
        name: 'DEFYN — Treino e acompanhamento',
        short_name: 'DEFYN',
        description: 'Treinos, hidratação, metas e progresso privados, locais e disponíveis offline.',
        theme_color: '#090b0d',
        background_color: '#e7eaec',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone'],
        start_url: '/',
        scope: '/',
        lang: 'pt-BR',
        categories: ['health', 'fitness', 'lifestyle'],
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        importScripts: ['sw-auto-update.js'],
        navigateFallback: '/index.html',
        globPatterns: [...OFFLINE_GLOB_PATTERNS],
        maximumFileSizeToCacheInBytes: 7 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
