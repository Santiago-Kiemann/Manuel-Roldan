import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/Manuel-Roldan/', // ← IMPORTANTE: nombre de tu repo
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})