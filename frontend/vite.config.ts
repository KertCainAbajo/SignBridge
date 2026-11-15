import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Fail loudly if 5173 is taken instead of silently moving to another port.
    strictPort: true,
    proxy: {
      // Forward API + CSRF-cookie calls to Laravel during development.
      // Same origin for the browser, so session cookies just work.
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/sanctum': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})
