import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Filter, PawPrint, Plus, Search, X } from 'lucide-react'
import { adopcionApi } from '@/api/adopcion.api'
import type { EstadoPerro } from '@/api/tipos'
import { useCarga } from '@/shared/hooks/useCarga'
import Cargando from '@/shared/components/Cargando'
import Contenido from '@/shared/components/Contenido'
import EncabezadoPagina from '@/shared/components/EncabezadoPagina'
import EstadoVacio from '@/shared/components/EstadoVacio'
import MensajeError from '@/shared/components/MensajeError'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO } from '@/shared/utils/estilos'
import TarjetaPerro from '../components/TarjetaPerro'

const ESTADOS: { codigo: EstadoPerro; nombre: string }[] = [
  { codigo: 'disponible', nombre: 'Disponible' },
  { codigo: 'en_tratamiento', nombre: 'En tratamiento' },
  { codigo: 'en_adopcion', nombre: 'En proceso de adopción' },
  { codigo: 'adoptado', nombre: 'Adoptado' },
]

// HU-06 · Listar, buscar y filtrar perros. Los filtros viven en la URL
// (?buscar=&estado=) para poder compartirlos y conservarlos al volver.
export default function PerrosPage() {
  const [parametros, setParametros] = useSearchParams()
  const buscar = parametros.get('buscar') ?? ''
  const estado = (parametros.get('estado') ?? '') as EstadoPerro | ''
  const [texto, setTexto] = useState(buscar)

  // Si la URL cambia desde fuera (menú, atrás), el buscador la sigue.
  useEffect(() => {
    setTexto((actual) => (actual.trim() === buscar ? actual : buscar))
  }, [buscar])

  // Espera a que se deje de escribir antes de consultar.
  useEffect(() => {
    const temporizador = window.setTimeout(() => cambiarFiltro('buscar', texto.trim()), 300)
    return () => window.clearTimeout(temporizador)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto])

  function cambiarFiltro(clave: 'buscar' | 'estado', valor: string) {
    setParametros(
      (previos) => {
        const siguientes = new URLSearchParams(previos)
        if (valor) siguientes.set(clave, valor)
        else siguientes.delete(clave)
        return siguientes
      },
      { replace: true },
    )
  }

  function limpiarFiltros() {
    setTexto('')
    setParametros({}, { replace: true })
  }

  const { datos, error, cargando, recargar } = useCarga(() => adopcionApi.listarPerros({ buscar, estado }), [buscar, estado])
  const hayFiltros = Boolean(buscar || estado)
  const total = datos?.total ?? 0

  return (
    <>
      <EncabezadoPagina
        titulo="Perros"
        subtitulo={
          datos
            ? hayFiltros
              ? `${total} ${total === 1 ? 'resultado' : 'resultados'} con los filtros aplicados`
              : `${total} ${total === 1 ? 'perro registrado' : 'perros registrados'} en el albergue`
            : 'Perros registrados en el albergue'
        }
        acciones={
          <Link to="/perros/nuevo" className={BOTON_PRIMARIO}>
            <Plus size={15} /> Registrar perro
          </Link>
        }
      />
      <Contenido>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 sm:max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="search"
              aria-label="Buscar por nombre o raza"
              placeholder="Buscar por nombre o raza…"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
            />
          </div>
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              aria-label="Filtrar por estado"
              value={estado}
              onChange={(e) => cambiarFiltro('estado', e.target.value)}
              className="w-full sm:w-auto pl-8 pr-8 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-forest-500 appearance-none"
            >
              <option value="">Todos los estados</option>
              {ESTADOS.map((e) => (
                <option key={e.codigo} value={e.codigo}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </div>
          {hayFiltros && (
            <button type="button" onClick={limpiarFiltros} className={`${BOTON_SECUNDARIO} !py-2`}>
              <X size={14} /> Limpiar filtros
            </button>
          )}
        </div>

        {error && <MensajeError mensaje={error} onReintentar={recargar} />}
        {cargando && !datos && <Cargando />}
        {datos &&
          (datos.perros.length === 0 ? (
            hayFiltros ? (
              <EstadoVacio icono={PawPrint} titulo="No se encontraron perros" descripcion="Prueba con otra búsqueda o cambia el estado." />
            ) : (
              <EstadoVacio
                icono={PawPrint}
                titulo="Aún no hay perros registrados"
                descripcion="Registra el primer ingreso al albergue."
                accion={
                  <Link to="/perros/nuevo" className={BOTON_PRIMARIO}>
                    <Plus size={15} /> Registrar perro
                  </Link>
                }
              />
            )
          ) : (
            <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 transition-opacity ${cargando ? 'opacity-60' : ''}`}>
              {datos.perros.map((perro) => (
                <TarjetaPerro key={perro.id} perro={perro} />
              ))}
            </div>
          ))}
      </Contenido>
    </>
  )
}
