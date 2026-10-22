export function crearAdopcionesController(adopcionesService) {
  return {
    async listar(req, res) {
      const adopciones = await adopcionesService.listar()
      res.json({ total: adopciones.length, adopciones })
    },

    async obtener(req, res) {
      res.json(await adopcionesService.obtener(req.params.id))
    },

    async crear(req, res) {
      res.status(201).json(await adopcionesService.crear(req.body, req.usuario))
    },

    async cambiarEstado(req, res) {
      res.json(await adopcionesService.cambiarEstado(req.params.id, req.body))
    },
  }
}
