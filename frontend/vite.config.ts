import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Pinned because the backend's CORS allowlist is a single FRONTEND_URL; if vite
  // drifts to another port the browser blocks every call.
  server: { port: 5188, strictPort: true },
})
