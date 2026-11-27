import { campos, conflicto, enTransaccion, solicitudInvalida, validar, z } from '@huellas/shared'

const telefono = z
  .string({ error: 'El teléfono es obligatorio.' })
  .transform((valor) => valor.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^\+?[0-9]{7,15}$/, 'El teléfono debe tener entre 7 y 15 dígitos (puede empezar con +).'))

const esquemaVoluntario = z.object({
  nombre_completo: campos.texto('El nombre completo', 150),
  telefono,
  correo: z
    .union([z.email({ error: 'El correo debe ser válido.' }), z.literal('')])
    .optional()
    .transform((valor) => valor?.trim().toLowerCase() || null),
  disponibilidad: campos.texto('La disponibilidad', 500),
})

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'La hora debe tener formato HH:MM.')
const esquemaTurno = z
  .object({
    voluntario_id: campos.id('El voluntario'),
    fecha: campos.fecha('La fecha'),
    hora_inicio: hora,
    hora_fin: hora,
    actividad: campos.texto('La actividad', 300),
  })
  .superRefine((turno, contexto) => {
    if (turno.hora_fin <= turno.hora_inicio) {
      contexto.addIssue({
        code: 'custom',
        path: ['hora_fin'],
        message: 'La hora de fin debe ser posterior a la hora de inicio.',
      })
    }
    const inicio = Number(turno.hora_inicio.slice(0, 2)) * 60 + Number(turno.hora_inicio.slice(3))
    const fin = Number(turno.hora_fin.slice(0, 2)) * 60 + Number(turno.hora_fin.slice(3))
    if (fin - inicio > 12 * 60) {
      contexto.addIssue({
        code: 'custom',
        path: ['hora_fin'],
        message: 'Un turno no puede superar 12 horas.',
      })
    }
  })

const esquemaSemana = z
  .object({
    desde: campos.fecha('La fecha inicial'),
    hasta: campos.fecha('La fecha final'),
  })
  .superRefine(({ desde, hasta }, contexto) => {
    const dias = (Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000
    if (dias < 0 || dias > 6) {
      contexto.addIssue({
        code: 'custom',
        path: ['hasta'],
        message: 'El calendario debe cubrir un rango de 1 a 7 días.',
      })
    }
  })

const esquemaMes = z.object({
  mes: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'El mes debe tener formato AAAA-MM.'),
})

function rangoMes(mes) {
  const [anio, numeroMes] = mes.split('-').map(Number)
  const siguiente = numeroMes === 12 ? `${anio + 1}-01-01` : `${anio}-${String(numeroMes + 1).padStart(2, '0')}-01`
  return { desde: `${mes}-01`, hasta: siguiente }
}

export function crearVoluntariadoService({ pool, voluntarios }) {
  return {
    listarVoluntarios() {
      return voluntarios.listar()
    },

    registrarVoluntario(datos) {
      return voluntarios.crear(validar(esquemaVoluntario, datos))
    },

    async calendario(consulta) {
      const { desde, hasta } = validar(esquemaSemana, consulta)
      const turnos = await voluntarios.calendario(desde, hasta)
      return { desde, hasta, total: turnos.length, turnos }
    },

    async asignarTurno(datos) {
      const turno = validar(esquemaTurno, datos)
      return enTransaccion(pool, async (cliente) => {
        if (!(await voluntarios.obtenerActivoParaActualizar(cliente, turno.voluntario_id))) {
          throw solicitudInvalida('Datos inválidos.', [
            { campo: 'voluntario_id', mensaje: 'El voluntario no existe o está inactivo.' },
          ])
        }
        if (await voluntarios.existeSolapamiento(cliente, turno)) {
          throw conflicto('El voluntario ya tiene un turno que se cruza con ese horario.')
        }
        return voluntarios.crearTurno(cliente, turno)
      })
    },

    async horasMensuales(consulta) {
      const { mes } = validar(esquemaMes, consulta)
      const rango = rangoMes(mes)
      const voluntariosMes = await voluntarios.horasMensuales(rango.desde, rango.hasta)
      return { mes, total: voluntariosMes.length, voluntarios: voluntariosMes }
    },
  }
}
