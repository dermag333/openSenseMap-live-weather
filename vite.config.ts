import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages project site: /openSenseMap-live-weather/
// Override with VITE_BASE=/ for Netlify root deploys.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || '/openSenseMap-live-weather/',
})
