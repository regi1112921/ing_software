export function crearAvisosController(avisosService) {
  return {
    async borrador(req, res) {
      res.json(await avisosService.borrador(req.params.id))
    },

    async listar(req, res) {
      const avisos = await avisosService.listar(req.params.id)
      res.json({ total: avisos.length, avisos })
    },

    async registrar(req, res) {
      res.status(201).json(await avisosService.registrar(req.params.id, req.body, req.usuario))
    },
  }
}
