import { campos, conflicto, enTransaccion, hoy, noEncontrado, solicitudInvalida, validar, z } from '@huellas/shared'

// HU-11 · Agenda de citas veterinarias.

export const TIPOS_CITA = ['consulta', 'vacuna', 'cirugia']
export const ESTADOS_CITA = ['programada', 'atendida', 'cancelada']
const NOMBRE_TIPO = { consulta: 'Consulta', vacuna: 'Vacuna', cirugia: 'Cirugía' }

// Rango por defecto de la agenda (una semana) y máximo que se puede pedir de una vez.
export const DIAS_AGENDA = 7
const MAXIMO_DIAS_RANGO = 62

const hora = z
  .string({ error: 'La hora es obligatoria.' })
  .trim()
  .regex(/^([01]\d|2[0-3]):(00|30)$/, 'La hora debe ser en punto o y media (por ejemplo 09:00 o 09:30).')

const esquemaCita = z.object({
  perro_id: campos.id('El perro'),
  veterinario_id: campos.id('El veterinario responsable'),
  fecha: campos.fecha('La fecha'),
  hora,
  tipo: z.enum(TIPOS_CITA, { error: 'El tipo debe ser consulta, vacuna o cirugía.' }),
  motivo: campos.texto('El motivo', 200),
})

const vacioANull = (valor) => (valor === '' ? undefined : valor)

const esquemaFiltros = z
  .object({
    desde: z.preprocess(vacioANull, campos.fecha('La fecha inicial').optional()),
    hasta: z.preprocess(vacioANull, campos.fecha('La fecha final').optional()),
    veterinario_id: z.preprocess(vacioANull, campos.id('El veterinario').optional()),
    perro_id: z.preprocess(vacioANull, campos.id('El perro').optional()),
    estado: z.preprocess(
      vacioANull,
      z.enum(ESTADOS_CITA, { error: 'El estado debe ser programada, atendida o cancelada.' }).optional(),
    ),
  })
  .transform((filtros) => {
    const desde = filtros.desde ?? hoy()
    return { ...filtros, desde, hasta: filtros.hasta ?? sumarDias(desde, DIAS_AGENDA - 1) }
  })
  .superRefine(({ desde, hasta }, ctx) => {
    if (hasta < desde) {
      ctx.addIssue({ code: 'custom', path: ['hasta'], message: 'La fecha final no puede ser anterior a la inicial.' })
    } else if (diasEntre(desde, hasta) >= MAXIMO_DIAS_RANGO) {
      ctx.addIssue({ code: 'custom', path: ['hasta'], message: `El rango no puede superar ${MAXIMO_DIAS_RANGO} días.` })
    }
  })

const esquemaCancelacion = z.object({
  motivo_cancelacion: campos.textoOpcional('El motivo de la cancelación', 500),
})

const esquemaAtencion = z.object({
  diagnostico: campos.texto('El diagnóstico', 2000),
  tratamiento: campos.texto('El tratamiento', 2000),
  observaciones: campos.textoOpcional('Las observaciones', 2000),
})

