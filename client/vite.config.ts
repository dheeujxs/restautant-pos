// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0', // ✅ Add this to allow external access
    allowedHosts: [   // ✅ Add this section
      'eager-beers-feel.loca.lt',
      '.loca.lt',     // Allow all localtunnel subdomains
      'localhost',
      '127.0.0.1'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  // Add these to fix module resolution issues
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react-beautiful-dnd',
      '@mui/material',
      '@mui/icons-material',
      'lucide-react',
      'formik',
      'yup',
      'notistack',
      'axios',
      'date-fns'
    ],
    esbuildOptions: {
      target: 'es2020',
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'mui-vendor': ['@mui/material', '@mui/icons-material'],
          'ui-vendor': ['lucide-react', 'notistack', 'react-hot-toast'],
        },
      },
    },
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
  },
})