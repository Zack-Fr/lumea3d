import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    // host: true,  // Local development
    host: '0.0.0.0',  // Network access for phone
    proxy: {
      '/api': {
        // target: 'http://localhost:3000',  // Local development
        target: 'http://192.168.1.10:3000',  // Network access for phone
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/socket.io': {
        // target: 'http://localhost:3000',  // Local development
        target: 'http://192.168.1.10:3000',  // Network access for phone
        changeOrigin: true,
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})