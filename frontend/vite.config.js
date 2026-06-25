import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 2027, proxy: { '/api': 'http://localhost:3002' } },
  build: { outDir: 'dist', assetsDir: 'assets' },
})
