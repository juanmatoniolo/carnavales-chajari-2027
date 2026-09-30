// src/app/not-found.jsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo } from 'react';

export default function NotFound() {
    // Confeti generado una sola vez
    const confetti = useMemo(() => {
        const colores = ['#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ef4444', '#eab308'];
        const emojis = ['🎭', '🎉', '🎊', '✨', '🎵', '🎶', '💃', '🕺', '🌟', '🪶'];
        return Array.from({ length: 30 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 5,
            duration: 6 + Math.random() * 6,
            size: 14 + Math.random() * 18,
            rotation: Math.random() * 360,
            color: colores[Math.floor(Math.random() * colores.length)],
            emoji: emojis[Math.floor(Math.random() * emojis.length)],
            type: Math.random() > 0.5 ? 'emoji' : 'dot',
        }));
    }, []);

    // Animación del 404 flotando (leve movimiento)
    useEffect(() => {
        const el = document.getElementById('four-oh-four');
        if (!el) return;
        let t = 0;
        const id = setInterval(() => {
            t += 0.05;
            el.style.transform = `translateY(${Math.sin(t) * 6}px) rotate(${Math.sin(t) * 0.5}deg)`;
        }, 50);
        return () => clearInterval(id);
    }, []);

    return (
        <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-purple-900 via-pink-800 to-orange-700">
            {/* Fondo con textura de máscaras sutiles */}
            <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: `radial-gradient(circle at 20% 30%, #fbbf24 0%, transparent 40%),
                            radial-gradient(circle at 80% 70%, #ec4899 0%, transparent 45%),
                            radial-gradient(circle at 50% 100%, #8b5cf6 0%, transparent 40%)`,
                }}
                aria-hidden="true"
            />

            {/* Confeti animado */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
                {confetti.map((c) => (
                    <span
                        key={c.id}
                        className="absolute top-[-10%] animate-fall"
                        style={{
                            left: `${c.left}%`,
                            fontSize: c.type === 'emoji' ? `${c.size}px` : 0,
                            width: c.type === 'dot' ? `${c.size / 2}px` : 'auto',
                            height: c.type === 'dot' ? `${c.size / 2}px` : 'auto',
                            backgroundColor: c.type === 'dot' ? c.color : 'transparent',
                            borderRadius: c.type === 'dot' ? '50%' : 0,
                            animationDelay: `${c.delay}s`,
                            animationDuration: `${c.duration}s`,
                            transform: `rotate(${c.rotation}deg)`,
                            opacity: 0.9,
                        }}
                    >
                        {c.type === 'emoji' ? c.emoji : ''}
                    </span>
                ))}
            </div>

            {/* Contenido principal */}
            <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-10">
                <div className="w-full max-w-lg text-center">
                    {/* Logo */}
                    <div className="flex justify-center mb-4">
                        <div className="bg-white/95 rounded-full p-3 shadow-2xl ring-4 ring-white/40 animate-pulse-slow">
                            <Image
                                src="/logo.png"
                                alt="Carnavales Chajarí"
                                width={80}
                                height={80}
                                priority
                                className="rounded-full"
                            />
                        </div>
                    </div>

                    {/* Título 404 con estilo carnaval */}
                    <div id="four-oh-four" className="inline-block transition-transform">
                        <h1
                            className="text-[7rem] sm:text-[10rem] leading-none font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-400 to-cyan-300 drop-shadow-[0_4px_0_rgba(0,0,0,0.25)] select-none"
                            style={{ fontFamily: 'var(--font-greatvibes), cursive' }}
                        >
                            404
                        </h1>
                    </div>

                    {/* Subtítulo */}
                    <h2
                        className="text-3xl sm:text-4xl text-white drop-shadow-md -mt-2"
                        style={{ fontFamily: 'var(--font-greatvibes), cursive' }}
                    >
                        ¡Ups! Te perdiste en el desfile
                    </h2>

                    <p className="mt-4 text-white/85 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
                        La página que buscás <b>no existe</b> o se fue a bailar a otra comparsa.
                        Pero no te preocupes: el carnaval sigue y vos podés volver a la fiesta. 🎭
                    </p>

                    {/* Botones de acción */}
                    <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-purple-900 font-bold shadow-lg hover:shadow-xl hover:scale-[1.03] active:scale-95 transition"
                        >
                            🏠 Volver al inicio
                        </Link>
                        <Link
                            href="/inscripcion/fenix"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold shadow-lg hover:shadow-xl hover:scale-[1.03] active:scale-95 transition"
                        >
                            ✨ Inscribirme
                        </Link>
                    </div>

                    {/* Links a las comparsas */}
                    <div className="mt-10">
                        <p className="text-white/60 text-xs uppercase tracking-widest mb-3">
                            O elegí tu comparsa
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            <Link
                                href="/inscripcion/fenix"
                                className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 text-white text-xs font-semibold transition"
                            >
                                🟢 Fénix
                            </Link>
                            <Link
                                href="/inscripcion/sisiri"
                                className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 text-white text-xs font-semibold transition"
                            >
                                🔵 Sirirí
                            </Link>
                            <Link
                                href="/inscripcion/alumine"
                                className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 text-white text-xs font-semibold transition"
                            >
                                🟣 Aluminé
                            </Link>
                            <Link
                                href="/inscripcion/amaru"
                                className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 text-white text-xs font-semibold transition"
                            >
                                🟡 Amarú
                            </Link>
                        </div>
                    </div>

                    <p className="mt-10 text-white/50 text-[11px]">
                        © {new Date().getFullYear()} Carnavales Chajarí · Chajarí, Entre Ríos
                    </p>
                </div>
            </div>

            {/* Animaciones CSS */}
            <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0;
          }
        }
        :global(.animate-fall) {
          animation: fall linear infinite;
        }
        @keyframes pulseSlow {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
        :global(.animate-pulse-slow) {
          animation: pulseSlow 3s ease-in-out infinite;
        }
      `}</style>
        </main>
    );
}