import {
  configAlmacenamiento,
  configBaseDatos,
  crearPool,
  iniciarServidor,
  puertos,
  urlAutenticacion,
  verificadorRemoto,
} from '@huellas/shared'
import { crearAppAdopcion } from './app.js'
import { crearAlmacenSupabase } from './utils/almacenamiento.js'

const pool = crearPool(configBaseDatos())
// Sin SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no se suben fotos (se pega la URL).
const configFotos = configAlmacenamiento()
if (!configFotos) console.warn('[adopcion] subida de fotos desactivada: falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
const almacen = configFotos ? crearAlmacenSupabase(configFotos) : null
const app = crearAppAdopcion({ pool, verificarSesion: verificadorRemoto(urlAutenticacion()), almacen })

iniciarServidor({ nombre: 'adopcion', app, puerto: puertos.adopcion(), pool })
