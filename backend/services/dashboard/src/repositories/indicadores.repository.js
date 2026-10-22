// Servicio de solo lectura: no es dueño de ninguna tabla. Lee perros, estados_perro y v_perros.
export function crearIndicadoresRepository(pool) {
  return {
    async conteoPorEstado() {
      const { rows } = await pool.query(
        `select e.codigo, e.nombre, count(p.id) as cantidad
           from estados_perro e
           left join perros p on p.estado = e.codigo
          group by e.codigo, e.nombre, e.orden
          order by e.orden`,
      )
      return rows
    },

    async perrosEnTratamiento() {
      const { rows } = await pool.query(
        `select id, nombre, sexo, raza, foto_url, fecha_ingreso
           from v_perros
          where estado = 'en_tratamiento'
          order by fecha_ingreso, id`,
      )
      return rows
    },
  }
}
