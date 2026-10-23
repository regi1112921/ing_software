import type { ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { adopcionApi } from '@/api/adopcion.api'
import type { PerroDetalle } from '@/api/tipos'
import { useCarga } from '@/shared/hooks/useCarga'
import Cargando from '@/shared/components/Cargando'
import Contenido from '@/shared/components/Contenido'
import EncabezadoPagina from '@/shared/components/EncabezadoPagina'
import FotoPerro from '@/shared/components/FotoPerro'
import InsigniaEstado from '@/shared/components/InsigniaEstado'
import MensajeError from '@/shared/components/MensajeError'
import { BOTON_SECUNDARIO, TARJETA } from '@/shared/utils/estilos'
import { NOMBRE_SEXO, formatearEdad, formatearFecha } from '@/shared/utils/formato'
import PestanaAdopcion from '../components/PestanaAdopcion'

type Pestana = 'info' | 'historial' | 'adopcion'

const PESTANAS: { id: Pestana; etiqueta: string }[] = [
  { id: 'info', etiqueta: 'Información' },
  { id: 'historial', etiqueta: 'Historial médico' },
  { id: 'adopcion', etiqueta: 'Adopción' },
]

interface Props {
  // El historial médico pertenece al módulo de veterinaria: App.tsx lo inyecta
  // para que este módulo no importe archivos de otro módulo.
  pestanaHistorial: (perro: PerroDetalle) => ReactNode
}

// HU-07 · Ver detalle de un perro
export default function PerroDetallePage({ pestanaHistorial }: Props) {
  const { id } = useParams()
  const [parametros, setParametros] = useSearchParams()
  const pestana = (PESTANAS.some((p) => p.id === parametros.get('pestana')) ? parametros.get('pestana') : 'info') as Pestana
  const { datos: perro, error, recargar } = useCarga(() => adopcionApi.obtenerPerro(id!), [id])

  if (error && !perro) {
    return (
      <>
        <EncabezadoPagina titulo="Perro" volverA="/perros" />
        <Contenido>
          <MensajeError mensaje={error} onReintentar={recargar} />
        </Contenido>
      </>
    )
  }
  if (!perro) {
    return (
      <>
        <EncabezadoPagina titulo="Perro" volverA="/perros" />
        <Cargando />
      </>
    )
  }

  const edad = formatearEdad(perro.edad_meses, perro.fecha_nacimiento_estimada)
  const datosGenerales = [
    { etiqueta: 'Nombre', valor: perro.nombre },
    { etiqueta: 'Raza', valor: perro.raza },
    { etiqueta: 'Sexo', valor: NOMBRE_SEXO[perro.sexo] },
    { etiqueta: 'Edad', valor: edad },
    {
      etiqueta: perro.fecha_nacimiento_estimada ? 'Fecha de nacimiento (estimada)' : 'Fecha de nacimiento',
      valor: formatearFecha(perro.fecha_nacimiento),
    },
    { etiqueta: 'Color', valor: perro.color ?? '—' },
    { etiqueta: 'Tamaño', valor: perro.tamano_nombre },
    { etiqueta: 'Fecha de ingreso', valor: formatearFecha(perro.fecha_ingreso) },
    { etiqueta: 'Estado actual', valor: perro.estado_nombre },
  ]

  return (
    <>
      <EncabezadoPagina
        titulo={perro.nombre}
        insignia={<InsigniaEstado tipo="perro" estado={perro.estado} nombre={perro.estado_nombre} />}
        subtitulo={`${perro.raza} · ${NOMBRE_SEXO[perro.sexo]} · ${edad}`}
        volverA="/perros"
        acciones={
          <Link to={`/perros/${perro.id}/editar`} className={BOTON_SECUNDARIO}>
            <Pencil size={14} /> Editar
          </Link>
        }
      />
      <Contenido>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <aside className={`${TARJETA} overflow-hidden self-start`}>
            <FotoPerro url={perro.foto_url} nombre={perro.nombre} className="w-full h-56" tamanoIcono={40} />
            <dl className="p-4">
              {[
                { etiqueta: 'Color', valor: perro.color ?? '—' },
                { etiqueta: 'Tamaño', valor: perro.tamano_nombre },
                { etiqueta: 'Ingreso', valor: formatearFecha(perro.fecha_ingreso) },
              ].map((dato) => (
                <div key={dato.etiqueta} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                  <dt className="text-sm text-gray-500">{dato.etiqueta}</dt>
                  <dd className="text-sm font-bold text-gray-900">{dato.valor}</dd>
                </div>
              ))}
            </dl>
          </aside>

          <div className="lg:col-span-2 min-w-0">
            <div role="tablist" aria-label="Secciones de la ficha" className="flex gap-1 bg-warm-100 p-1 rounded-xl mb-5 w-full sm:w-fit overflow-x-auto">
              {PESTANAS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  id={`pestana-${p.id}`}
                  aria-selected={pestana === p.id}
                  aria-controls={`panel-${p.id}`}
                  onClick={() => setParametros(p.id === 'info' ? {} : { pestana: p.id }, { replace: true })}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                    pestana === p.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {p.etiqueta}
                </button>
              ))}
            </div>

            <div role="tabpanel" id={`panel-${pestana}`} aria-labelledby={`pestana-${pestana}`}>
              {pestana === 'info' && (
                <div className={`${TARJETA} p-5 sm:p-6`}>
                  <h3 className="font-bold text-gray-800 mb-5">Información general</h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    {datosGenerales.map((dato) => (
                      <div key={dato.etiqueta} className="pb-3 border-b border-gray-50">
                        <dt className="text-xs text-gray-400 mb-0.5">{dato.etiqueta}</dt>
                        <dd className="text-sm font-bold text-gray-900">{dato.valor}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
              {pestana === 'historial' && pestanaHistorial(perro)}
              {pestana === 'adopcion' && <PestanaAdopcion perro={perro} />}
            </div>
          </div>
        </div>
      </Contenido>
    </>
  )
}
