export function crearPublicoController(publicoService) {
  return {
    async filtros(req, res) {
      res.json(await publicoService.filtros())
    },

    async listar(req, res) {
      const perros = await publicoService.listar(req.query)
      res.json({ total: perros.length, perros })
    },

    async obtener(req, res) {
      res.json(await publicoService.obtener(req.params.id))
    },

    async enviarSolicitud(req, res) {
      const { perro_nombre } = await publicoService.enviarSolicitud(req.body)
      res.status(201).json({
        mensaje: perro_nombre
          ? `¡Gracias! Recibimos tu solicitud para adoptar a ${perro_nombre}. El albergue te contactará pronto.`
          : '¡Gracias! Recibimos tu solicitud. El albergue te contactará pronto.',
      })
    },
  }
}
