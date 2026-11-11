import { campos, hoy, solicitudInvalida, validar, z } from '@huellas/shared'

// HU-08 · Alertas de vacunas y controles pendientes.

export const DIAS_POR_DEFECTO = 30

const esquemaPendientes = z.object({
  dias: z.coerce
    .number({ error: 'Los días deben ser un número.' })
    .int('Los días deben ser un número entero.')
    .min(0, 'Los días no pueden ser negativos.')
    .max(365, 'Los días no pueden superar 365.')
    .default(DIAS_POR_DEFECTO),
})

const fechaProximaOpcional = (nombre) => campos.fecha(nombre).nullish().transform((valor) => valor ?? null)

// La próxima fecha debe ser posterior a la aplicación (también lo exige la BD).
const proximaPosterior = (campoProxima) => (datos, ctx) => {
  if (datos[campoProxima] && datos[campoProxima] <= datos.fecha_aplicacion) {
    ctx.addIssue({
      code: 'custom',
      path: [campoProxima],
      message: 'La próxima fecha debe ser posterior a la fecha de aplicación.',
    })
  }
}

const base = {
  perro_id: campos.id('El perro'),
  veterinario_id: campos.id('El veterinario responsable'),
  fecha_aplicacion: campos.fecha('La fecha de aplicación').default(() => hoy()),
  observaciones: campos.textoOpcional('Las observaciones', 2000),
}

const esquemaVacuna = z
  .object({
    ...base,
    nombre: campos.texto('El nombre de la vacuna', 100),
    fecha_proxima_dosis: fechaProximaOpcional('La fecha de la próxima dosis'),
  })
  .superRefine(proximaPosterior('fecha_proxima_dosis'))

const esquemaDesparasitacion = z
  .object({
    ...base,
    tipo: z.enum(['interna', 'externa'], { error: 'El tipo debe ser interna o externa.' }),
    producto: campos.texto('El producto', 100),
    fecha_proxima: fechaProximaOpcional('La fecha del próximo control'),
  })
  .superRefine(proximaPosterior('fecha_proxima'))

export function crearControlesService({ controles, lecturas }) {
  // Mismas comprobaciones que al registrar una atención (HU-09).
  async function exigirPerroYVeterinario({ perro_id, veterinario_id }) {
    const errores = []
    if (!(await lecturas.existePerro(perro_id))) {
      errores.push({ campo: 'perro_id', mensaje: 'El perro indicado no existe.' })
    }
    if (!(await lecturas.esVeterinarioActivo(veterinario_id))) {
      errores.push({ campo: 'veterinario_id', mensaje: 'El responsable debe ser un usuario activo con rol veterinario.' })
    }
    if (errores.length) throw solicitudInvalida('Datos inválidos.', errores)
  }

  return {
    async pendientes(consulta) {
      const { dias } = validar(esquemaPendientes, consulta)
      const controlesPendientes = await controles.pendientes({ dias })
      return {
        dias,
        total: controlesPendientes.length,
        vencidos: controlesPendientes.filter((c) => c.vencido).length,
        controles: controlesPendientes,
      }
    },

    async registrarVacuna(datos) {
      const vacuna = validar(esquemaVacuna, datos)
      await exigirPerroYVeterinario(vacuna)
      return controles.crearVacuna(vacuna)
    },

    async registrarDesparasitacion(datos) {
      const desparasitacion = validar(esquemaDesparasitacion, datos)
      await exigirPerroYVeterinario(desparasitacion)
      return controles.crearDesparasitacion(desparasitacion)
    },
  }
}
