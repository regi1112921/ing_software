import { campos, conflicto, hoy, noEncontrado, solicitudInvalida, validar, z } from '@huellas/shared'

// HU-10 · Seguimiento después de la adopción.

export const DIAS_SIN_SEGUIMIENTO = 30

const esquemaSeguimiento = z.object({
  fecha: campos.fecha('La fecha').default(() => hoy()),
  tipo: z.enum(['visita', 'llamada'], { error: 'El tipo debe ser visita o llamada.' }),
  observaciones: campos.texto('Las observaciones', 2000),
  con_problemas: z.boolean({ error: 'con_problemas debe ser verdadero o falso.' }).default(false),
})

const esquemaMarca = z.object({
  con_problemas: z.boolean({ error: 'con_problemas debe ser verdadero o falso.' }),
})

const esquemaPendientes = z.object({
  dias: z.coerce
    .number({ error: 'Los días deben ser un número.' })
    .int('Los días deben ser un número entero.')
    .min(1, 'Los días deben ser al menos 1.')
    .max(365, 'Los días no pueden superar 365.')
    .default(DIAS_SIN_SEGUIMIENTO),
})

export function crearSeguimientosService({ adopciones, seguimientos }) {
  async function adopcionExistente(idCrudo) {
    const id = validar(campos.id('La adopción'), idCrudo)
    const adopcion = await adopciones.obtener(id)
    if (!adopcion) throw noEncontrado('La adopción no existe.')
    return adopcion
  }

  return {
    async listar(adopcionId) {
      const adopcion = await adopcionExistente(adopcionId)
      return seguimientos.listarDeAdopcion(adopcion.id)
    },

    // Solo adopciones finalizadas (perro entregado), entre la entrega y hoy.
    // La BD vuelve a comprobar lo mismo (fn_validar_seguimiento).
    async registrar(adopcionId, datos, usuario) {
      const adopcion = await adopcionExistente(adopcionId)
      const seguimiento = validar(esquemaSeguimiento, datos)

      if (adopcion.estado !== 'finalizada') {
        throw conflicto('Solo se registran seguimientos de adopciones finalizadas (perro entregado).')
      }
      if (seguimiento.fecha < adopcion.fecha_adopcion) {
        throw solicitudInvalida('Datos inválidos.', [
          { campo: 'fecha', mensaje: 'La fecha no puede ser anterior a la entrega del perro.' },
        ])
      }
      if (seguimiento.fecha > hoy()) {
        throw solicitudInvalida('Datos inválidos.', [{ campo: 'fecha', mensaje: 'La fecha no puede ser futura.' }])
      }

      return seguimientos.crear({ ...seguimiento, solicitud_id: adopcion.id }, usuario.id)
    },

    // Marca o desmarca un seguimiento "con problemas" (desmarcar = ya se revisó).
    async marcarProblemas(adopcionId, seguimientoIdCrudo, datos) {
      const adopcion = await adopcionExistente(adopcionId)
      const seguimientoId = validar(campos.id('El seguimiento'), seguimientoIdCrudo)
      const { con_problemas } = validar(esquemaMarca, datos)
      const actualizado = await seguimientos.marcarProblemas(adopcion.id, seguimientoId, con_problemas)
      if (!actualizado) throw noEncontrado('El seguimiento no existe en esta adopción.')
      return actualizado
    },

    async sinSeguimiento(consulta) {
      const { dias } = validar(esquemaPendientes, consulta)
      const lista = await seguimientos.sinSeguimiento({ dias })
      return { dias, total: lista.length, adopciones: lista }
    },

    async conProblemas() {
      const lista = await seguimientos.conProblemas()
      return { total: lista.length, seguimientos: lista }
    },
  }
}
