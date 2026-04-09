import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  plugins: [
    react(),
  ],
  build: {
    // Raise the warning threshold — lazy-loaded page chunks are naturally larger
    // than Vite's 500 kB default.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Split heavy vendor libraries into stable, long-cacheable chunks.
        // Users only re-download a chunk when its library version actually changes.
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react-router-dom') ||
              id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
          if (id.includes('node_modules/@tanstack')) {
            return 'vendor-query';
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-motion';
          }
          if (id.includes('node_modules/recharts') ||
              id.includes('node_modules/d3-') ||
              id.includes('node_modules/victory-')) {
            return 'vendor-charts';
          }
          if (id.includes('node_modules/jspdf') ||
              id.includes('node_modules/html2canvas') ||
              id.includes('node_modules/html-docx')) {
            return 'vendor-pdf';
          }
          if (id.includes('node_modules/three')) {
            return 'vendor-three';
          }
          if (id.includes('node_modules/@radix-ui')) {
            return 'vendor-radix';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
        },
      },
    },
  },
});