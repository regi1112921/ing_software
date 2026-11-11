export function crearControlesController(controlesService) {
  return {
    async pendientes(req, res) {
      res.json(await controlesService.pendientes(req.query))
    },

    async registrarVacuna(req, res) {
      res.status(201).json(await controlesService.registrarVacuna(req.body))
    },

    async registrarDesparasitacion(req, res) {
      res.status(201).json(await controlesService.registrarDesparasitacion(req.body))
    },
  }
}
