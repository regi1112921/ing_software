import { configBaseDatos, crearPool, iniciarServidor, puertos, urlAutenticacion, verificadorRemoto } from '@huellas/shared'
import { crearAppAdopcion } from './app.js'

const pool = crearPool(configBaseDatos())
const app = crearAppAdopcion({ pool, verificarSesion: verificadorRemoto(urlAutenticacion()) })

iniciarServidor({ nombre: 'adopcion', app, puerto: puertos.adopcion(), pool })
