import { useSearchParams } from 'react-router-dom'
import { LoaderCircle, PawPrint, RotateCcw } from 'lucide-react'
import { api, type Opcion } from '@/api'
import { useCarga } from '@/utilidades'
import TarjetaPerro from '@/componentes/TarjetaPerro'

const FILTROS = ['tamano', 'edad', 'sexo'] as const
type Filtro = (typeof FILTROS)[number]

const ETIQUETA: Record<Filtro, string> = { tamano: 'Tamaño', edad: 'Edad', sexo: 'Sexo' }

// HU-09 · Catálogo de perros disponibles con filtros por tamaño, edad y sexo.
// Los filtros viven en la URL (?tamano=&edad=&sexo=) para poder compartir la búsqueda.
export default function CatalogoPage() {
  const [parametros, setParametros] = useSearchParams()
  const valores = Object.fromEntries(FILTROS.map((f) => [f, parametros.get(f) ?? ''])) as Record<Filtro, string>

  const opciones = useCarga(() => api.filtros())
  const catalogo = useCarga(() => api.listarPerros(valores), [valores.tamano, valores.edad, valores.sexo])

  const listas: Record<Filtro, Opcion[]> = {
    tamano: opciones.datos?.tamanos ?? [],
    edad: opciones.datos?.edades ?? [],
    sexo: opciones.datos?.sexos ?? [],
  }
  const hayFiltros = FILTROS.some((f) => valores[f])

  function elegir(filtro: Filtro, codigo: string) {
    const siguiente = new URLSearchParams(parametros)
    if (!codigo || valores[filtro] === codigo) siguiente.delete(filtro)
    else siguiente.set(filtro, codigo)
    setParametros(siguiente, { replace: true })
  }

  return (
    <>
      <section className="bg-forest-950 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-12">
          <h1 className="font-serif text-4xl sm:text-5xl mb-3">Encuentra a tu nuevo compañero</h1>
          <p className="text-forest-100 max-w-2xl">
            Estos perros esperan un hogar. Filtra por tamaño, edad y sexo, conoce su historia y envía tu solicitud: el
            equipo del albergue te contactará.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 pb-12">
        <div className="bg-white rounded-2xl border border-warm-200 shadow-sm p-4 sm:p-5 mb-6 space-y-3">
          {FILTROS.map((filtro) => (
            <div key={filtro} role="group" aria-label={ETIQUETA[filtro]} className="flex flex-wrap items-center gap-2">
              <span className="w-16 text-sm font-bold text-gray-700">{ETIQUETA[filtro]}</span>
              <BotonFiltro activo={!valores[filtro]} onClick={() => elegir(filtro, '')}>
                Todos
              </BotonFiltro>
              {listas[filtro].map((opcion) => (
                <BotonFiltro key={opcion.codigo} activo={valores[filtro] === opcion.codigo} onClick={() => elegir(filtro, opcion.codigo)}>
                  {opcion.nombre}
                </BotonFiltro>
              ))}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 mb-4" aria-live="polite">
          <p className="text-sm text-gray-500">
            {catalogo.datos &&
              `${catalogo.datos.total} ${catalogo.datos.total === 1 ? 'perro disponible' : 'perros disponibles'}${hayFiltros ? ' con estos filtros' : ''}`}
          </p>
          {hayFiltros && (
            <button
              type="button"
              onClick={() => setParametros({}, { replace: true })}
              className="text-sm font-bold text-forest-600 hover:text-forest-700 inline-flex items-center gap-1"
            >
              <RotateCcw size={14} /> Quitar filtros
            </button>
          )}
        </div>

        {catalogo.error && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm flex flex-wrap items-center gap-3 justify-between">
            {catalogo.error}
            <button type="button" onClick={catalogo.recargar} className="font-bold underline">
              Reintentar
            </button>
          </div>
        )}
        {!catalogo.datos && !catalogo.error && (
          <p className="flex items-center justify-center gap-2 py-16 text-gray-500">
            <LoaderCircle size={18} className="animate-spin" /> Cargando perros…
          </p>
        )}
        {catalogo.datos && catalogo.datos.total === 0 && (
          <div className="bg-white rounded-2xl border border-warm-200 py-16 px-6 text-center">
            <PawPrint size={36} className="mx-auto text-warm-300 mb-3" />
            <p className="font-bold text-gray-800">No hay perros con estos filtros</p>
            <p className="text-sm text-gray-500 mt-1">Prueba con otra combinación o quita los filtros.</p>
          </div>
        )}
        {catalogo.datos && catalogo.datos.total > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {catalogo.datos.perros.map((perro) => (
              <TarjetaPerro key={perro.id} perro={perro} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function BotonFiltro({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
        activo ? 'bg-forest-600 border-forest-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  )
}
