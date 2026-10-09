import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The QR scanner is route-lazy; optimize it at startup so navigating to
  // check-in cannot hit a stale on-demand dependency after an HMR update.
  optimizeDeps: { include: ['@zxing/browser'] },
  // Support the existing public Supabase variable names without exposing the
  // similarly named server-only secret key to browser code.
  envPrefix: ['VITE_', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY'],
})
