// src/components/Header.jsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ChangePasswordModal from './ChangePasswordModal';

export default function Header({
    // Opcionales para mostrar en el centro/izquierda
    titulo = null,
    subtitulo = null,
    logo = null,
    color = null,
    // Callback extra opcional si querés manejar logout aparte
    onLogout = null,
}) {
    const [usuario, setUsuario] = useState('');
    const [tipo, setTipo] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const [showChangePass, setShowChangePass] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        setUsuario(localStorage.getItem('usuario') || '');
        setTipo(localStorage.getItem('tipo') || '');
    }, []);

    // Cerrar el dropdown al hacer click afuera
    useEffect(() => {
        if (!menuOpen) return;
        const onDocClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        };
        const onKey = (e) => {
            if (e.key === 'Escape') setMenuOpen(false);
        };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [menuOpen]);

    const handleLogout = () => {
        setMenuOpen(false);
        if (typeof onLogout === 'function') onLogout();
        localStorage.clear();
        window.location.href = '/';
    };

    const initial = usuario ? usuario.charAt(0).toUpperCase() : '?';
    const homeHref = tipo === 'root' ? '/panel' : '/inicio';

    return (
        <>
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
                    {/* Izquierda: logo + título */}
                    <Link href={homeHref} className="flex items-center gap-3 min-w-0">
                        {logo && (
                            <Image
                                src={logo}
                                alt={titulo || 'Logo'}
                                width={40}
                                height={40}
                                className="rounded-full bg-white shrink-0"
                            />
                        )}
                        {!logo && (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold shrink-0">
                                🎭
                            </div>
                        )}
                        <div className="min-w-0">
                            {titulo && (
                                <h1
                                    className="font-bold text-gray-800 truncate text-sm sm:text-base"
                                    style={color ? { color } : undefined}
                                >
                                    {titulo}
                                </h1>
                            )}
                            {subtitulo && (
                                <p className="text-xs text-gray-500 truncate">{subtitulo}</p>
                            )}
                            {!titulo && !subtitulo && (
                                <p className="font-bold text-gray-800 text-sm sm:text-base">
                                    Carnavales Chajarí
                                </p>
                            )}
                        </div>
                    </Link>

                    {/* Derecha: menú de usuario */}
                    <div className="relative shrink-0" ref={menuRef}>
                        <button
                            onClick={() => setMenuOpen((s) => !s)}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-gray-100 transition active:scale-95"
                            aria-label="Menú de usuario"
                            aria-expanded={menuOpen}
                        >
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                {initial}
                            </div>
                            <span className="hidden sm:inline text-sm font-semibold text-gray-700 max-w-[100px] truncate">
                                {usuario}
                            </span>
                            <svg
                                className={`w-4 h-4 text-gray-500 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {/* Dropdown */}
                        {menuOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-dropdown z-50">
                                {/* Info usuario */}
                                <div className="px-4 py-3 bg-gradient-to-r from-pink-50 to-purple-50 border-b border-gray-100">
                                    <p className="text-xs text-gray-500">Sesión activa</p>
                                    <p className="font-bold text-gray-800 text-sm truncate">{usuario}</p>
                                    <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-pink-100 text-pink-700">
                                        {tipo === 'root' ? '👑 Admin' : '🎭 Comparsa'}
                                    </span>
                                </div>

                                {/* Opciones */}
                                <button
                                    onClick={() => {
                                        setMenuOpen(false);
                                        setShowChangePass(true);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition"
                                >
                                    <span className="text-lg">🔐</span>
                                    <div>
                                        <p className="font-semibold">Cambiar contraseña</p>
                                        <p className="text-xs text-gray-400">Actualizá tu clave de acceso</p>
                                    </div>
                                </button>

                                <div className="h-px bg-gray-100" />

                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition"
                                >
                                    <span className="text-lg">🚪</span>
                                    <div>
                                        <p className="font-semibold">Cerrar sesión</p>
                                        <p className="text-xs text-red-400">Salir de la cuenta</p>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Modal cambiar contraseña */}
            <ChangePasswordModal
                open={showChangePass}
                usuario={usuario}
                onClose={() => setShowChangePass(false)}
            />

            <style jsx>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        :global(.animate-dropdown) {
          animation: dropdownIn 0.15s ease-out;
          transform-origin: top right;
        }
      `}</style>
        </>
    );
}