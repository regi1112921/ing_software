// Configuración base de Express común a todos los servicios.
import express from 'express'
import cors from 'cors'
import { origenesCors } from './config.js'
import { crearExigirSesion } from './autenticacion.js'
import { manejadorErrores } from './errores.js'

// rutas(app, { exigirSesion }) registra los endpoints del servicio.
export function crearApp({ nombre, verificarSesion, rutas }) {
  const app = express()
  app.disable('x-powered-by')
  app.use(cors({ origin: origenesCors() }))
  app.use(express.json({ limit: '100kb' }))

  app.get('/health', (req, res) => res.json({ servicio: nombre, estado: 'ok' }))

  rutas(app, { exigirSesion: crearExigirSesion(verificarSesion) })

  app.use((req, res) => res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` }))
  app.use(manejadorErrores)
  return app
}

// Arranca el servidor y cierra la conexión a la BD al detenerlo (Ctrl+C).
export function iniciarServidor({ nombre, app, puerto, pool }) {
  const servidor = app.listen(puerto, () => {
    console.log(`[${nombre}] escuchando en http://localhost:${puerto}`)
  })
  const detener = () => {
    servidor.close(() => (pool ? pool.end() : Promise.resolve()).finally(() => process.exit(0)))
  }
  process.on('SIGINT', detener)
  process.on('SIGTERM', detener)
  return servidor
}
