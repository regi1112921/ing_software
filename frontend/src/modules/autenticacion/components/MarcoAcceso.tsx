import type { ReactNode } from 'react'
import Logo from '@/shared/components/Logo'

interface Props {
  titulo: string
  subtitulo: string
  children: ReactNode
}

// Diseño común de Iniciar sesión y Crear cuenta: panel con foto a la izquierda y formulario.
export default function MarcoAcceso({ titulo, subtitulo, children }: Props) {
  return (
    <div className="h-full flex">
      <section className="hidden lg:flex w-[45%] flex-col justify-between p-12 bg-forest-950 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1542715234-bd0adb4249b7?w=800&h=1000&fit=crop&auto=format"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div className="relative">
          <Logo />
        </div>
        <div className="relative">
          <p className="text-forest-400 text-xs uppercase tracking-widest font-semibold mb-4">Gestión del albergue</p>
          <h2 className="font-serif text-white text-4xl leading-snug mb-4">
            Cada perro merece
            <br />
            un hogar seguro.
          </h2>
          <p className="text-forest-300 text-sm leading-relaxed max-w-xs">
            Registro, seguimiento médico y adopciones. Todo el albergue en un solo lugar.
          </p>
        </div>
      </section>

      <section className="flex-1 flex items-center justify-center bg-warm-50 p-6 sm:p-8 overflow-y-auto">
        <div className="w-full max-w-sm py-6">
          <div className="lg:hidden mb-10">
            <Logo variante="oscuro" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{titulo}</h1>
          <p className="text-gray-500 text-sm mb-8">{subtitulo}</p>
          {children}
        </div>
      </section>
    </div>
  )
}
