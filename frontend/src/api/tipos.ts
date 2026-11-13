// Formas de los datos que devuelve el backend (snake_case, igual que las columnas de la BD).
// Fechas como 'AAAA-MM-DD'.

export type Sexo = 'macho' | 'hembra'
export type EstadoPerro = 'disponible' | 'en_tratamiento' | 'en_adopcion' | 'adoptado'
export type EstadoAdopcion = 'en_proceso' | 'aprobada' | 'rechazada' | 'finalizada'
export type Rol = 'administrador' | 'veterinario' | 'responsable_adopciones'

// ── Autenticación ────────────────────────────────────────────────────────────

export interface Usuario {
  id: number
  nombre_completo: string
  correo: string
  rol: Rol
}

// La cuenta se crea siempre con rol responsable_adopciones.
export interface DatosRegistro {
  nombre_completo: string
  correo: string
  contrasena: string
}

export interface RespuestaLogin {
  token: string
  expira: string
  usuario: Usuario
}

// ── Adopción: catálogos ──────────────────────────────────────────────────────

export interface Catalogos {
  razas: { id: number; nombre: string }[]
  tamanos: { codigo: string; nombre: string }[]
  estados_perro: { codigo: EstadoPerro; nombre: string; descripcion: string }[]
  estados_solicitud: { codigo: EstadoAdopcion; nombre: string; descripcion: string }[]
}

// ── Adopción: perros ─────────────────────────────────────────────────────────

export interface Perro {
  id: number
  nombre: string
  sexo: Sexo
  raza_id: number
  raza: string
  color: string | null
  tamano: string
  tamano_nombre: string
  fecha_nacimiento: string | null
  fecha_nacimiento_estimada: boolean
  edad_meses: number | null
  fecha_ingreso: string
  estado: EstadoPerro
  estado_nombre: string
  foto_url: string | null
}

export interface PerroDetalle extends Perro {
  adopcion_vigente: Adopcion | null
}

export interface DatosPerro {
  nombre: string
  raza_id: number
  sexo: Sexo
  tamano: string
  fecha_ingreso: string
  fecha_nacimiento?: string | null
  edad_aproximada?: { anios: number; meses: number } | null
  color?: string | null
  foto_url?: string | null
  estado?: 'disponible' | 'en_tratamiento'
}

// ── Adopción: adopciones ─────────────────────────────────────────────────────

export interface Adoptante {
  id: number
  nombre_completo: string
  documento_identidad: string | null
  telefono: string
  direccion: string
}

export interface PerroResumen {
  id: number
  nombre: string
  raza: string
  sexo: Sexo
  tamano: string
  tamano_nombre: string
  edad_meses: number | null
  fecha_nacimiento_estimada: boolean
  estado: EstadoPerro
  estado_nombre: string
  foto_url: string | null
}

export interface Adopcion {
  id: number
  estado: EstadoAdopcion
  estado_nombre: string
  fecha_solicitud: string
  fecha_aprobacion: string | null
  fecha_rechazo: string | null
  fecha_adopcion: string | null
  observaciones: string | null
  perro: PerroResumen
  adoptante: Adoptante
  transiciones_permitidas?: EstadoAdopcion[]
}

export interface DatosAdopcion {
  perro_id: number
  adoptante: {
    nombre_completo: string
    telefono: string
    direccion: string
    documento_identidad?: string | null
  }
  fecha_solicitud?: string
  observaciones?: string | null
  // HU-09: adopción iniciada desde una solicitud del catálogo público.
  solicitud_publica_id?: number | null
}

// ── Solicitudes del catálogo público (HU-09) ──────────────────────────────────

export type EstadoSolicitudPublica = 'pendiente' | 'convertida' | 'descartada'

export interface SolicitudPublica {
  id: number
  perro_id: number
  perro_nombre: string
  perro_foto_url: string | null
  perro_estado: EstadoPerro
  nombre_completo: string
  telefono: string
  correo: string | null
  mensaje: string | null
  estado: EstadoSolicitudPublica
  // Adopción creada a partir de esta solicitud (si se convirtió).
  solicitud_id: number | null
  revisado_por_nombre: string | null
  revisado_en: string | null
  creado_en: string
}

export interface CambioEstadoAdopcion {
  estado: 'aprobada' | 'rechazada' | 'finalizada'
  fecha?: string
  observaciones?: string | null
}

// ── Seguimiento después de la adopción (HU-10) ────────────────────────────────

export type TipoSeguimiento = 'visita' | 'llamada'

