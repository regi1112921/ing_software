import { http, query } from './http'
import type { Evolucion, Periodo, PerrosEnTratamiento, Resumen } from './tipos'

const BASE = '/api/dashboard'

export const dashboardApi = {
  // HU-12: sin periodo, el backend usa el mes actual.
  obtenerResumen: (periodo?: Periodo) => http<Resumen>(`${BASE}/resumen${query({ ...periodo })}`),
  obtenerPerrosEnTratamiento: () => http<PerrosEnTratamiento>(`${BASE}/perros-en-tratamiento`),
  obtenerEvolucion: (periodo?: Periodo) => http<Evolucion>(`${BASE}/evolucion${query({ ...periodo })}`),
}
