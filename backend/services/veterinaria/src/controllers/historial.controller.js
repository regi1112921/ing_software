export function crearHistorialController(historialService) {
  return {
    async veterinarios(req, res) {
      res.json({ veterinarios: await historialService.listarVeterinarios() })
    },

    async historial(req, res) {
      res.json(await historialService.historialDePerro(req.params.id))
    },

    async registrarConsulta(req, res) {
      res.status(201).json(await historialService.registrarConsulta(req.body))
    },
  }
}
