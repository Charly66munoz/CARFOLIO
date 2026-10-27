import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  cacheDir: 'node_modules/.vite',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    // Generated test artifacts and local caches can contain thousands of files.
    watch: { ignored: ['**/.tmp/**', '**/.npm-cache/**'] },
  },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
})
