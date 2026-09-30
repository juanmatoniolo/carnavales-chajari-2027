// src/app/inscripcion/[id]/page.jsx
import InscripcionClient from './InscripcionClient';
import { COMPARSAS, COMPARSA_IDS } from '../../../lib/comparsas';

const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// ----------------------------------------------------------
// Metadata dinámica por comparsa
// ----------------------------------------------------------
export async function generateMetadata({ params }) {
    const resolved = await params;
    const comparsaId = String(resolved?.id || '').toLowerCase();
    const c = COMPARSAS[comparsaId];

    if (!c) {
        return {
            title: 'Comparsa no encontrada | Carnavales Chajarí',
            description: 'La comparsa solicitada no existe.',
            robots: { index: false, follow: false },
        };
    }

    const titulo = `Inscribite a ${c.nombre} (${c.club}) | Carnavales 2027`;
    const descripcion = `Formulario de inscripción para la comparsa ${c.nombre} del club ${c.club}. Completá tus datos para participar de los Carnavales de Chajarí 2027.`;
    const imagen = `${SITE_URL}${c.logo}`;
    const url = `${SITE_URL}/inscripcion/${comparsaId}`;

    return {
        title: titulo,
        description: descripcion,
        alternates: { canonical: `/inscripcion/${comparsaId}` },
        openGraph: {
            type: 'website',
            url,
            siteName: 'Carnavales Chajarí',
            title: titulo,
            description: descripcion,
            locale: 'es_AR',
            images: [
                {
                    url: imagen,
                    width: 400,
                    height: 400,
                    alt: `Logo de ${c.nombre}`,
                    type: 'image/webp',
                },
            ],
        },
        twitter: {
            card: 'summary',
            title: titulo,
            description: descripcion,
            images: [imagen],
        },
        themeColor: c.color,
        robots: {
            index: false,
            follow: true,
            googleBot: {
                index: false,
                follow: true,
                'max-image-preview': 'large',
            },
        },
    };
}

// ----------------------------------------------------------
// Pre-renderizado de las 4 rutas en build
// ----------------------------------------------------------
export function generateStaticParams() {
    return COMPARSA_IDS.map((id) => ({ id }));
}

// ----------------------------------------------------------
// Página (Server Component — SIN 'use client')
// ----------------------------------------------------------
export default async function InscripcionPage({ params }) {
    const resolved = await params;
    return <InscripcionClient params={resolved} />;
}