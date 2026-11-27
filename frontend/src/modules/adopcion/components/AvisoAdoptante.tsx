import { useEffect, useState } from 'react'
import { CheckCircle2, LoaderCircle, MessageCircle, RotateCcw, Send, XCircle } from 'lucide-react'
import { adopcionApi } from '@/api/adopcion.api'
import type { Adopcion, AvisoAdoptante as Aviso, TipoAviso } from '@/api/tipos'
import { useCarga } from '@/shared/hooks/useCarga'
import Campo from '@/shared/components/Campo'
import Cargando from '@/shared/components/Cargando'
import MensajeError from '@/shared/components/MensajeError'
import { CLASE_TEXTAREA, TARJETA } from '@/shared/utils/estilos'

const BOTON_WHATSAPP =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold bg-[#1f9d55] hover:bg-[#188247] text-white disabled:opacity-60 disabled:cursor-not-allowed transition-colors'

const TIPOS: Record<TipoAviso, { nombre: string; icono: typeof CheckCircle2; clase: string }> = {
  aprobacion: { nombre: 'Aprobación', icono: CheckCircle2, clase: 'bg-forest-50 text-forest-700 border-forest-200' },
  rechazo: { nombre: 'Rechazo', icono: XCircle, clase: 'bg-red-50 text-red-700 border-red-200' },
}

// "+591 70012345" para mostrar el número al que se envía.
const mostrarTelefono = (telefono: string) => `+${telefono.slice(0, -8)} ${telefono.slice(-8)}`

const formatearMomento = (fecha: string) =>
  new Date(fecha).toLocaleString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

interface Props {
  adopcion: Adopcion
  onEnviado?: (aviso: string) => void
}

// HU-13 · Aviso al adoptante sobre su solicitud. Al aprobar o rechazar, el sistema
// prepara el mensaje; el responsable lo revisa, lo ajusta si hace falta y lo abre en
// WhatsApp. Cada envío queda registrado (quién, cuándo y el texto).
export default function AvisoAdoptante({ adopcion, onEnviado }: Props) {
  const conAviso = adopcion.estado === 'aprobada' || adopcion.estado === 'rechazada'
  const borrador = useCarga<Aviso | null>(
    () => (conAviso ? adopcionApi.borradorAviso(adopcion.id) : Promise.resolve(null)),
    [adopcion.id, adopcion.estado],
  )
  const historial = useCarga(
    () => (conAviso ? adopcionApi.listarAvisos(adopcion.id) : Promise.resolve({ total: 0, avisos: [] })),
    [adopcion.id, adopcion.estado],
  )
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generado = borrador.datos?.mensaje ?? ''
  useEffect(() => setMensaje(generado), [generado])

  if (!conAviso) return null

  const avisos = historial.datos?.avisos ?? []
  const editado = mensaje.trim() !== generado.trim()

  async function enviar() {
    if (!mensaje.trim()) {
      setError('El mensaje no puede quedar vacío.')
      return
    }
    // La pestaña se abre antes de esperar al servidor para que el navegador no la bloquee.
    const ventana = window.open('', '_blank')
    setEnviando(true)
    setError(null)
    try {
      const registrado = await adopcionApi.registrarAviso(adopcion.id, editado ? mensaje : undefined)
      if (ventana) {
        ventana.opener = null
        ventana.location.href = registrado.enlace_whatsapp
      } else {
        window.location.href = registrado.enlace_whatsapp
      }
      historial.recargar()
      onEnviado?.('Aviso registrado. Se abrió WhatsApp con el mensaje para el adoptante.')
    } catch (err) {
      ventana?.close()
      setError((err as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className={`${TARJETA} p-5 sm:p-6`} aria-labelledby="titulo-aviso">
      <h2 id="titulo-aviso" className="font-bold text-gray-800 mb-1 flex items-center gap-2">
        <MessageCircle size={15} className="text-forest-500" /> Aviso al adoptante
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        {adopcion.estado === 'aprobada'
          ? 'Avísale que su solicitud fue aprobada y cuáles son los siguientes pasos.'
          : 'Avísale que su solicitud no fue aprobada y el motivo.'}
        {avisos.length === 0 && historial.datos && ' Todavía no se le envió ningún aviso.'}
      </p>

      {borrador.error && <MensajeError mensaje={borrador.error} onReintentar={borrador.recargar} />}
      {borrador.cargando && !borrador.datos && <Cargando />}

      {borrador.datos && (
        <div className="space-y-4">
          {error && <MensajeError mensaje={error} />}
          <Campo
            etiqueta={`Mensaje para ${adopcion.adoptante.nombre_completo}`}
            ayuda={`Se enviará por WhatsApp al ${mostrarTelefono(borrador.datos.telefono)}. Puedes ajustar el texto antes de enviarlo.`}
          >
            <textarea
              rows={9}
              maxLength={2000}
              value={mensaje}
              onChange={(e) => {
                setMensaje(e.target.value)
                setError(null)
              }}
              className={CLASE_TEXTAREA}
            />
          </Campo>
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:items-center sm:justify-end">
            {editado && (
              <button
                type="button"
                onClick={() => setMensaje(generado)}
                className="inline-flex items-center justify-center gap-1.5 text-sm font-bold text-gray-500 hover:text-gray-700"
              >
                <RotateCcw size={14} /> Volver al mensaje sugerido
              </button>
            )}
            <button type="button" onClick={enviar} disabled={enviando} className={BOTON_WHATSAPP}>
              {enviando ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
              {avisos.length > 0 ? 'Volver a enviar por WhatsApp' : 'Enviar por WhatsApp'}
            </button>
          </div>
        </div>
      )}

      {historial.error && (
        <div className="mt-4">
          <MensajeError mensaje={historial.error} onReintentar={historial.recargar} />
        </div>
      )}
      {avisos.length > 0 && (
        <div className="mt-6 pt-5 border-t border-warm-100">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Avisos enviados ({avisos.length})</h3>
          <ol className="divide-y divide-warm-100">
            {avisos.map((aviso) => {
              const { nombre, icono: Icono, clase } = TIPOS[aviso.tipo]
              return (
                <li key={aviso.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold ${clase}`}>
                      <Icono size={11} /> {nombre}
                    </span>
                    <span className="text-sm text-gray-500">{formatearMomento(aviso.enviado_en)}</span>
                    <span className="text-xs text-gray-400">
                      por {aviso.enviado_por_nombre} · WhatsApp {mostrarTelefono(aviso.telefono)}
                    </span>
                  </div>
                  <details className="group">
                    <summary className="cursor-pointer text-xs font-bold text-forest-600 hover:text-forest-700 list-none">
                      <span className="group-open:hidden">Ver mensaje</span>
                      <span className="hidden group-open:inline">Ocultar mensaje</span>
                    </summary>
                    <p className="mt-2 text-sm text-gray-700 whitespace-pre-line rounded-lg bg-warm-50 px-3 py-2.5">{aviso.mensaje}</p>
                  </details>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </section>
  )
}
