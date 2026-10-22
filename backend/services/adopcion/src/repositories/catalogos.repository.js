// Tablas propias: razas, tamanos, estados_perro, estados_solicitud.
export function crearCatalogosRepository(pool) {
  return {
    async listar() {
      const [razas, tamanos, estadosPerro, estadosSolicitud] = await Promise.all([
        pool.query('select id, nombre from razas where activa order by nombre'),
        pool.query('select codigo, nombre from tamanos order by orden'),
        pool.query('select codigo, nombre, descripcion from estados_perro order by orden'),
        pool.query('select codigo, nombre, descripcion from estados_solicitud order by orden'),
      ])
      return {
        razas: razas.rows,
        tamanos: tamanos.rows,
        estados_perro: estadosPerro.rows,
        estados_solicitud: estadosSolicitud.rows,
      }
    },

    async razaActiva(id) {
      const { rowCount } = await pool.query('select 1 from razas where id = $1 and activa', [id])
      return rowCount === 1
    },
  }
}
