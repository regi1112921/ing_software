import { http } from './http'
import type { Consulta, DatosConsulta, Historial, Veterinario } from './tipos'

const BASE = '/api/veterinaria'

export const veterinariaApi = {
  listarVeterinarios: () => http<{ veterinarios: Veterinario[] }>(`${BASE}/veterinarios`),
  obtenerHistorial: (perroId: number | string) => http<Historial>(`${BASE}/perros/${perroId}/historial`),
  registrarConsulta: (datos: DatosConsulta) => http<Consulta>(`${BASE}/consultas`, { method: 'POST', body: datos }),
}
