// Cliente de la API pública del servicio de Adopción (HU-09). No usa sesión.

export type Sexo = 'macho' | 'hembra'
export type RangoEdad = 'cachorro' | 'joven' | 'adulto' | 'senior'

export interface PerroPublico {
  id: number
  nombre: string
  sexo: Sexo
  raza: string
  tamano: string
  tamano_nombre: string
  color: string | null
  foto_url: string | null
  edad_meses: number | null
  fecha_nacimiento_estimada: boolean
  fecha_ingreso: string
}

export interface Opcion<T extends string = string> {
  codigo: T
  nombre: string
}

export interface Filtros {
  tamanos: Opcion[]
  sexos: Opcion<Sexo>[]
  edades: Opcion<RangoEdad>[]
}

export interface DatosSolicitud {
  perro_id: number
  nombre_completo: string
  telefono: string
  correo?: string | null
  mensaje?: string | null
  // Campo trampa para bots: siempre vacío en el formulario.
  sitio_web?: string
}

export class ErrorApi extends Error {
  constructor(
    public estado: number,
    mensaje: string,
    public porCampo: Record<string, string> = {},
  ) {
    super(mensaje)
  }
}

// VITE_API_URL en producción (Vercel); /api/adopcion con el proxy de Vite o de nginx.
const BASE = (import.meta.env.VITE_API_URL || '/api/adopcion').replace(/\/$/, '')

async function http<T>(ruta: string, opciones: { method?: 'GET' | 'POST'; body?: unknown } = {}): Promise<T> {
  let respuesta: Response
  try {
    respuesta = await fetch(`${BASE}/publico${ruta}`, {
      method: opciones.method ?? 'GET',
      headers: opciones.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: opciones.body !== undefined ? JSON.stringify(opciones.body) : undefined,
    })
  } catch {
    throw new ErrorApi(0, 'No pudimos conectar con el albergue. Revisa tu conexión e inténtalo de nuevo.')
  }

  const datos = await respuesta.json().catch(() => null)
  if (!respuesta.ok) {
    const porCampo: Record<string, string> = {}
    for (const { campo, mensaje } of (datos?.detalles ?? []) as { campo: string | null; mensaje: string }[]) {
      if (campo && !porCampo[campo]) porCampo[campo] = mensaje
    }
    const mensaje =
      datos?.error ?? (respuesta.status >= 500 ? 'El albergue tuvo un problema. Inténtalo de nuevo en un momento.' : `Error ${respuesta.status}`)
    throw new ErrorApi(respuesta.status, mensaje, porCampo)
  }
  return datos as T
}

function query(parametros: Record<string, string | undefined>): string {
  const busqueda = new URLSearchParams()
  for (const [clave, valor] of Object.entries(parametros)) if (valor) busqueda.set(clave, valor)
  const texto = busqueda.toString()
  return texto ? `?${texto}` : ''
}

export const api = {
  filtros: () => http<Filtros>('/filtros'),
  listarPerros: (filtros: { tamano?: string; sexo?: string; edad?: string }) =>
    http<{ total: number; perros: PerroPublico[] }>(`/perros${query(filtros)}`),
  obtenerPerro: (id: string | number) => http<PerroPublico>(`/perros/${id}`),
  enviarSolicitud: (datos: DatosSolicitud) => http<{ mensaje: string }>('/solicitudes', { method: 'POST', body: datos }),
}
