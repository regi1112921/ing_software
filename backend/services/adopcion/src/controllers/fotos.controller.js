export function crearFotosController(fotosService) {
  return {
    async subir(req, res) {
      res.status(201).json(await fotosService.subir(req.body, req.query))
    },
  }
}
