import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // CRITICAL: Set base to './' so assets are loaded relatively. 
  // This allows the app to work under file:// or https://app.local/subpath/
  base: './', 
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Ensure we don't have super tiny chunks that might cause loading jitter
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          editor: ['@uiw/react-codemirror', '@codemirror/view', '@codemirror/state'],
        }
      }
    }
  }
})
