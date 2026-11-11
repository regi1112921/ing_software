export function crearSolicitudesPublicasController(solicitudesPublicasService) {
  return {
    async listar(req, res) {
      const solicitudes = await solicitudesPublicasService.listar(req.query)
      res.json({ total: solicitudes.length, solicitudes })
    },

    async obtener(req, res) {
      res.json(await solicitudesPublicasService.obtener(req.params.id))
    },

    async descartar(req, res) {
      res.json(await solicitudesPublicasService.descartar(req.params.id, req.usuario))
    },
  }
}
