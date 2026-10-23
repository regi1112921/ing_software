import { Link } from 'react-router-dom'
import { PawPrint } from 'lucide-react'
import Contenido from './Contenido'
import EstadoVacio from './EstadoVacio'
import { BOTON_PRIMARIO } from '@/shared/utils/estilos'

export default function NoEncontradoPage() {
  return (
    <Contenido className="flex items-center justify-center">
      <EstadoVacio
        icono={PawPrint}
        titulo="Página no encontrada"
        descripcion="La dirección no existe o fue movida."
        accion={
          <Link to="/" className={BOTON_PRIMARIO}>
            Ir al inicio
          </Link>
        }
      />
    </Contenido>
  )
}
