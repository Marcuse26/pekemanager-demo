// Contenido para: vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa' 

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'PekeManager',
        short_name: 'PekeManager',
        description: 'Gestión de guardería Mi Pequeño Recreo',
        theme_color: '#ffffff',
        
        // --- INICIO CORRECCIÓN PWA (Campos requeridos) ---
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        // --- FIN CORRECCIÓN PWA ---

        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})