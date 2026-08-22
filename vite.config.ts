/// <reference types="node" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { OFFLINE_GLOB_PATTERNS } from './src/platform/offline-policy';

const ocrAssets = {
  'worker.min.js': 'node_modules/tesseract.js/dist/worker.min.js',
  'tesseract-core-lstm.wasm.js': 'node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js',
  'por.traineddata.gz': 'node_modules/@tesseract.js-data/por/4.0.0_best_int/por.traineddata.gz',
} as const;

function localOcrAssets(): Plugin {
  let root = '.';
  return {
    name: 'defyn-local-ocr-assets',
    configResolved(config) { root = config.root; },
    configureServer(server) {
      server.middlewares.use('/ocr', (request, response, next) => {
        const name = request.url?.replace(/^\//, '').split('?')[0] as keyof typeof ocrAssets;
        const relative = ocrAssets[name];
        if (!relative) return next();
        response.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript' : 'application/gzip');
        response.end(readFileSync(resolve(root, relative)));
      });
    },
    generateBundle() {
      for (const [name, relative] of Object.entries(ocrAssets)) {
        this.emitFile({ type: 'asset', fileName: `ocr/${name}`, source: readFileSync(resolve(root, relative)) });
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    localOcrAssets(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'pwa-192.png', 'pwa-512.png', 'pwa-maskable-512.png'],
      manifest: {
        id: '/',
        name: 'DEFYN — Nutrição, treino e progresso',
        short_name: 'DEFYN',
        description: 'Nutrição, hidratação, treinos e progresso privados, locais e disponíveis offline.',
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
