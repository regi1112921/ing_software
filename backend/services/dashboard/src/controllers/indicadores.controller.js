export function crearIndicadoresController(indicadoresService) {
  return {
    async resumen(req, res) {
      res.json(await indicadoresService.resumen(req.query))
    },

    async perrosEnTratamiento(req, res) {
      res.json(await indicadoresService.perrosEnTratamiento())
    },

    async adopcionesPorMes(req, res) {
      res.json(await indicadoresService.adopcionesPorMes())
    },

    async evolucion(req, res) {
      res.json(await indicadoresService.evolucion(req.query))
    },
  }
}
