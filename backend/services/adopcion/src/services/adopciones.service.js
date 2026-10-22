import { campos, conflicto, enTransaccion, hoy, noEncontrado, solicitudInvalida, validar, z } from '@huellas/shared'

// RF-17: transiciones permitidas (las mismas que aplica la BD en fn_validar_solicitud).
const TRANSICIONES = {
  en_proceso: ['aprobada', 'rechazada'],
  aprobada: ['finalizada', 'rechazada'],
  rechazada: [],
  finalizada: [],
}

// Fecha que se registra al llegar a cada estado.
const COLUMNA_FECHA = {
  aprobada: 'fecha_aprobacion',
  rechazada: 'fecha_rechazo',
  finalizada: 'fecha_adopcion',
}

const NOMBRE_ESTADO = { en_proceso: 'En proceso', aprobada: 'Aprobada', rechazada: 'Rechazada', finalizada: 'Finalizada' }

const telefono = z
  .string({ error: 'El teléfono es obligatorio.' })
  .transform((valor) => valor.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^\+?[0-9]{7,15}$/, 'El teléfono debe tener entre 7 y 15 dígitos (puede empezar con +).'))

const esquemaCrear = z.object({
  perro_id: campos.id('El perro'),
  adoptante: z.object(
    {
      nombre_completo: campos.texto('El nombre completo', 150),
      documento_identidad: campos.textoOpcional('El documento de identidad', 30),
      telefono,
      direccion: campos.texto('La dirección', 250),
    },
    { error: 'Los datos del adoptante son obligatorios.' },
  ),
  fecha_solicitud: campos.fecha('La fecha de solicitud').default(() => hoy()),
  observaciones: campos.textoOpcional('Las observaciones', 2000),
})

const esquemaCambioEstado = z.object({
  estado: z.enum(['aprobada', 'rechazada', 'finalizada'], {
    error: 'El estado debe ser aprobada, rechazada o finalizada.',
  }),
  fecha: campos.fecha('La fecha').default(() => hoy()),
  observaciones: campos.textoOpcional('Las observaciones', 2000),
})

const conTransiciones = (adopcion) => ({ ...adopcion, transiciones_permitidas: TRANSICIONES[adopcion.estado] })

export function crearAdopcionesService({ pool, adopciones, adoptantes, perros }) {
  async function obtener(idCrudo) {
    const id = validar(campos.id('La adopción'), idCrudo)
    const adopcion = await adopciones.obtener(id)
    if (!adopcion) throw noEncontrado('La adopción no existe.')
    return conTransiciones(adopcion)
  }

  return {
    // HU-11 · RF-15
    listar() {
      return adopciones.listar()
    },

    // HU-11 · RF-16
    obtener,

    // HU-10 · RF-13, RF-14, RF-19
    async crear(datos, usuario) {
      const solicitud = validar(esquemaCrear, datos)

      const id = await enTransaccion(pool, async (cliente) => {
        const perro = await perros.obtenerParaAdopcion(cliente, solicitud.perro_id)
        if (!perro) throw solicitudInvalida('El perro indicado no existe.')
        if (perro.estado !== 'disponible') {
          throw conflicto(`El perro no está disponible para adopción (estado actual: ${perro.estado_nombre}).`)
        }

        const documento = solicitud.adoptante.documento_identidad
        const existente = documento ? await adoptantes.buscarPorDocumento(cliente, documento) : null
        const adoptanteId = existente?.id ?? (await adoptantes.crear(cliente, solicitud.adoptante, usuario.id))

        // El trigger de la BD pasa el perro a "en_adopcion" en esta misma transacción.
        return adopciones.crear(cliente, {
          perro_id: solicitud.perro_id,
          adoptante_id: adoptanteId,
          fecha_solicitud: solicitud.fecha_solicitud,
          observaciones: solicitud.observaciones,
        }, usuario.id)
      })

      return obtener(id)
    },

    // HU-12 · RF-17, RF-18, RF-19, RF-20
    async cambiarEstado(idCrudo, datos) {
      const id = validar(campos.id('La adopción'), idCrudo)
      const cambio = validar(esquemaCambioEstado, datos)

      await enTransaccion(pool, async (cliente) => {
        const actual = await adopciones.obtenerParaActualizar(cliente, id)
        if (!actual) throw noEncontrado('La adopción no existe.')
        if (!TRANSICIONES[actual.estado].includes(cambio.estado)) {
          throw conflicto(
            `No se puede pasar una adopción de "${NOMBRE_ESTADO[actual.estado]}" a "${NOMBRE_ESTADO[cambio.estado]}".`,
          )
        }
        // El trigger de la BD actualiza el estado del perro en esta misma transacción.
        await adopciones.cambiarEstado(cliente, id, {
          estado: cambio.estado,
          columnaFecha: COLUMNA_FECHA[cambio.estado],
          fecha: cambio.fecha,
          observaciones: cambio.observaciones,
        })
      })

      return obtener(id)
    },
  }
}
