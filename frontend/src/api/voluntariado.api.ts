import { http } from './http'

export interface Voluntario {
  id: number
  nombre_completo: string
  telefono: string
  correo: string | null
  disponibilidad: string
  activo: boolean
}

export interface TurnoVoluntariado {
  id: number
  voluntario_id: number
  voluntario_nombre: string
  telefono: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  actividad: string
}

export interface HorasVoluntario {
  voluntario_id: number
  nombre_completo: string
  horas: string
}

const BASE = '/api/voluntariado'

export const voluntariadoApi = {
  async listarVoluntarios() {
    return http<{ total: number; voluntarios: Voluntario[] }>(`${BASE}/voluntarios`)
  },
  async registrarVoluntario(datos: {
    nombre_completo: string
    telefono: string
    correo: string
    disponibilidad: string
  }) {
    return http<Voluntario>(`${BASE}/voluntarios`, { method: 'POST', body: datos })
  },
  async calendario(desde: string, hasta: string) {
    return http<{ desde: string; hasta: string; total: number; turnos: TurnoVoluntariado[] }>(
      `${BASE}/turnos?${new URLSearchParams({ desde, hasta })}`,
    )
  },
  async asignarTurno(datos: {
    voluntario_id: number
    fecha: string
    hora_inicio: string
    hora_fin: string
    actividad: string
  }) {
    return http<TurnoVoluntariado>(`${BASE}/turnos`, { method: 'POST', body: datos })
  },
  async horasMensuales(mes: string) {
    return http<{ mes: string; total: number; voluntarios: HorasVoluntario[] }>(
      `${BASE}/horas?${new URLSearchParams({ mes })}`,
    )
  },
}
