import { campos, hoy, validar, z } from '@huellas/shared'

// Meses que muestra el gráfico de adopciones (incluido el actual).
const MESES_GRAFICO = 12

// HU-12 · Filtro de fechas. Hasta este largo el gráfico de evolución va por día; después, por mes.
const MAXIMO_DIAS_POR_DIA = 62
const MAXIMO_DIAS_RANGO = 5 * 366

// Fechas 'AAAA-MM-DD' sin zona horaria.
const aUtc = (fecha) => Date.parse(`${fecha}T00:00:00Z`)
const diasEntre = (desde, hasta) => Math.round((aUtc(hasta) - aUtc(desde)) / 86_400_000)

// Primer y último día del mes de la fecha dada.
export function mesDe(fecha) {
  const [anio, mes] = fecha.split('-').map(Number)
  const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate()
  const mm = String(mes).padStart(2, '0')
  return { desde: `${anio}-${mm}-01`, hasta: `${anio}-${mm}-${String(ultimo).padStart(2, '0')}` }
}

const vacioANull = (valor) => (valor === '' ? undefined : valor)

// Sin fechas: el mes actual. Con una sola, la otra se toma del mes de esa fecha.
const esquemaPeriodo = z
  .object({
    desde: z.preprocess(vacioANull, campos.fecha('La fecha inicial').optional()),
    hasta: z.preprocess(vacioANull, campos.fecha('La fecha final').optional()),
  })
  .transform(({ desde, hasta }) => ({
    desde: desde ?? mesDe(hasta ?? hoy()).desde,
    hasta: hasta ?? mesDe(desde ?? hoy()).hasta,
  }))
  .superRefine(({ desde, hasta }, ctx) => {
    if (hasta < desde) {
      ctx.addIssue({ code: 'custom', path: ['hasta'], message: 'La fecha final no puede ser anterior a la inicial.' })
    } else if (diasEntre(desde, hasta) > MAXIMO_DIAS_RANGO) {
      ctx.addIssue({ code: 'custom', path: ['hasta'], message: 'El rango no puede superar 5 años.' })
    }
  })

export function crearIndicadoresService({ indicadores }) {
  return {
    // HU-13 · RF-03: total, cantidad por cada estado (también los que tienen 0)
    // y los indicadores principales de la administración (estado actual del albergue).
    // HU-12: además, los indicadores del periodo elegido (por defecto, el mes actual).
    async resumen(consulta = {}) {
      const { desde, hasta } = validar(esquemaPeriodo, consulta)
      const [porEstado, solicitudes, periodo] = await Promise.all([
        indicadores.conteoPorEstado(),
        indicadores.conteoSolicitudes(),
        indicadores.indicadoresPeriodo(desde, hasta),
      ])
      const total = porEstado.reduce((suma, estado) => suma + estado.cantidad, 0)
      const cantidad = (codigo) => porEstado.find((estado) => estado.codigo === codigo)?.cantidad ?? 0
      return {
        total,
        por_estado: porEstado,
        indicadores: {
          // Los adoptados ya no están en el albergue.
          en_albergue: total - cantidad('adoptado'),
          disponibles: cantidad('disponible'),
          en_tratamiento: cantidad('en_tratamiento'),
          adopciones_mes: solicitudes.adopciones_mes,
          solicitudes_pendientes: solicitudes.pendientes,
        },
        periodo: { desde, hasta, ...periodo },
      }
    },

    // HU-14 · RF-04: del ingreso más antiguo al más reciente.
    async perrosEnTratamiento() {
      const perros = await indicadores.perrosEnTratamiento()
      return { total: perros.length, perros }
    },

    // HU-13: adopciones finalizadas por mes, del más antiguo al actual (también los meses con 0).
    async adopcionesPorMes() {
      return { meses: await indicadores.adopcionesPorMes(MESES_GRAFICO) }
    },

    // HU-12: ingresos y adopciones del periodo, por día (hasta 62 días) o por mes.
    async evolucion(consulta = {}) {
      const { desde, hasta } = validar(esquemaPeriodo, consulta)
      const unidad = diasEntre(desde, hasta) < MAXIMO_DIAS_POR_DIA ? 'dia' : 'mes'
      const puntos = await indicadores.evolucion(desde, hasta, unidad === 'dia' ? 'day' : 'month')
      const suma = (campo) => puntos.reduce((total, punto) => total + punto[campo], 0)
      return { desde, hasta, unidad, total_ingresos: suma('ingresos'), total_adopciones: suma('adopciones'), puntos }
    },
  }
}
