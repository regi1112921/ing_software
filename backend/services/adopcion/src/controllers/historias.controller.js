export function crearHistoriasController(historiasService) {
  return {
    async listar(req, res) {
      const historias = await historiasService.listar(req.query)
      res.json({ total: historias.length, historias })
    },

    async candidatas(req, res) {
      const adopciones = await historiasService.candidatas()
      res.json({ total: adopciones.length, adopciones })
    },

    async obtener(req, res) {
      res.json(await historiasService.obtener(req.params.id))
    },

    async publicar(req, res) {
      res.status(201).json(await historiasService.publicar(req.body, req.usuario))
    },

    async actualizar(req, res) {
      res.json(await historiasService.actualizar(req.params.id, req.body))
    },
  }
}
