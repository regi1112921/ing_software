export function crearDonacionesController(donacionesService) {
  return {
    async listar(req, res) {
      const donaciones = await donacionesService.listar()
      res.json({ total: donaciones.length, donaciones })
    },

    async crear(req, res) {
      res.status(201).json(await donacionesService.crear(req.body, req.usuario))
    },
  }
}