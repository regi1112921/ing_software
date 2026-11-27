export function crearVoluntariadoController(service) {
  return {
    async listarVoluntarios(req, res) {
      const voluntarios = await service.listarVoluntarios()
      res.json({ total: voluntarios.length, voluntarios })
    },

    async registrarVoluntario(req, res) {
      res.status(201).json(await service.registrarVoluntario(req.body))
    },

    async calendario(req, res) {
      res.json(await service.calendario(req.query))
    },

    async asignarTurno(req, res) {
      res.status(201).json(await service.asignarTurno(req.body))
    },

    async horasMensuales(req, res) {
      res.json(await service.horasMensuales(req.query))
    },
  }
}
