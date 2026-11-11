import { campos, conflicto, enTransaccion, noEncontrado, validar, z } from '@huellas/shared'

// HU-09 · Bandeja de solicitudes del catálogo público (lado privado).
// Convertir una solicitud = registrar la adopción con solicitud_publica_id (ver adopciones.service).

const esquemaFiltro = z.object({
  estado: z.preprocess(
    (valor) => (valor === '' || valor === 'todas' ? undefined : valor),
    z.enum(['pendiente', 'convertida', 'descartada'], { error: 'El estado debe ser pendiente, convertida o descartada.' }).optional(),
  ),
})

export function crearSolicitudesPublicasService({ pool, solicitudesPublicas }) {
  async function obtener(idCrudo) {
    const id = validar(campos.id('La solicitud'), idCrudo)
    const solicitud = await solicitudesPublicas.obtener(id)
    if (!solicitud) throw noEncontrado('La solicitud no existe.')
    return solicitud
  }

  return {
    async listar(consulta) {
      const { estado } = validar(esquemaFiltro, consulta)
      return solicitudesPublicas.listar({ estado })
    },

    obtener,

    async descartar(idCrudo, usuario) {
      const id = validar(campos.id('La solicitud'), idCrudo)
      await enTransaccion(pool, async (cliente) => {
        const actual = await solicitudesPublicas.obtenerParaActualizar(cliente, id)
        if (!actual) throw noEncontrado('La solicitud no existe.')
        if (actual.estado !== 'pendiente') throw conflicto('La solicitud ya fue revisada.')
        await solicitudesPublicas.descartar(cliente, id, usuario.id)
      })
      return obtener(id)
    },
  }
}
