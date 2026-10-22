// Función base para llamar al backend. Agrega el token de la sesión y
// convierte las respuestas de error ({ error, detalles }) en ErrorApi.

const CLAVE_TOKEN = 'huellas.token'

export const EVENTO_SESION_EXPIRADA = 'huellas:sesion-expirada'

export interface DetalleError {
  campo: string | null
  mensaje: string
}

export class ErrorApi extends Error {
  estado: number
  detalles: DetalleError[]

  constructor(estado: number, mensaje: string, detalles: DetalleError[] = []) {
    super(mensaje)
    this.estado = estado
    this.detalles = detalles
  }

  // Errores por campo: { nombre: 'El nombre es obligatorio.' }
  get porCampo(): Record<string, string> {
    const errores: Record<string, string> = {}
    for (const { campo, mensaje } of this.detalles) {
      if (campo && !errores[campo]) errores[campo] = mensaje
    }
    return errores
  }
}

export const tokenGuardado = {
  leer: () => {
    try {
      return localStorage.getItem(CLAVE_TOKEN)
    } catch {
      return null
    }
  },
  guardar: (token: string) => {
    try {
      localStorage.setItem(CLAVE_TOKEN, token)
    } catch {
      // Sin almacenamiento la sesión dura lo que la pestaña.
    }
  },
  borrar: () => {
    try {
      localStorage.removeItem(CLAVE_TOKEN)
    } catch {
      // Nada que borrar.
    }
  },
}

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export async function http<T>(url: string, { method = 'GET', body }: { method?: Metodo; body?: unknown } = {}): Promise<T> {
  const token = tokenGuardado.leer()
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let respuesta: Response
  try {
    respuesta = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ErrorApi(0, 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.')
  }

  if (respuesta.status === 204) return undefined as T

  const datos = await respuesta.json().catch(() => null)
  if (!respuesta.ok) {
    // Sesión vencida o cerrada en otro lado: la app vuelve al inicio de sesión.
    if (respuesta.status === 401 && token) {
      window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA))
    }
    const mensaje =
      datos?.error ??
      (respuesta.status >= 500 ? 'El servidor tuvo un problema. Inténtalo de nuevo en un momento.' : `Error ${respuesta.status}`)
    throw new ErrorApi(respuesta.status, mensaje, datos?.detalles ?? [])
  }
  return datos as T
}

// Arma '?a=1&b=2' omitiendo los valores vacíos.
export function query(parametros: Record<string, string | undefined | null>): string {
  const busqueda = new URLSearchParams()
  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor) busqueda.set(clave, valor)
  }
  const texto = busqueda.toString()
  return texto ? `?${texto}` : ''
}
