// src/components/ProtectedRoute.jsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProtectedRoute({ children, requireTipo = null }) {
    const router = useRouter();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const u = localStorage.getItem('usuario');
        const tipo = localStorage.getItem('tipo');

        if (!u) {
            router.replace('/');
            return;
        }

        if (requireTipo && tipo !== requireTipo) {
            if (tipo === 'root') router.replace('/panel');
            else router.replace('/inicio');
            return;
        }

        setReady(true);
    }, [router, requireTipo]);

    if (!ready) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Verificando sesión...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}