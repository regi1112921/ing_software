export function crearSeguimientosController(seguimientosService) {
  return {
    async listar(req, res) {
      const seguimientos = await seguimientosService.listar(req.params.id)
      res.json({ total: seguimientos.length, seguimientos })
    },

    async registrar(req, res) {
      res.status(201).json(await seguimientosService.registrar(req.params.id, req.body, req.usuario))
    },

    async marcarProblemas(req, res) {
      res.json(await seguimientosService.marcarProblemas(req.params.id, req.params.seguimientoId, req.body))
    },

    async sinSeguimiento(req, res) {
      res.json(await seguimientosService.sinSeguimiento(req.query))
    },

    async conProblemas(req, res) {
      res.json(await seguimientosService.conProblemas())
    },
  }
}
