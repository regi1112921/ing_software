import { http, query } from './http'
import type {
  Adopcion,
  AvisoAdoptante,
  AvisoRegistrado,
  AdopcionSinSeguimiento,
  DatosSeguimiento,
  Seguimiento,
  SeguimientoConProblemas,
  Catalogos,
  CambioEstadoAdopcion,
  DatosAdopcion,
  DatosPerro,
  EstadoPerro,
  Perro,
  PerroDetalle,
  SolicitudPublica,
  EstadoSolicitudPublica,
} from './tipos'

const BASE = '/api/adopcion'

export const adopcionApi = {
  // Catálogos (HU-04)
  obtenerCatalogos: () => http<Catalogos>(`${BASE}/catalogos`),

  // Perros (HU-04 a HU-07)
  listarPerros: (filtros: { buscar?: string; estado?: EstadoPerro | '' } = {}) =>
    http<{ total: number; perros: Perro[] }>(`${BASE}/perros${query(filtros)}`),
  obtenerPerro: (id: number | string) => http<PerroDetalle>(`${BASE}/perros/${id}`),
  crearPerro: (datos: DatosPerro) => http<PerroDetalle>(`${BASE}/perros`, { method: 'POST', body: datos }),
  actualizarPerro: (id: number | string, datos: DatosPerro) =>
    http<PerroDetalle>(`${BASE}/perros/${id}`, { method: 'PUT', body: datos }),

  // Adopciones (HU-10 a HU-12)
  listarAdopciones: () => http<{ total: number; adopciones: Adopcion[] }>(`${BASE}/adopciones`),
  obtenerAdopcion: (id: number | string) => http<Adopcion>(`${BASE}/adopciones/${id}`),
  crearAdopcion: (datos: DatosAdopcion) => http<Adopcion>(`${BASE}/adopciones`, { method: 'POST', body: datos }),
  cambiarEstadoAdopcion: (id: number | string, cambio: CambioEstadoAdopcion) =>
    http<Adopcion>(`${BASE}/adopciones/${id}/estado`, { method: 'PATCH', body: cambio }),

  // Aviso al adoptante sobre su solicitud (HU-13)
  borradorAviso: (adopcionId: number | string) => http<AvisoAdoptante>(`${BASE}/adopciones/${adopcionId}/avisos/borrador`),
  listarAvisos: (adopcionId: number | string) =>
    http<{ total: number; avisos: AvisoRegistrado[] }>(`${BASE}/adopciones/${adopcionId}/avisos`),
  registrarAviso: (adopcionId: number | string, mensaje?: string) =>
    http<AvisoRegistrado>(`${BASE}/adopciones/${adopcionId}/avisos`, { method: 'POST', body: { mensaje } }),

  // Seguimiento después de la adopción (HU-10)
  listarSeguimientos: (adopcionId: number | string) =>
    http<{ total: number; seguimientos: Seguimiento[] }>(`${BASE}/adopciones/${adopcionId}/seguimientos`),
  registrarSeguimiento: (adopcionId: number | string, datos: DatosSeguimiento) =>
    http<Seguimiento>(`${BASE}/adopciones/${adopcionId}/seguimientos`, { method: 'POST', body: datos }),
  marcarProblemasSeguimiento: (adopcionId: number | string, seguimientoId: number, conProblemas: boolean) =>
    http<Seguimiento>(`${BASE}/adopciones/${adopcionId}/seguimientos/${seguimientoId}`, {
      method: 'PATCH',
      body: { con_problemas: conProblemas },
    }),
  listarSinSeguimiento: (dias?: number) =>
    http<{ dias: number; total: number; adopciones: AdopcionSinSeguimiento[] }>(
      `${BASE}/seguimientos/pendientes${query({ dias: dias ? String(dias) : undefined })}`,
    ),
  listarSeguimientosConProblemas: () =>
    http<{ total: number; seguimientos: SeguimientoConProblemas[] }>(`${BASE}/seguimientos/con-problemas`),

  // Solicitudes del catálogo público (HU-09)
  listarSolicitudesPublicas: (estado?: EstadoSolicitudPublica | '') =>
    http<{ total: number; solicitudes: SolicitudPublica[] }>(`${BASE}/solicitudes-publicas${query({ estado })}`),
  obtenerSolicitudPublica: (id: number | string) => http<SolicitudPublica>(`${BASE}/solicitudes-publicas/${id}`),
  descartarSolicitudPublica: (id: number | string) =>
    http<SolicitudPublica>(`${BASE}/solicitudes-publicas/${id}/descartar`, { method: 'POST' }),
}
