export function crearCatalogosController(catalogos) {
  return {
    async listar(req, res) {
      res.json(await catalogos.listar())
    },
  }
}
