// src/components/ServiceWorkerRegister.jsx
'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!('serviceWorker' in navigator)) return;

        // En desarrollo no registramos para evitar cachés raras con Hot Reload
        if (process.env.NODE_ENV !== 'production') {
            // Descomentá si querés probarlo en dev:
            // navigator.serviceWorker.register('/sw.js').catch(() => {});
            return;
        }

        const onLoad = () => {
            navigator.serviceWorker.register('/sw.js').catch((err) => {
                console.warn('SW registration failed:', err);
            });
        };

        if (document.readyState === 'complete') {
            onLoad();
        } else {
            window.addEventListener('load', onLoad);
            return () => window.removeEventListener('load', onLoad);
        }
    }, []);

    return null;
}