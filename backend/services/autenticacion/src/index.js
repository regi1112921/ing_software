import { configBaseDatos, crearPool, horasSesion, iniciarServidor, puertos } from '@huellas/shared'
import { crearAppAutenticacion } from './app.js'
import { crearAlmacenSesiones } from './services/sesiones.js'

const pool = crearPool(configBaseDatos())
const sesiones = crearAlmacenSesiones({ duracionMs: horasSesion() * 60 * 60 * 1000 })
const app = crearAppAutenticacion({ pool, sesiones })

iniciarServidor({ nombre: 'autenticacion', app, puerto: puertos.autenticacion(), pool })
