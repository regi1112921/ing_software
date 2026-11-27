import { useRef, useState, type ChangeEvent } from 'react'
import { LoaderCircle, Upload } from 'lucide-react'
import { adopcionApi, type CarpetaFoto } from '@/api/adopcion.api'
import { BOTON_SECUNDARIO } from '@/shared/utils/estilos'

const TIPOS = ['image/jpeg', 'image/png', 'image/webp']
const TAMANO_MAXIMO = 5 * 1024 * 1024

interface Props {
  carpeta: CarpetaFoto
  // Recibe la URL pública de la foto subida (se guarda como foto_url).
  onSubida: (url: string) => void
}

// Botón para subir una foto desde la PC o el celular a Supabase Storage.
// Revisa el tipo y el tamaño antes de enviarla; el backend lo vuelve a comprobar.
export default function SubirFoto({ carpeta, onSubida }: Props) {
  const entrada = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function elegir(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    e.target.value = '' // permite volver a elegir el mismo archivo
    if (!archivo) return
    setError(null)
    if (!TIPOS.includes(archivo.type)) {
      setError('La foto debe ser JPG, PNG o WebP.')
      return
    }
    if (archivo.size > TAMANO_MAXIMO) {
      setError('La foto no puede superar 5 MB.')
      return
    }
    setSubiendo(true)
    try {
      onSubida((await adopcionApi.subirFoto(archivo, carpeta)).url)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div>
      <input ref={entrada} type="file" accept={TIPOS.join(',')} onChange={elegir} className="sr-only" tabIndex={-1} aria-hidden="true" />
      <button type="button" onClick={() => entrada.current?.click()} disabled={subiendo} className={BOTON_SECUNDARIO}>
        {subiendo ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />}
        {subiendo ? 'Subiendo…' : 'Subir foto'}
      </button>
      {error ? (
        <p role="alert" className="text-xs text-red-600 mt-1.5">
          {error}
        </p>
      ) : (
        <p className="text-xs text-gray-400 mt-1.5">JPG, PNG o WebP, hasta 5 MB.</p>
      )}
    </div>
  )
}
