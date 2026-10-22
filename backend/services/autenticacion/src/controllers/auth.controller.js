export function crearAuthController(authService) {
  return {
    async login(req, res) {
      res.json(await authService.iniciarSesion(req.body))
    },

    logout(req, res) {
      authService.cerrarSesion(req.token)
      res.status(204).end()
    },

    sesion(req, res) {
      res.json({ usuario: req.usuario })
    },
  }
}
