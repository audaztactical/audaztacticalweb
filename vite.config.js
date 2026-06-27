import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { coldStartHtmlPlugin } from './scripts/vite-plugin-cold-start.mjs'

export default defineConfig({
  plugins: [react(), tailwindcss(), coldStartHtmlPlugin()],
})
