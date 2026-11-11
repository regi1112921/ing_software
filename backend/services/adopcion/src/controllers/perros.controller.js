import { puedeVerAdopciones } from '../permisos.js'

export function crearPerrosController(perrosService) {
  return {
    async listar(req, res) {
      const perros = await perrosService.listar(req.query)
      res.json({ total: perros.length, perros })
    },

    async obtener(req, res) {
      // Veterinaria no ve la adopción vigente (trae los datos del adoptante): HU-07.
      res.json(await perrosService.obtener(req.params.id, { verAdopcion: puedeVerAdopciones(req.usuario) }))
    },

    async crear(req, res) {
      res.status(201).json(await perrosService.crear(req.body, req.usuario))
    },

    async actualizar(req, res) {
      res.json(await perrosService.actualizar(req.params.id, req.body, { verAdopcion: puedeVerAdopciones(req.usuario) }))
    },
  }
}
