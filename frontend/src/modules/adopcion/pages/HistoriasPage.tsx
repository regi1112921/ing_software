import { useState } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { adopcionApi } from '@/api/adopcion.api'
import type { Historia } from '@/api/tipos'
import { useCarga } from '@/shared/hooks/useCarga'
import Cargando from '@/shared/components/Cargando'
import Contenido from '@/shared/components/Contenido'
import EncabezadoPagina from '@/shared/components/EncabezadoPagina'
import EstadoVacio from '@/shared/components/EstadoVacio'
import MensajeError from '@/shared/components/MensajeError'
import { BOTON_PRIMARIO, TARJETA } from '@/shared/utils/estilos'
import FormularioHistoria from '../components/FormularioHistoria'
import TarjetaHistoria from '../components/TarjetaHistoria'

// Qué muestra el formulario: nada, publicar una nueva o editar una existente.
type Edicion = { modo: 'cerrado' } | { modo: 'nueva' } | { modo: 'editar'; historia: Historia }

// HU-14 · Historias de adopciones exitosas. La administración las publica (foto y relato
// ligados a una adopción finalizada), las edita y las oculta sin borrarlas. Las visibles
// aparecen en el catálogo público, de la más reciente a la más antigua.
export default function HistoriasPage() {
  const historias = useCarga(() => adopcionApi.listarHistorias())
  const candidatas = useCarga(() => adopcionApi.listarAdopcionesSinHistoria())
  const [edicion, setEdicion] = useState<Edicion>({ modo: 'cerrado' })
  const [cambiando, setCambiando] = useState<number | null>(null)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)

  const lista = historias.datos?.historias ?? []
  const visibles = lista.filter((h) => h.visible).length
  const sinHistoria = candidatas.datos?.total ?? 0

  function alGuardar() {
    setEdicion({ modo: 'cerrado' })
    historias.recargar()
    candidatas.recargar()
  }

  async function cambiarVisible(historia: Historia) {
    setCambiando(historia.id)
    setErrorAccion(null)
    try {
      await adopcionApi.actualizarHistoria(historia.id, { visible: !historia.visible })
      historias.recargar()
    } catch (err) {
      setErrorAccion((err as Error).message)
    } finally {
      setCambiando(null)
    }
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Historias"
        subtitulo={
          historias.datos
            ? `${visibles} visibles en el catálogo · ${lista.length - visibles} ocultas`
            : 'Adopciones exitosas que se muestran en el catálogo público'
        }
        acciones={
          edicion.modo === 'cerrado' && (
            <button
              type="button"
              onClick={() => setEdicion({ modo: 'nueva' })}
              disabled={sinHistoria === 0}
              title={sinHistoria === 0 ? 'Todas las adopciones finalizadas ya tienen historia.' : undefined}
              className={BOTON_PRIMARIO}
            >
              <Plus size={16} /> Publicar historia
            </button>
          )
        }
      />
      <Contenido>
        <div className="max-w-5xl space-y-6">
          {edicion.modo !== 'cerrado' && (
            <section aria-labelledby="titulo-formulario" className={`${TARJETA} p-5 sm:p-6`}>
              <h2 id="titulo-formulario" className="font-bold text-gray-800 mb-4">
                {edicion.modo === 'nueva' ? 'Publicar una historia' : `Editar la historia de ${edicion.historia.perro_nombre}`}
              </h2>
              {edicion.modo === 'nueva' && candidatas.error && (
                <MensajeError mensaje={candidatas.error} onReintentar={candidatas.recargar} />
              )}
              <FormularioHistoria
                key={edicion.modo === 'editar' ? edicion.historia.id : 'nueva'}
                historia={edicion.modo === 'editar' ? edicion.historia : undefined}
                adopciones={candidatas.datos?.adopciones}
                onCancelar={() => setEdicion({ modo: 'cerrado' })}
                onGuardado={alGuardar}
              />
            </section>
          )}

          {errorAccion && <MensajeError mensaje={errorAccion} />}
          {historias.error && <MensajeError mensaje={historias.error} onReintentar={historias.recargar} />}
          {historias.cargando && !historias.datos && <Cargando />}
          {historias.datos && lista.length === 0 && (
            <div className={TARJETA}>
              <EstadoVacio
                icono={Sparkles}
                titulo="Todavía no hay historias"
                descripcion="Publica la historia de una adopción finalizada para animar a otras personas a adoptar."
              />
            </div>
          )}
          {lista.length > 0 && (
            <ul className="space-y-4">
              {lista.map((historia) => (
                <li key={historia.id}>
                  <TarjetaHistoria
                    historia={historia}
                    cambiando={cambiando === historia.id}
                    onEditar={() => setEdicion({ modo: 'editar', historia })}
                    onCambiarVisible={() => cambiarVisible(historia)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Contenido>
    </>
  )
}
