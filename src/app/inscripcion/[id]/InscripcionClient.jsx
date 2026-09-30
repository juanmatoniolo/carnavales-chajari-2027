// src/app/inscripcion/[id]/InscripcionClient.jsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { COMPARSAS, COMPARSA_IDS } from '../../../lib/comparsas';
import FormInscripcion from '../../../components/FormInscripcion';

export default function InscripcionClient({ params }) {
    const comparsaId = String(params?.id || '').toLowerCase();
    const c = COMPARSAS[comparsaId] || null;

    // ---------- Comparsa no encontrada ----------
    if (!c) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
                <div className="text-center max-w-md">
                    <p className="text-6xl mb-3">🤷</p>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">
                        Comparsa no encontrada
                    </h1>
                    <p className="text-gray-500 text-sm mb-4">
                        Opciones válidas: {COMPARSA_IDS.join(', ')}.
                    </p>
                    <Link
                        href="/"
                        className="inline-block px-4 py-2 rounded-lg bg-pink-600 text-white font-semibold"
                    >
                        Volver al inicio
                    </Link>
                </div>
            </main>
        );
    }

    // ---------- Color de la comparsa ----------
    const color = c.color;

    return (
        <main className="min-h-screen bg-gray-50">
            {/* Hero con branding de la comparsa */}
            <section
                className="relative overflow-hidden"
                style={{
                    background: `linear-gradient(135deg, ${color} 0%, ${color}cc 60%, ${color}99 100%)`,
                }}
            >
                <div className="relative max-w-2xl mx-auto px-4 sm:px-6 pt-10 pb-16 sm:pt-14 sm:pb-20 text-center text-white">
                    {/* Logo */}
                    <div className="flex justify-center mb-4">
                        <div className="bg-white rounded-full p-3 shadow-2xl ring-4 ring-white/30">
                            <Image
                                src={c.logo}
                                alt={c.nombre}
                                width={90}
                                height={90}
                                priority
                                className="rounded-full"
                            />
                        </div>
                    </div>

                    {/* Nombre de la comparsa */}
                    <h1
                        className="text-3xl sm:text-4xl font-bold drop-shadow-sm"
                        style={{ fontFamily: 'var(--font-greatvibes), cursive' }}
                    >
                        {c.nombre}
                    </h1>

                    {/* Club */}
                    <p className="mt-1 text-sm sm:text-base text-white/90 font-medium">
                        {c.club}
                    </p>

                    {/* Mensaje */}
                    <p className="mt-4 text-sm sm:text-base text-white/80 max-w-md mx-auto">
                        Completá tus datos para inscribirte en los <b>Carnavales 2027</b>
                    </p>

                    {/* Badge */}
                    <div className="mt-5 inline-flex items-center gap-2 bg-white/15 backdrop-blur border border-white/30 rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold">
                        🎭 Inscripción oficial
                    </div>
                </div>

                {/* Curva decorativa inferior */}
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gray-50 rounded-t-[2rem]" />
            </section>

            {/* Formulario */}
            <div className="max-w-2xl mx-auto px-4 sm:px-6 -mt-4 relative z-10">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5 sm:p-7">
                    <div className="mb-5 pb-4 border-b border-gray-100">
                        <h2 className="text-xl font-bold text-gray-800">
                            📝 Datos del integrante
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Todos los campos con <span className="text-red-500">*</span> son
                            obligatorios.
                        </p>
                    </div>

                    <FormInscripcion comparsaId={comparsaId} comparsaData={c} />
                </div>

                {/* Footer */}
                <div className="text-center py-8 space-y-2">
                    <p className="text-xs text-gray-400">
                        © {new Date().getFullYear()} Carnavales Chajarí · {c.club}
                    </p>
                    <p className="text-[11px] text-gray-400">
                        Al inscribirte aceptás participar de las 4 noches del carnaval
                        representando a {c.nombre}.
                    </p>
                </div>
            </div>
        </main>
    );
}