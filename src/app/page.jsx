// src/app/page.jsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { db } from '../firebase/firebase';
import { ref, get } from 'firebase/database';
import InstallPWA from '../components/InstallPWA';

export default function LoginPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const u = usuario.trim().toLowerCase();
    const p = password.trim();

    if (!u || !p) {
      setError('Completá usuario y contraseña.');
      return;
    }

    setLoading(true);
    try {
      const snap = await get(ref(db, `usuarios/${u}`));

      if (!snap.exists()) {
        setError('Usuario no encontrado.');
        return;
      }

      const data = snap.val();
      if (data.password !== p) {
        setError('Contraseña incorrecta.');
        return;
      }

      localStorage.setItem('usuario', u);
      localStorage.setItem('tipo', data.tipo || 'usuario');
      localStorage.setItem('comparsa', data.comparsa || u);
      if (data.nombre) localStorage.setItem('nombre', data.nombre);

      if (data.tipo === 'root') router.push('/panel');
      else router.push('/inicio');
    } catch (err) {
      console.error(err);
      setError('No se pudo conectar. Revisá tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 py-8 overflow-hidden">
      {/* Botón instalar PWA */}
      <div className="mt-4 flex justify-center">
        <InstallPWA />
      </div>
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/carnavaljpg.webp')" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <Image
            src="/logo.png"
            alt="Carnavales Chajarí"
            width={110}
            height={110}
            priority
            className="rounded-full bg-white/90 p-1 shadow-lg"
          />
          <h1
            className="mt-4 text-4xl sm:text-5xl text-white drop-shadow-lg"
            style={{ fontFamily: 'var(--font-greatvibes), cursive' }}
          >
            Carnavales 2027
          </h1>
          <p className="text-white/80 text-sm sm:text-base mt-1">
            Iniciá sesión para continuar
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6 sm:p-8 space-y-5"
        >
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Usuario</label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="ferro, velez, primero, sanclemente, root..."
              autoComplete="username"
              autoCapitalize="none"
              spellCheck="false"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Contraseña</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="absolute inset-y-0 right-3 flex items-center text-xl"
                aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-pink-600 hover:bg-pink-700 active:scale-[0.98] disabled:opacity-60 text-white font-bold text-lg shadow-lg transition"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>

          <p className="text-xs text-gray-500 text-center">
            ¿Olvidaste tu contraseña? Contactá al organizador.
          </p>
        </form>

        <p className="text-white/60 text-xs text-center mt-6">
          © {new Date().getFullYear()} Carnavales Chajarí
        </p>
      </div>
    </main>
  );
}