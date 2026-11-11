import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// Catálogo público (HU-09). Solo habla con el servicio de Adopción, rutas /publico.
// En desarrollo, Vite redirige /api/adopcion/... al servicio (puerto 3002).
// En producción (Vercel) se usa VITE_API_URL con la URL pública del servicio.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // VITE_API_ADOPCION: destino del proxy si el servicio no está en localhost:3002.
  const destino = env.VITE_API_ADOPCION || `${env.VITE_API_HOST || 'http://localhost'}:3002`

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      port: 5174,
      proxy: {
        '/api/adopcion': {
          target: destino,
          changeOrigin: true,
          rewrite: (ruta) => ruta.replace(/^\/api\/adopcion/, ''),
        },
      },
    },
  }
})
