import { http, query } from './http'
import type {
  Adopcion,
  Catalogos,
  CambioEstadoAdopcion,
  DatosAdopcion,
  DatosPerro,
  EstadoPerro,
  Perro,
  PerroDetalle,
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
}
