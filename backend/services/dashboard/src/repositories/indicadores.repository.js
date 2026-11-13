// Servicio de solo lectura: no es dueño de ninguna tabla. Lee perros, estados_perro, solicitudes_adopcion,
// consultas y v_perros. "Este mes" (adopciones_mes) se calcula con current_date de la BD.
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

    // HU-12: indicadores de un periodo (fechas incluidas).
    async indicadoresPeriodo(desde, hasta) {
      const { rows } = await pool.query(
        `select (select count(*) from perros where fecha_ingreso between $1 and $2) as ingresos,
                (select count(*) from solicitudes_adopcion
                  where estado = 'finalizada' and fecha_adopcion between $1 and $2) as adopciones,
                (select count(*) from solicitudes_adopcion where fecha_solicitud between $1 and $2) as solicitudes,
                (select count(*) from consultas where fecha between $1 and $2) as atenciones`,
        [desde, hasta],
      )
      return rows[0]
    },

    // HU-12: ingresos y adopciones finalizadas por día o por mes dentro del periodo (también los de 0).
    // unidad: 'day' | 'month'.
    async evolucion(desde, hasta, unidad) {
      const { rows } = await pool.query(
        `with serie as (
           select g::date as inicio
             from generate_series(date_trunc($3, $1::date), $2::date, ('1 ' || $3)::interval) as g
         ),
         ingresos as (
           select date_trunc($3, fecha_ingreso)::date as inicio, count(*) as cantidad
             from perros where fecha_ingreso between $1 and $2 group by 1
         ),
         adopciones as (
           select date_trunc($3, fecha_adopcion)::date as inicio, count(*) as cantidad
             from solicitudes_adopcion
            where estado = 'finalizada' and fecha_adopcion between $1 and $2 group by 1
         )
         select to_char(s.inicio, case when $3 = 'day' then 'YYYY-MM-DD' else 'YYYY-MM' end) as periodo,
                coalesce(i.cantidad, 0) as ingresos,
                coalesce(a.cantidad, 0) as adopciones
           from serie s
           left join ingresos   i on i.inicio = s.inicio
           left join adopciones a on a.inicio = s.inicio
          order by s.inicio`,
        [desde, hasta, unidad],
      )
      return rows
    },
  }
}
