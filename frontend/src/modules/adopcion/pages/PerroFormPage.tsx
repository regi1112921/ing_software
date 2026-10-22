import { useNavigate, useParams } from 'react-router-dom'
import { adopcionApi } from '@/api/adopcion.api'
import type { DatosPerro } from '@/api/tipos'
import { useCarga } from '@/shared/hooks/useCarga'
import Cargando from '@/shared/components/Cargando'
import Contenido from '@/shared/components/Contenido'
import EncabezadoPagina from '@/shared/components/EncabezadoPagina'
import MensajeError from '@/shared/components/MensajeError'
import FormularioPerro from '../components/FormularioPerro'

// /perros/nuevo (HU-04) y /perros/:id/editar (HU-05)
export default function PerroFormPage() {
  const { id } = useParams()
  const navegar = useNavigate()
  const esEdicion = Boolean(id)

  const { datos, error, recargar } = useCarga(
    () => Promise.all([adopcionApi.obtenerCatalogos(), id ? adopcionApi.obtenerPerro(id) : Promise.resolve(undefined)]),
    [id],
  )
  const [catalogos, perro] = datos ?? []
  const volverA = id ? `/perros/${id}` : '/perros'

  async function guardar(datosPerro: DatosPerro) {
    const guardado = id ? await adopcionApi.actualizarPerro(id, datosPerro) : await adopcionApi.crearPerro(datosPerro)
    navegar(`/perros/${guardado.id}`, {
      replace: true,
      state: { aviso: id ? 'Cambios guardados.' : `${guardado.nombre} quedó registrado en el albergue.` },
    })
  }

  return (
    <>
      <EncabezadoPagina
        titulo={esEdicion ? (perro ? `Editar a ${perro.nombre}` : 'Editar perro') : 'Registrar perro'}
        subtitulo={esEdicion ? 'Modifica la información del perro' : 'Completa los datos del nuevo ingreso'}
        volverA={volverA}
      />
      <Contenido>
        {error && <MensajeError mensaje={error} onReintentar={recargar} />}
        {!datos && !error && <Cargando />}
        {catalogos && (!esEdicion || perro) && (
          <FormularioPerro key={perro?.id ?? 'nuevo'} catalogos={catalogos} perro={perro} volverA={volverA} onGuardar={guardar} />
        )}
      </Contenido>
    </>
  )
}
