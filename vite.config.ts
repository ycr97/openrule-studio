import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { contractMockPlugin } from './dev/contractMock.mjs'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ command, mode }) => {
  const mock = command === 'serve' && mode !== 'production' && process.env.NODE_ENV !== 'production' && process.env.STUDIO_CONTRACT_MOCK === '1'
  return {
  define: { '__STUDIO_CONTRACT_MOCK__': JSON.stringify(mock) },
  plugins: [...(mock ? [contractMockPlugin()] : []), vue(), tailwindcss()],
  server: {
    watch: { ignored: ['**/output/**', '**/.playwright-cli/**'] },
    proxy: { '/api/v2': { target: process.env.STUDIO_API_ORIGIN ?? 'http://127.0.0.1:8080', changeOrigin: true } },
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
}})
