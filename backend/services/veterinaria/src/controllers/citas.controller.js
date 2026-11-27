export function crearCitasController(citasService) {
  return {
    async listar(req, res) {
      res.json(await citasService.listar(req.query))
    },

    async obtener(req, res) {
      res.json(await citasService.obtener(req.params.id))
    },

    async crear(req, res) {
      res.status(201).json(await citasService.crear(req.body, req.usuario))
    },

    async editar(req, res) {
      res.json(await citasService.editar(req.params.id, req.body))
    },

    async cancelar(req, res) {
      res.json(await citasService.cancelar(req.params.id, req.body))
    },

    async atender(req, res) {
      res.status(201).json(await citasService.atender(req.params.id, req.body))
    },
  }
}
