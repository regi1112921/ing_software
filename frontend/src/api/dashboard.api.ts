import { http, tokenGuardado } from './http'
import type { AdopcionesPorMes, PerrosEnTratamiento, Resumen } from './tipos'

const BASE = '/api/dashboard'

export const dashboardApi = {
  obtenerResumen: () => http<Resumen>(`${BASE}/resumen`),
  obtenerPerrosEnTratamiento: () => http<PerrosEnTratamiento>(`${BASE}/perros-en-tratamiento`),
  obtenerAdopcionesPorMes: () => http<AdopcionesPorMes>(`${BASE}/adopciones-por-mes`),
  async descargarReporte(tipo: 'perros' | 'adopciones' | 'atenciones', formato: 'pdf' | 'excel', desde?: string, hasta?: string) {
    const parametros = new URLSearchParams({ tipo, formato })
    if (desde) parametros.set('desde', desde)
    if (hasta) parametros.set('hasta', hasta)
    const token = tokenGuardado.leer()
    const respuesta = await fetch(`${BASE}/reportes?${parametros}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    if (!respuesta.ok) throw new Error('No se pudo generar el reporte.')
    const blob = await respuesta.blob()
    const nombre = respuesta.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1]
      ?? `reporte-${tipo}.${formato === 'pdf' ? 'pdf' : 'csv'}`
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = nombre
    enlace.click()
    URL.revokeObjectURL(url)
  },
}
