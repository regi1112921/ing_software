export function crearIndicadoresController(indicadoresService) {
  return {
    async resumen(req, res) {
      res.json(await indicadoresService.resumen())
    },

    async perrosEnTratamiento(req, res) {
      res.json(await indicadoresService.perrosEnTratamiento())
    },
  }
}
