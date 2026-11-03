import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Cesium requires special handling for Web Workers
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          cesium: ['cesium'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['cesium'],
    exclude: [
      'cesium/Source/Workers/createsVerticesFromHeightmap',
      'cesium/Source/Workers/transferTypedArray',
    ],
  },
  define: {
    // Prevent Cesium from using module workers that Vite doesn't handle well
    CESIUM_BASE_URL: JSON.stringify(''),
  },
})