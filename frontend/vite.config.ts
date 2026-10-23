import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// Cada servicio del backend corre en su propio puerto. En desarrollo, Vite
// redirige /api/<servicio>/... al servicio y quita el prefijo.
// En Docker, nginx hace lo mismo (ver nginx.conf).
function proxy(destino: string, prefijo: string): ProxyOptions {
  return {
    target: destino,
    changeOrigin: true,
    rewrite: (ruta) => ruta.replace(new RegExp(`^${prefijo}`), ''),
  }
}

export default defineConfig(({ mode }) => {
  // Permite apuntar a otro host con VITE_API_HOST (por defecto, localhost).
  const env = loadEnv(mode, process.cwd(), '')
  const host = env.VITE_API_HOST || 'http://localhost'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api/autenticacion': proxy(`${host}:3004`, '/api/autenticacion'),
        '/api/veterinaria': proxy(`${host}:3001`, '/api/veterinaria'),
        '/api/adopcion': proxy(`${host}:3002`, '/api/adopcion'),
        '/api/dashboard': proxy(`${host}:3003`, '/api/dashboard'),
      },
    },
  }
})