export interface Seguimiento {
  id: number
  solicitud_id: number
  fecha: string
  tipo: TipoSeguimiento
  observaciones: string
  // Marcado para revisarlo; se desmarca cuando el problema ya se revisó.
  con_problemas: boolean
  registrado_por: number
  registrado_por_nombre: string
  creado_en: string
}

export interface DatosSeguimiento {
  fecha?: string
  tipo: TipoSeguimiento
  observaciones: string
  con_problemas?: boolean
}

// Adopción finalizada sin seguimiento en los últimos N días.
export interface AdopcionSinSeguimiento {
  solicitud_id: number
  perro_id: number
  perro_nombre: string
  perro_foto_url: string | null
  adoptante_nombre: string
  adoptante_telefono: string
  fecha_adopcion: string
  total_seguimientos: number
  ultimo_seguimiento: string | null
  seguimientos_con_problemas: number
  // Desde el último seguimiento o, si no hay ninguno, desde la entrega.
  dias_sin_seguimiento: number
}

export interface SeguimientoConProblemas extends Seguimiento {
  perro_id: number
  perro_nombre: string
  perro_foto_url: string | null
  adoptante_nombre: string
  adoptante_telefono: string
}

// ── Veterinaria ──────────────────────────────────────────────────────────────

export interface Veterinario {
  id: number
  nombre_completo: string
}

export interface Consulta {
  id: number
  perro_id: number
  fecha: string
  motivo: string
  diagnostico: string
  tratamiento: string
  observaciones: string | null
  veterinario_id: number
  veterinario_nombre: string
}

export interface Historial {
  perro_id: number
  // Número de consultas (atenciones).
  total: number
  consultas: Consulta[]
  vacunas: Vacuna[]
  desparasitaciones: Desparasitacion[]
}

// ── Controles preventivos (HU-08) ─────────────────────────────────────────────

export type TipoDesparasitacion = 'interna' | 'externa'

export interface Vacuna {
  id: number
  perro_id: number
  nombre: string
  fecha_aplicacion: string
  fecha_proxima_dosis: string | null
  observaciones: string | null
  veterinario_id: number
  veterinario_nombre: string
}

export interface Desparasitacion {
  id: number
  perro_id: number
  tipo: TipoDesparasitacion
  producto: string
  fecha_aplicacion: string
  fecha_proxima: string | null
  observaciones: string | null
  veterinario_id: number
  veterinario_nombre: string
}

export interface ControlPendiente {
  tipo: 'vacuna' | 'desparasitacion'
  control_id: number
  perro_id: number
  perro_nombre: string
  perro_foto_url: string | null
  perro_estado: EstadoPerro
  // Nombre de la vacuna o "Desparasitación interna/externa".
  detalle: string
  ultima_aplicacion: string
  fecha_programada: string
  // Negativo si ya venció.
  dias_restantes: number
  vencido: boolean
}

export interface ControlesPendientes {
  dias: number
  total: number
  vencidos: number
  controles: ControlPendiente[]
}

export interface DatosVacuna {
  perro_id: number
  veterinario_id: number
  nombre: string
  fecha_aplicacion?: string
  fecha_proxima_dosis?: string | null
  observaciones?: string | null
}

export interface DatosDesparasitacion {
  perro_id: number
  veterinario_id: number
  tipo: TipoDesparasitacion
  producto: string
  fecha_aplicacion?: string
  fecha_proxima?: string | null
  observaciones?: string | null
}

export interface DatosConsulta {
  perro_id: number
  veterinario_id: number
  fecha?: string
  motivo: string
  diagnostico: string
  tratamiento: string
  observaciones?: string | null
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export interface Resumen {
  total: number
  por_estado: { codigo: EstadoPerro; nombre: string; cantidad: number }[]
  indicadores: {
    en_albergue: number
    disponibles: number
    en_tratamiento: number
    adopciones_mes: number
    solicitudes_pendientes: number
  }
  // HU-12 · Indicadores del rango elegido.
  periodo: Periodo & { ingresos: number; adopciones: number; solicitudes: number; atenciones: number }
}

// HU-12 · Ingresos y adopciones del periodo, por día ('AAAA-MM-DD') o por mes ('AAAA-MM').
export interface Evolucion {
  desde: string
  hasta: string
  unidad: 'dia' | 'mes'
  total_ingresos: number
  total_adopciones: number
  puntos: { periodo: string; ingresos: number; adopciones: number }[]
}

// HU-12 · Rango de fechas del dashboard (por defecto, el mes actual).
export interface Periodo {
  desde: string
  hasta: string
}

export interface PerrosEnTratamiento {
  total: number
  perros: Pick<Perro, 'id' | 'nombre' | 'sexo' | 'raza' | 'foto_url' | 'fecha_ingreso'>[]
}
