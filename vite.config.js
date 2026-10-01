import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Vercel serves from the domain root; GitHub Pages serves from /BAAN-BREW/
  base: process.env.VERCEL ? '/' : '/BAAN-BREW/',
  plugins: [react(), tailwindcss()],
})