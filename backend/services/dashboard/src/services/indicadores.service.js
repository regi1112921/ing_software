export function crearIndicadoresService({ indicadores }) {
  return {
    // HU-13 · RF-03: total y cantidad por cada estado (también los que tienen 0).
    async resumen() {
      const porEstado = await indicadores.conteoPorEstado()
      const total = porEstado.reduce((suma, estado) => suma + estado.cantidad, 0)
      return { total, por_estado: porEstado }
    },

    // HU-14 · RF-04: del ingreso más antiguo al más reciente.
    async perrosEnTratamiento() {
      const perros = await indicadores.perrosEnTratamiento()
      return { total: perros.length, perros }
    },
  }
}
