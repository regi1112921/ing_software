import { useState, type FormEvent } from 'react'
import { ChevronDown, LoaderCircle } from 'lucide-react'
import { adopcionApi } from '@/api/adopcion.api'
import { ErrorApi } from '@/api/http'
import type { AdopcionSinHistoria, Historia } from '@/api/tipos'
import Campo from '@/shared/components/Campo'
import FotoPerro from '@/shared/components/FotoPerro'
import MensajeError from '@/shared/components/MensajeError'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CLASE_INPUT, CLASE_SELECT, CLASE_TEXTAREA } from '@/shared/utils/estilos'
import { formatearFecha, hoy } from '@/shared/utils/formato'

interface Props {
  // Al editar: la historia publicada. Al publicar: las adopciones finalizadas sin historia.
  historia?: Historia
  adopciones?: AdopcionSinHistoria[]
  onCancelar: () => void
  onGuardado: (historia: Historia) => void
}

const esUrl = (valor: string) => /^https?:\/\//i.test(valor)

// HU-14 · Publicar o editar la historia de una adopción exitosa.
export default function FormularioHistoria({ historia, adopciones = [], onCancelar, onGuardado }: Props) {
  const editando = !!historia
  const [solicitudId, setSolicitudId] = useState(historia ? String(historia.solicitud_id) : '')
  const [titulo, setTitulo] = useState(historia?.titulo ?? '')
  const [relato, setRelato] = useState(historia?.relato ?? '')
  const [fotoUrl, setFotoUrl] = useState(historia?.foto_url ?? '')
  const [fecha, setFecha] = useState(historia?.fecha_publicacion ?? hoy())
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const elegida = adopciones.find((a) => String(a.solicitud_id) === solicitudId)
  const fechaAdopcion = historia?.fecha_adopcion ?? elegida?.fecha_adopcion
  const nombrePerro = historia?.perro_nombre ?? elegida?.perro_nombre ?? 'El perro'

  const limpiarError = (campo: string) => setErrores(({ [campo]: _, ...resto }) => resto)

  // Al elegir la adopción se propone la foto del perro (se puede cambiar por una en su nuevo hogar).
  function elegirAdopcion(id: string) {
    setSolicitudId(id)
    limpiarError('solicitud_id')
    const adopcion = adopciones.find((a) => String(a.solicitud_id) === id)
    if (adopcion?.perro_foto_url && !fotoUrl.trim()) setFotoUrl(adopcion.perro_foto_url)
    if (adopcion && fecha < adopcion.fecha_adopcion) setFecha(hoy())
  }

  function validarLocal() {
    const nuevos: Record<string, string> = {}
    if (!editando && !solicitudId) nuevos.solicitud_id = 'Elige la adopción de la historia.'
    if (!titulo.trim()) nuevos.titulo = 'Escribe un título.'
    if (!relato.trim()) nuevos.relato = 'Cuenta la historia.'
    if (!fotoUrl.trim()) nuevos.foto_url = 'La foto es obligatoria.'
    else if (!esUrl(fotoUrl.trim())) nuevos.foto_url = 'La foto debe ser una URL que empiece por http:// o https://.'
    setErrores(nuevos)
    return Object.keys(nuevos).length === 0
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!validarLocal()) return
    setGuardando(true)
    setError(null)
    const datos = { titulo: titulo.trim(), relato: relato.trim(), foto_url: fotoUrl.trim(), fecha_publicacion: fecha }
    try {
      onGuardado(
        historia
          ? await adopcionApi.actualizarHistoria(historia.id, datos)
          : await adopcionApi.publicarHistoria({ ...datos, solicitud_id: Number(solicitudId) }),
      )
    } catch (err) {
      setError((err as Error).message)
      if (err instanceof ErrorApi) setErrores(err.porCampo)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar} noValidate className="space-y-4">
      {error && <MensajeError mensaje={error} />}

      {editando ? (
        <p className="text-sm text-gray-600">
          Adopción de <span className="font-semibold text-gray-900">{historia.perro_nombre}</span> por{' '}
          {historia.adoptante_nombre} · entregado el {formatearFecha(historia.fecha_adopcion)}
        </p>
      ) : (
        <Campo
          etiqueta="Adopción"
          obligatorio
          error={errores.solicitud_id}
          ayuda="Solo adopciones finalizadas (perro entregado) que aún no tienen historia."
        >
          <div className="relative">
            <select value={solicitudId} onChange={(e) => elegirAdopcion(e.target.value)} className={CLASE_SELECT}>
              <option value="">Elige una adopción…</option>
              {adopciones.map((a) => (
                <option key={a.solicitud_id} value={a.solicitud_id}>
                  {a.perro_nombre} · {a.adoptante_nombre} · entregado el {formatearFecha(a.fecha_adopcion)}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </Campo>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-4">
        <Campo etiqueta="Título" obligatorio error={errores.titulo}>
          <input
            value={titulo}
            maxLength={120}
            onChange={(e) => {
              setTitulo(e.target.value)
              limpiarError('titulo')
            }}
            className={CLASE_INPUT}
            placeholder={`${nombrePerro} encontró su hogar`}
          />
        </Campo>
        <Campo etiqueta="Fecha de publicación" obligatorio error={errores.fecha_publicacion}>
          <input
            type="date"
            required
            min={fechaAdopcion}
            max={hoy()}
            value={fecha}
            onChange={(e) => {
              setFecha(e.target.value)
              limpiarError('fecha_publicacion')
            }}
            className={CLASE_INPUT}
          />
        </Campo>
      </div>

      <Campo etiqueta="Relato" obligatorio error={errores.relato} ayuda={`${relato.length}/2000 caracteres`}>
        <textarea
          rows={5}
          maxLength={2000}
          value={relato}
          onChange={(e) => {
            setRelato(e.target.value)
            limpiarError('relato')
          }}
          className={CLASE_TEXTAREA}
          placeholder="¿Cómo llegó al albergue, cómo fue la adopción y cómo está hoy en su nuevo hogar?"
        />
      </Campo>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-start">
        <Campo
          etiqueta="Foto (URL)"
          obligatorio
          error={errores.foto_url}
          ayuda="De preferencia, una foto del perro en su nuevo hogar."
        >
          <input
            type="url"
            value={fotoUrl}
            maxLength={500}
            onChange={(e) => {
              setFotoUrl(e.target.value)
              limpiarError('foto_url')
            }}
            className={CLASE_INPUT}
            placeholder="https://…"
          />
        </Campo>
        <FotoPerro
          url={esUrl(fotoUrl.trim()) ? fotoUrl.trim() : null}
          nombre={`Vista previa de la foto de ${nombrePerro}`}
          className="size-24 rounded-xl sm:mt-7"
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pt-1">
        <button type="button" onClick={onCancelar} className={BOTON_SECUNDARIO}>
          Cancelar
        </button>
        <button type="submit" disabled={guardando} className={BOTON_PRIMARIO}>
          {guardando && <LoaderCircle size={16} className="animate-spin" />}
          {editando ? 'Guardar cambios' : 'Publicar historia'}
        </button>
      </div>
    </form>
  )
}
