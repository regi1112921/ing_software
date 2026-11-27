import { ErrorHttp } from '@huellas/shared'

// Cliente mínimo de Supabase Storage (API REST, sin dependencias).
// La service_role key solo vive en el backend: con ella se sube sin pasar por RLS.
// config: { url, clave, bucket } (ver configAlmacenamiento en @huellas/shared).
export function crearAlmacenSupabase({ url, clave, bucket }, { fetch: hacerFetch = fetch } = {}) {
  const urlPublica = (ruta) => `${url}/storage/v1/object/public/${bucket}/${ruta}`

  return {
    // Sube el archivo y devuelve su URL pública. No reemplaza archivos existentes.
    async subir({ ruta, contenido, tipo }) {
      let respuesta
      try {
        respuesta = await hacerFetch(`${url}/storage/v1/object/${bucket}/${ruta}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${clave}`,
            apikey: clave,
            'Content-Type': tipo,
            'Cache-Control': 'max-age=31536000',
            'x-upsert': 'false',
          },
          body: contenido,
        })
      } catch (error) {
        console.error('[almacenamiento] sin conexión con Supabase Storage:', error.message)
        throw new ErrorHttp(502, 'No se pudo guardar la foto. Inténtalo de nuevo en un momento.')
      }
      if (!respuesta.ok) {
        console.error('[almacenamiento] Supabase Storage respondió', respuesta.status, await respuesta.text().catch(() => ''))
        throw new ErrorHttp(502, 'No se pudo guardar la foto. Inténtalo de nuevo en un momento.')
      }
      return urlPublica(ruta)
    },
  }
}
