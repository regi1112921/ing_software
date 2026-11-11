// Tablas propias: vacunas y desparasitaciones (controles preventivos, HU-08).
// Los pendientes salen de la vista v_controles_pendientes (database/views).

const COLUMNAS_VACUNA = `v.id, v.perro_id, v.nombre, v.fecha_aplicacion, v.fecha_proxima_dosis, v.observaciones,
                         v.veterinario_id, u.nombre_completo as veterinario_nombre, v.creado_en`

const COLUMNAS_DESPARASITACION = `d.id, d.perro_id, d.tipo, d.producto, d.fecha_aplicacion, d.fecha_proxima, d.observaciones,
                                  d.veterinario_id, u.nombre_completo as veterinario_nombre, d.creado_en`

export function crearControlesRepository(pool) {
  return {
    // Vencidos y los que vencen dentro de `dias` días, del más urgente al menos urgente.
    async pendientes({ dias }) {
      const { rows } = await pool.query(
        `select tipo, control_id, perro_id, perro_nombre, perro_foto_url, perro_estado, detalle,
                ultima_aplicacion, fecha_programada, dias_restantes, vencido
           from v_controles_pendientes
          where fecha_programada <= current_date + $1::int
          order by fecha_programada, perro_nombre, detalle`,
        [dias],
      )
      return rows
    },

    async vacunasDePerro(perroId) {
      const { rows } = await pool.query(
        `select ${COLUMNAS_VACUNA}
           from vacunas v
           join usuarios u on u.id = v.veterinario_id
          where v.perro_id = $1
          order by v.fecha_aplicacion desc, v.id desc`,
        [perroId],
      )
      return rows
    },

    async desparasitacionesDePerro(perroId) {
      const { rows } = await pool.query(
        `select ${COLUMNAS_DESPARASITACION}
           from desparasitaciones d
           join usuarios u on u.id = d.veterinario_id
          where d.perro_id = $1
          order by d.fecha_aplicacion desc, d.id desc`,
        [perroId],
      )
      return rows
    },

    async crearVacuna(vacuna) {
      const { rows } = await pool.query(
        `with nueva as (
           insert into vacunas (perro_id, veterinario_id, nombre, fecha_aplicacion, fecha_proxima_dosis, observaciones)
           values ($1, $2, $3, $4, $5, $6)
           returning *
         )
         select ${COLUMNAS_VACUNA} from nueva v join usuarios u on u.id = v.veterinario_id`,
        [
          vacuna.perro_id, vacuna.veterinario_id, vacuna.nombre,
          vacuna.fecha_aplicacion, vacuna.fecha_proxima_dosis, vacuna.observaciones,
        ],
      )
      return rows[0]
    },

    async crearDesparasitacion(desparasitacion) {
      const { rows } = await pool.query(
        `with nueva as (
           insert into desparasitaciones (perro_id, veterinario_id, tipo, producto, fecha_aplicacion, fecha_proxima, observaciones)
           values ($1, $2, $3, $4, $5, $6, $7)
           returning *
         )
         select ${COLUMNAS_DESPARASITACION} from nueva d join usuarios u on u.id = d.veterinario_id`,
        [
          desparasitacion.perro_id, desparasitacion.veterinario_id, desparasitacion.tipo, desparasitacion.producto,
          desparasitacion.fecha_aplicacion, desparasitacion.fecha_proxima, desparasitacion.observaciones,
        ],
      )
      return rows[0]
    },
  }
}
