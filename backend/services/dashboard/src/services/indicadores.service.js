// Meses que muestra el gráfico de adopciones (incluido el actual).
const MESES_GRAFICO = 12

export function crearIndicadoresService({ indicadores }) {
  return {
    // HU-13 · RF-03: total, cantidad por cada estado (también los que tienen 0)
    // y los indicadores principales de la administración.
    async resumen() {
      const [porEstado, solicitudes] = await Promise.all([indicadores.conteoPorEstado(), indicadores.conteoSolicitudes()])
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
  }
}
