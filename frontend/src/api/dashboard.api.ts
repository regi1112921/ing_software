import { http } from './http'
import type { AdopcionesPorMes, PerrosEnTratamiento, Resumen } from './tipos'

const BASE = '/api/dashboard'

export const dashboardApi = {
  obtenerResumen: () => http<Resumen>(`${BASE}/resumen`),
  obtenerPerrosEnTratamiento: () => http<PerrosEnTratamiento>(`${BASE}/perros-en-tratamiento`),
  obtenerAdopcionesPorMes: () => http<AdopcionesPorMes>(`${BASE}/adopciones-por-mes`),
}
