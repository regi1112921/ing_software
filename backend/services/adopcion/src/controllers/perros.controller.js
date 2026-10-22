export function crearPerrosController(perrosService) {
  return {
    async listar(req, res) {
      const perros = await perrosService.listar(req.query)
      res.json({ total: perros.length, perros })
    },

    async obtener(req, res) {
      res.json(await perrosService.obtener(req.params.id))
    },

    async crear(req, res) {
      res.status(201).json(await perrosService.crear(req.body, req.usuario))
    },

    async actualizar(req, res) {
      res.json(await perrosService.actualizar(req.params.id, req.body))
    },
  }
}
