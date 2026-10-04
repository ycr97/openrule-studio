import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    watch: { ignored: ['**/output/**', '**/.playwright-cli/**'] },
    proxy: { '/api/v2': { target: process.env.STUDIO_API_ORIGIN ?? 'http://127.0.0.1:8080', changeOrigin: true } },
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
