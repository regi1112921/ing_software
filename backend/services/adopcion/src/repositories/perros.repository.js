// Tabla propia: perros (se lee a través de la vista v_perros, que agrega nombres y edad).

// Escapa % y _ para que la búsqueda los trate como texto.
const comoPatron = (texto) => `%${texto.replace(/[\\%_]/g, (c) => `\\${c}`)}%`

export function crearPerrosRepository(pool) {
  return {
    async listar({ buscar, estado }) {
      const { rows } = await pool.query(
        `select * from v_perros
          where ($1::text is null or nombre ilike $1 or raza ilike $1)
            and ($2::text is null or estado = $2)
          order by nombre, id`,
        [buscar ? comoPatron(buscar) : null, estado ?? null],
      )
      return rows
    },

    async obtener(id) {
      const { rows } = await pool.query('select * from v_perros where id = $1', [id])
      return rows[0] ?? null
    },

    async crear(perro, registradoPor) {
      const { rows } = await pool.query(
        `insert into perros (nombre, sexo, raza_id, color, tamano, fecha_nacimiento, fecha_nacimiento_estimada,
                             fecha_ingreso, estado, foto_url, registrado_por)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         returning id`,
        [
          perro.nombre, perro.sexo, perro.raza_id, perro.color, perro.tamano, perro.fecha_nacimiento,
          perro.fecha_nacimiento_estimada, perro.fecha_ingreso, perro.estado, perro.foto_url, registradoPor,
        ],
      )
      return rows[0].id
    },

    // estado = null deja el estado como está.
    async actualizar(id, perro) {
      await pool.query(
        `update perros
            set nombre = $2, sexo = $3, raza_id = $4, color = $5, tamano = $6, fecha_nacimiento = $7,
                fecha_nacimiento_estimada = $8, fecha_ingreso = $9, foto_url = $10,
                estado = coalesce($11, estado)
          where id = $1`,
        [
          id, perro.nombre, perro.sexo, perro.raza_id, perro.color, perro.tamano, perro.fecha_nacimiento,
          perro.fecha_nacimiento_estimada, perro.fecha_ingreso, perro.foto_url, perro.estado,
        ],
      )
    },

    // Bloquea la fila del perro dentro de una transacción (registrar adopción).
    async obtenerParaAdopcion(cliente, id) {
      const { rows } = await cliente.query(
        `select p.id, p.estado, e.nombre as estado_nombre
           from perros p join estados_perro e on e.codigo = p.estado
          where p.id = $1
            for update of p`,
        [id],
      )
      return rows[0] ?? null
    },
  }
}
