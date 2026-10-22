import { configBaseDatos, crearPool, iniciarServidor, puertos, urlAutenticacion, verificadorRemoto } from '@huellas/shared'
import { crearAppVeterinaria } from './app.js'

const pool = crearPool(configBaseDatos())
const app = crearAppVeterinaria({ pool, verificarSesion: verificadorRemoto(urlAutenticacion()) })

iniciarServidor({ nombre: 'veterinaria', app, puerto: puertos.veterinaria(), pool })
