// Tabla propia: adoptantes. Se usa siempre dentro de la transacción de la adopción.
export function crearAdoptantesRepository() {
  return {
    async buscarPorDocumento(cliente, documento) {
      const { rows } = await cliente.query('select id from adoptantes where documento_identidad = $1', [documento])
      return rows[0] ?? null
    },

    async crear(cliente, adoptante, registradoPor) {
      const { rows } = await cliente.query(
        `insert into adoptantes (nombre_completo, documento_identidad, telefono, direccion, registrado_por)
         values ($1, $2, $3, $4, $5)
         returning id`,
        [adoptante.nombre_completo, adoptante.documento_identidad, adoptante.telefono, adoptante.direccion, registradoPor],
      )
      return rows[0].id
    },
  }
}
