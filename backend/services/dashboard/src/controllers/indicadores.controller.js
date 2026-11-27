export function crearIndicadoresController(indicadoresService) {
  return {
    async resumen(req, res) {
      res.json(await indicadoresService.resumen())
    },

    async perrosEnTratamiento(req, res) {
      res.json(await indicadoresService.perrosEnTratamiento())
    },

    async adopcionesPorMes(req, res) {
      res.json(await indicadoresService.adopcionesPorMes())
    },

    async reportes(req, res) {
      const reporte = await indicadoresService.reporte(req.query)
      res.setHeader('Content-Type', reporte.tipo)
      res.setHeader('Content-Disposition', `attachment; filename="${reporte.nombre}"`)
      res.send(reporte.contenido)
    },
  }
}
