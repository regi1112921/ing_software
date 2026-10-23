// Servicio de solo lectura: no es dueño de ninguna tabla. Lee perros, estados_perro, solicitudes_adopcion y v_perros.
// "Este mes" se calcula con current_date de la BD.
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

    // Pendientes: en proceso o aprobadas (aún no se resolvieron).
    async conteoSolicitudes() {
      const { rows } = await pool.query(
        `select count(*) filter (where estado = 'finalizada'
                                   and date_trunc('month', fecha_adopcion) = date_trunc('month', current_date)) as adopciones_mes,
                count(*) filter (where estado in ('en_proceso', 'aprobada')) as pendientes
           from solicitudes_adopcion`,
      )
      return rows[0]
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

    async adopcionesPorMes(cantidadMeses) {
      const { rows } = await pool.query(
        `select to_char(m.mes, 'YYYY-MM') as mes, count(s.id) as cantidad
           from generate_series(date_trunc('month', current_date) - make_interval(months => $1::int - 1),
                                date_trunc('month', current_date),
                                interval '1 month') as m (mes)
           left join solicitudes_adopcion s
                  on s.estado = 'finalizada'
                 and date_trunc('month', s.fecha_adopcion) = m.mes
          group by m.mes
          order by m.mes`,
        [cantidadMeses],
      )
      return rows
    },
  }
}
