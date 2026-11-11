import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, LoaderCircle, PawPrint } from 'lucide-react'
import { api } from '@/api'
import { NOMBRE_SEXO, formatearEdad, useCarga } from '@/utilidades'
import FotoPerro from '@/componentes/FotoPerro'
import FormularioSolicitud from '@/componentes/FormularioSolicitud'

// HU-09 · Ficha pública del perro: datos y formulario de solicitud de adopción.
export default function PerroPage() {
  const { id } = useParams()
  const { datos: perro, error, estadoHttp, recargar } = useCarga(() => api.obtenerPerro(id!), [id])

  const volver = (
    <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-forest-600 hover:text-forest-700 mb-5">
      <ArrowLeft size={16} /> Ver todos los perros
    </Link>
  )

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {volver}
        <div className="bg-white rounded-2xl border border-warm-200 py-16 px-6 text-center">
          <PawPrint size={36} className="mx-auto text-warm-300 mb-3" />
          {estadoHttp === 404 ? (
            <>
              <p className="font-bold text-gray-800">Este perro ya no está disponible</p>
              <p className="text-sm text-gray-500 mt-1">Puede que ya haya encontrado un hogar. ¡Conoce a los demás!</p>
            </>
          ) : (
            <>
              <p className="font-bold text-gray-800">{error}</p>
              <button type="button" onClick={recargar} className="mt-3 text-sm font-bold text-forest-600 underline">
                Reintentar
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  if (!perro) {
    return (
      <p className="flex items-center justify-center gap-2 py-24 text-gray-500">
        <LoaderCircle size={18} className="animate-spin" /> Cargando…
      </p>
    )
  }

  const datos = [
    { etiqueta: 'Raza', valor: perro.raza },
    { etiqueta: 'Sexo', valor: NOMBRE_SEXO[perro.sexo] },
    { etiqueta: 'Edad', valor: formatearEdad(perro.edad_meses, perro.fecha_nacimiento_estimada) },
    { etiqueta: 'Tamaño', valor: perro.tamano_nombre },
    { etiqueta: 'Color', valor: perro.color ?? '—' },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {volver}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div>
          <FotoPerro url={perro.foto_url} nombre={perro.nombre} className="w-full aspect-[4/3] rounded-2xl" tamanoIcono={56} />
          <h1 className="font-serif text-4xl text-gray-900 mt-5">{perro.nombre}</h1>
          <p className="text-gray-500 mb-5">
            {perro.raza} · {NOMBRE_SEXO[perro.sexo]} · {formatearEdad(perro.edad_meses, perro.fecha_nacimiento_estimada)}
          </p>
          <dl className="bg-white rounded-2xl border border-warm-200 divide-y divide-warm-100">
            {datos.map((dato) => (
              <div key={dato.etiqueta} className="flex justify-between gap-4 px-5 py-3">
                <dt className="text-sm text-gray-500">{dato.etiqueta}</dt>
                <dd className="text-sm font-bold text-gray-900 text-right">{dato.valor}</dd>
              </div>
            ))}
          </dl>
        </div>
        <FormularioSolicitud key={perro.id} perro={perro} />
      </div>
    </div>
  )
}
