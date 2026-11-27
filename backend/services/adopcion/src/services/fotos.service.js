import { randomUUID } from 'node:crypto'
import { ErrorHttp, solicitudInvalida, validar, z } from '@huellas/shared'
import { detectarImagen } from '../utils/imagenes.js'

// Subida de fotos (perros e historias) a Supabase Storage. En la BD solo se guarda
// la URL pública que devuelve, en las columnas foto_url que ya existían.

export const TAMANO_MAXIMO_FOTO = 5 * 1024 * 1024

const esquemaDestino = z.object({
  carpeta: z.enum(['perros', 'historias'], { error: 'La carpeta debe ser perros o historias.' }),
})

export function crearFotosService({ almacen }) {
  return {
    async subir(contenido, consulta) {
      if (!almacen) {
        throw new ErrorHttp(503, 'La subida de fotos no está configurada en el servidor. Pega la URL de la foto.')
      }
      const { carpeta } = validar(esquemaDestino, consulta)
      if (!Buffer.isBuffer(contenido) || contenido.length === 0) {
        throw solicitudInvalida('Datos inválidos.', [{ campo: 'foto', mensaje: 'Elige una foto.' }])
      }
      const imagen = detectarImagen(contenido)
      if (!imagen) {
        throw solicitudInvalida('Datos inválidos.', [{ campo: 'foto', mensaje: 'La foto debe ser JPG, PNG o WebP.' }])
      }

      const ruta = `${carpeta}/${randomUUID()}.${imagen.extension}`
      const url = await almacen.subir({ ruta, contenido, tipo: imagen.tipo })
      return { url, ruta, tipo: imagen.tipo, tamano: contenido.length }
    },
  }
}
