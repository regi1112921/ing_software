import { Link } from 'react-router-dom'
import { CalendarHeart, Heart, LoaderCircle } from 'lucide-react'
import { api, type HistoriaPublica } from '@/api'
import FotoPerro from '@/componentes/FotoPerro'
import { BOTON_PRIMARIO, formatearFecha, useCarga } from '@/utilidades'

// HU-14 · Historias de adopciones exitosas, de la más reciente a la más antigua.
export default function HistoriasPage() {
  const historias = useCarga(() => api.listarHistorias())

  return (
    <>
      <section className="bg-forest-950 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-12">
          <h1 className="font-serif text-4xl sm:text-5xl mb-3">Historias con final feliz</h1>
          <p className="text-forest-100 max-w-2xl">
            Perros que salieron del albergue y hoy tienen una familia. Cada historia empezó con una solicitud como la
            tuya.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-6 pb-12">
        {historias.error && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm flex flex-wrap items-center gap-3 justify-between"
          >
            {historias.error}
            <button type="button" onClick={historias.recargar} className="font-bold underline">
              Reintentar
            </button>
          </div>
        )}
        {!historias.datos && !historias.error && (
          <p className="flex items-center justify-center gap-2 py-16 text-gray-500 bg-white rounded-2xl border border-warm-200">
            <LoaderCircle size={18} className="animate-spin" /> Cargando historias…
          </p>
        )}
        {historias.datos && historias.datos.total === 0 && (
          <div className="bg-white rounded-2xl border border-warm-200 py-16 px-6 text-center">
            <Heart size={36} className="mx-auto text-warm-300 mb-3" />
            <p className="font-bold text-gray-800">Pronto compartiremos las primeras historias</p>
            <p className="text-sm text-gray-500 mt-1">Mientras tanto, conoce a los perros que esperan un hogar.</p>
          </div>
        )}
        {historias.datos && historias.datos.total > 0 && (
          <ol className="space-y-6">
            {historias.datos.historias.map((historia) => (
              <li key={historia.id}>
                <TarjetaHistoria historia={historia} />
              </li>
            ))}
          </ol>
        )}

        {historias.datos && (
          <div className="mt-10 text-center">
            <p className="text-gray-600 mb-4">¿Quieres escribir la próxima historia?</p>
            <Link to="/" className={BOTON_PRIMARIO}>
              Ver perros en adopción
            </Link>
          </div>
        )}
      </div>
    </>
  )
}

function TarjetaHistoria({ historia }: { historia: HistoriaPublica }) {
  return (
    <article className="bg-white rounded-2xl border border-warm-200 shadow-sm overflow-hidden sm:flex">
      <FotoPerro
        url={historia.foto_url}
        nombre={historia.perro_nombre}
        className="w-full aspect-[4/3] sm:aspect-auto sm:w-72 sm:min-h-64 flex-shrink-0"
        tamanoIcono={40}
      />
      <div className="p-5 sm:p-6 flex flex-col min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-forest-600 mb-1">{historia.perro_nombre}</p>
        <h2 className="font-serif text-2xl text-gray-900 mb-3">{historia.titulo}</h2>
        <p className="text-gray-700 whitespace-pre-line leading-relaxed flex-1">{historia.relato}</p>
        <p className="mt-4 pt-4 border-t border-warm-100 text-xs text-gray-500 flex items-center gap-1.5">
          <CalendarHeart size={14} className="text-forest-600" />
          <span>
            Adoptado el {formatearFecha(historia.fecha_adopcion)} · Publicado el{' '}
            <time dateTime={historia.fecha_publicacion}>{formatearFecha(historia.fecha_publicacion)}</time>
          </span>
        </p>
      </div>
    </article>
  )
}
