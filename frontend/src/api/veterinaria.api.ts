import { http, query } from './http'
import type {
  Agenda,
  Cita,
  Consulta,
  ControlesPendientes,
  DatosAtencionCita,
  DatosCita,
  DatosConsulta,
  DatosDesparasitacion,
  DatosVacuna,
  Desparasitacion,
  FiltrosAgenda,
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

  // HU-11 · Agenda de citas
  listarCitas: (filtros: FiltrosAgenda = {}) =>
    http<Agenda>(
      `${BASE}/citas${query({
        desde: filtros.desde,
        hasta: filtros.hasta,
        veterinario_id: filtros.veterinario_id ? String(filtros.veterinario_id) : undefined,
        perro_id: filtros.perro_id ? String(filtros.perro_id) : undefined,
        estado: filtros.estado,
      })}`,
    ),
  obtenerCita: (id: number | string) => http<Cita>(`${BASE}/citas/${id}`),
  crearCita: (datos: DatosCita) => http<Cita>(`${BASE}/citas`, { method: 'POST', body: datos }),
  editarCita: (id: number | string, datos: DatosCita) => http<Cita>(`${BASE}/citas/${id}`, { method: 'PUT', body: datos }),
  cancelarCita: (id: number | string, motivoCancelacion: string | null) =>
    http<Cita>(`${BASE}/citas/${id}/cancelar`, { method: 'POST', body: { motivo_cancelacion: motivoCancelacion } }),
  atenderCita: (id: number | string, datos: DatosAtencionCita) =>
    http<{ cita: Cita; consulta: Consulta }>(`${BASE}/citas/${id}/atender`, { method: 'POST', body: datos }),
}
