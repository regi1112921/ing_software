import { campos, conflicto, hoy, noEncontrado, solicitudInvalida, validar, z } from '@huellas/shared'

// HU-14 · Historias de adopciones exitosas (las publica la administración).

const fotoUrl = campos
  .texto('La foto', 500)
  .refine((url) => /^https?:\/\//i.test(url), 'La foto debe ser una URL que empiece por http:// o https://.')

const visible = z.boolean({ error: 'visible debe ser verdadero o falso.' })

const esquemaHistoria = z.object({
  solicitud_id: campos.id('La adopción'),
  titulo: campos.texto('El título', 120),
  relato: campos.texto('El relato', 2000),
  foto_url: fotoUrl,
  fecha_publicacion: campos.fecha('La fecha de publicación').default(() => hoy()),
  visible: visible.default(true),
})

const esquemaCambios = z
  .object({
    titulo: campos.texto('El título', 120).optional(),
    relato: campos.texto('El relato', 2000).optional(),
    foto_url: fotoUrl.optional(),
    fecha_publicacion: campos.fecha('La fecha de publicación').optional(),
    visible: visible.optional(),
  })
  .refine((cambios) => Object.values(cambios).some((valor) => valor !== undefined), {
    message: 'No se envió ningún cambio.',
  })

const esquemaFiltro = z.object({
  visible: z
    .enum(['true', 'false'], { error: 'visible debe ser true o false.' })
    .transform((valor) => valor === 'true')
    .optional(),
})

// La fecha de publicación va entre la entrega del perro y hoy.
function comprobarFecha(fecha, fechaAdopcion) {
  if (fecha < fechaAdopcion) {
    throw solicitudInvalida('Datos inválidos.', [
      { campo: 'fecha_publicacion', mensaje: 'La fecha no puede ser anterior a la entrega del perro.' },
    ])
  }
  if (fecha > hoy()) {
    throw solicitudInvalida('Datos inválidos.', [{ campo: 'fecha_publicacion', mensaje: 'La fecha no puede ser futura.' }])
  }
}

export function crearHistoriasService({ adopciones, historias }) {
  async function historiaExistente(idCrudo) {
    const id = validar(campos.id('La historia'), idCrudo)
    const historia = await historias.obtener(id)
    if (!historia) throw noEncontrado('La historia no existe.')
    return historia
  }

  return {
    // Todas, de la más reciente a la más antigua (?visible=true|false para filtrar).
    async listar(consulta) {
      return historias.listar(validar(esquemaFiltro, consulta))
    },

    obtener: historiaExistente,

    // Adopciones finalizadas que aún no tienen historia (para elegir al publicar).
    async candidatas() {
      return historias.candidatas()
    },

    // Solo de adopciones finalizadas y una por adopción. La BD vuelve a comprobarlo
    // (fn_validar_historia y uq_historias_solicitud).
    async publicar(datos, usuario) {
      const historia = validar(esquemaHistoria, datos)
      const adopcion = await adopciones.obtener(historia.solicitud_id)
      if (!adopcion) {
        throw solicitudInvalida('Datos inválidos.', [{ campo: 'solicitud_id', mensaje: 'La adopción no existe.' }])
      }
      if (adopcion.estado !== 'finalizada') {
        throw conflicto('Solo se publican historias de adopciones finalizadas (perro entregado).')
      }
      comprobarFecha(historia.fecha_publicacion, adopcion.fecha_adopcion)
      return historias.crear(historia, usuario.id)
    },

    // Editar el texto, la foto o la fecha, u ocultarla / mostrarla (visible). No se borra.
    async actualizar(idCrudo, datos) {
      const historia = await historiaExistente(idCrudo)
      const cambios = validar(esquemaCambios, datos)
      if (cambios.fecha_publicacion) comprobarFecha(cambios.fecha_publicacion, historia.fecha_adopcion)
      const actualizada = await historias.actualizar(historia.id, cambios)
      if (!actualizada) throw noEncontrado('La historia no existe.')
      return actualizada
    },
  }
}
