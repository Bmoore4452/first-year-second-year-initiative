import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// For GitHub Pages project sites, set VITE_BASE to '/<repo-name>/'.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/',
})
