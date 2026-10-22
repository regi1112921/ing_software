import { configBaseDatos, crearPool, iniciarServidor, puertos, urlAutenticacion, verificadorRemoto } from '@huellas/shared'
import { crearAppDashboard } from './app.js'

const pool = crearPool(configBaseDatos())
const app = crearAppDashboard({ pool, verificarSesion: verificadorRemoto(urlAutenticacion()) })

iniciarServidor({ nombre: 'dashboard', app, puerto: puertos.dashboard(), pool })