// Fechas 'AAAA-MM-DD' sin zona horaria (se calculan en UTC para no saltar días).
function sumarDias(fecha, dias) {
  const d = new Date(`${fecha}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}
function diasEntre(desde, hasta) {
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000)
}

// 'AAAA-MM-DD HH:MM' de ahora, en la hora local del servidor (TZ=America/La_Paz en Docker).
function ahoraLocal() {
  const ahora = new Date()
  const dosDigitos = (n) => String(n).padStart(2, '0')
  return `${hoy()} ${dosDigitos(ahora.getHours())}:${dosDigitos(ahora.getMinutes())}`
}

const describir = (cita) => `${NOMBRE_TIPO[cita.tipo] ?? cita.tipo} de ${cita.perro_nombre}`

export function crearCitasService({ citas, consultas, lecturas, pool }) {
  async function exigirCita(idCrudo) {
    const id = validar(campos.id('La cita'), idCrudo)
    const cita = await citas.obtener(id)
    if (!cita) throw noEncontrado('La cita no existe.')
    return cita
  }

  function exigirProgramada(cita, accion) {
    if (cita.estado !== 'programada') {
      throw conflicto(`No se puede ${accion} una cita ${cita.estado}.`)
    }
  }

  // Reglas de una cita nueva o editada: perro y veterinario válidos, horario futuro y libre.
  async function validarCita(datos, excluirId = null) {
    const cita = validar(esquemaCita, datos)
    const errores = []
    const estadoPerro = await lecturas.estadoPerro(cita.perro_id)
    if (!estadoPerro) errores.push({ campo: 'perro_id', mensaje: 'El perro indicado no existe.' })
    else if (estadoPerro === 'adoptado') errores.push({ campo: 'perro_id', mensaje: 'El perro ya fue adoptado.' })
    if (!(await lecturas.esVeterinarioActivo(cita.veterinario_id))) {
      errores.push({ campo: 'veterinario_id', mensaje: 'El responsable debe ser un usuario activo con rol veterinario.' })
    }
    if (`${cita.fecha} ${cita.hora}` < ahoraLocal()) {
      errores.push({ campo: 'hora', mensaje: 'No se puede agendar una cita en una fecha u hora que ya pasó.' })
    }
    if (errores.length) throw solicitudInvalida('Datos inválidos.', errores)

    // La BD también lo impide (uq_citas_horario); aquí se avisa con qué cita choca.
    const ocupante = await citas.ocupante(cita.fecha, cita.hora, excluirId)
    if (ocupante) {
      throw conflicto(`Ya hay una cita a las ${cita.hora} de ese día (${describir(ocupante)}). Elige otro horario.`)
    }
    return cita
  }

  return {
    async listar(consulta) {
      const { desde, hasta, veterinario_id, perro_id, estado } = validar(esquemaFiltros, consulta)
      const lista = await citas.listar({ desde, hasta, veterinarioId: veterinario_id, perroId: perro_id, estado })
      return { desde, hasta, total: lista.length, citas: lista }
    },

    obtener: exigirCita,

    async crear(datos, usuario) {
      const cita = await validarCita(datos)
      const id = await citas.crear(cita, usuario.id)
      return citas.obtener(id)
    },

    async editar(idCrudo, datos) {
      const actual = await exigirCita(idCrudo)
      exigirProgramada(actual, 'editar')
      const cita = await validarCita(datos, actual.id)
      if (!(await citas.actualizar(actual.id, cita))) throw conflicto('La cita cambió mientras la editabas. Vuelve a cargarla.')
      return citas.obtener(actual.id)
    },

    async cancelar(idCrudo, datos) {
      const actual = await exigirCita(idCrudo)
      exigirProgramada(actual, 'cancelar')
      const { motivo_cancelacion } = validar(esquemaCancelacion, datos)
      if (!(await citas.cancelar(actual.id, motivo_cancelacion))) {
        throw conflicto('La cita cambió mientras la cancelabas. Vuelve a cargarla.')
      }
      return citas.obtener(actual.id)
    },

    // Crea la consulta en el historial médico y marca la cita como atendida, todo o nada.
    async atender(idCrudo, datos) {
      const actual = await exigirCita(idCrudo)
      exigirProgramada(actual, 'atender')
      if (actual.fecha > hoy()) throw conflicto('Solo se pueden atender citas de hoy o de días anteriores.')
      const atencion = validar(esquemaAtencion, datos)

      return enTransaccion(pool, async (cliente) => {
        const consultaId = await consultas.crear(
          {
            perro_id: actual.perro_id,
            veterinario_id: actual.veterinario_id,
            fecha: actual.fecha,
            motivo: actual.motivo,
            ...atencion,
          },
          cliente,
        )
        if (!(await citas.marcarAtendida(cliente, actual.id, consultaId))) {
          throw conflicto('La cita cambió mientras la atendías. Vuelve a cargarla.')
        }
        return { cita: await citas.obtener(actual.id, cliente), consulta: await consultas.obtener(consultaId, cliente) }
      })
    },
  }
}
