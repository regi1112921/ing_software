import { configBaseDatos, crearPool, iniciarServidor, puertos, urlAutenticacion, verificadorRemoto } from '@huellas/shared'
import { crearAppVoluntariado } from './app.js'

const pool = crearPool(configBaseDatos())
const app = crearAppVoluntariado({ pool, verificarSesion: verificadorRemoto(urlAutenticacion()) })

iniciarServidor({ nombre: 'voluntariado', app, puerto: puertos.voluntariado(), pool })
