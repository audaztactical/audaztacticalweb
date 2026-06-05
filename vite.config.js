import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // COOP başlığı ekleme — Firebase signInWithPopup, Chrome'da window.closed uyarısı üretir.
  // Google girişi signInWithRedirect ile yapılıyor (GoogleAuthRedirectHandler).
})
