// src/components/InstallPWA.jsx
'use client';

import { useEffect, useState } from 'react';

export default function InstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [visible, setVisible] = useState(false);
    const [installed, setInstalled] = useState(false);

    useEffect(() => {
        // Si ya está instalada (modo standalone), no mostramos el botón
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setInstalled(true);
            return;
        }

        const onBeforeInstall = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setVisible(true);
        };

        const onInstalled = () => {
            setVisible(false);
            setDeferredPrompt(null);
            setInstalled(true);
        };

        window.addEventListener('beforeinstallprompt', onBeforeInstall);
        window.addEventListener('appinstalled', onInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', onBeforeInstall);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setVisible(false);
        }
        setDeferredPrompt(null);
    };

    if (installed || !visible) return null;

    return (
        <button
            onClick={handleInstall}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur border border-white/30 text-white text-sm font-semibold transition active:scale-95"
        >
            📲 Instalar app
        </button>
    );
}