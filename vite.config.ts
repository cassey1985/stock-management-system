import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Disable minification to avoid potential issues
    minify: 'esbuild',
    // Generate sourcemaps for debugging
    sourcemap: false,
    // Reduce chunk size warnings
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['chart.js', 'react-chartjs-2']
        }
      }
    }
  },
  esbuild: {
    // Make esbuild more lenient with unused variables
    legalComments: 'none',
    minifyIdentifiers: false,
    minifySyntax: true,
    minifyWhitespace: true,
    treeShaking: false
  }
})
