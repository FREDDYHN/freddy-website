import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, '..', 'shared'),
    },
  },
  server: { port: 2027, proxy: { '/api': 'http://localhost:3002', '/projects': 'http://localhost:3002', '/templates': 'http://localhost:3002' } },
  build: { outDir: 'dist', assetsDir: 'assets' },
})
