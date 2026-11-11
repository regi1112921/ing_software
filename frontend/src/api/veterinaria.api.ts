import { http, query } from './http'
import type {
  Consulta,
  ControlesPendientes,
  DatosConsulta,
  DatosDesparasitacion,
  DatosVacuna,
  Desparasitacion,
  Historial,
  Vacuna,
  Veterinario,
} from './tipos'

const BASE = '/api/veterinaria'

export const veterinariaApi = {
  listarVeterinarios: () => http<{ veterinarios: Veterinario[] }>(`${BASE}/veterinarios`),
  obtenerHistorial: (perroId: number | string) => http<Historial>(`${BASE}/perros/${perroId}/historial`),
  registrarConsulta: (datos: DatosConsulta) => http<Consulta>(`${BASE}/consultas`, { method: 'POST', body: datos }),

  // HU-08
  listarControlesPendientes: (dias?: number) =>
    http<ControlesPendientes>(`${BASE}/controles/pendientes${query({ dias: dias === undefined ? undefined : String(dias) })}`),
  registrarVacuna: (datos: DatosVacuna) => http<Vacuna>(`${BASE}/vacunas`, { method: 'POST', body: datos }),
  registrarDesparasitacion: (datos: DatosDesparasitacion) =>
    http<Desparasitacion>(`${BASE}/desparasitaciones`, { method: 'POST', body: datos }),
}
