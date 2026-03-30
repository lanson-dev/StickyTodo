import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  // Inject version from package.json
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  // Tauri expects a fixed port in dev
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Prevent Vite from clearing the terminal in Tauri dev mode
  clearScreen: false,
})