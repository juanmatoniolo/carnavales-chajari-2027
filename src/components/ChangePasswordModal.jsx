// src/components/ChangePasswordModal.jsx
'use client';

import { useEffect, useState } from 'react';
import { db } from '../firebase/firebase';
import { ref, get, update } from 'firebase/database';

export default function ChangePasswordModal({ open, usuario, onClose }) {
    const [currentPass, setCurrentPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');

    useEffect(() => {
        if (!open) {
            setCurrentPass('');
            setNewPass('');
            setConfirmPass('');
            setError('');
            setMsg('');
            setShowCurrent(false);
            setShowNew(false);
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === 'Escape' && !saving) onClose?.();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, saving, onClose]);

    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    if (!open) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMsg('');

        if (!currentPass.trim() || !newPass.trim() || !confirmPass.trim()) {
            return setError('Completá todos los campos.');
        }
        if (newPass.length < 6) {
            return setError('La nueva contraseña debe tener al menos 6 caracteres.');
        }
        if (newPass === currentPass) {
            return setError('La nueva contraseña debe ser distinta a la actual.');
        }
        if (newPass !== confirmPass) {
            return setError('Las contraseñas nuevas no coinciden.');
        }

        setSaving(true);
        try {
            const snap = await get(ref(db, `usuarios/${usuario}`));
            if (!snap.exists()) {
                setError('Usuario no encontrado.');
                return;
            }
            const data = snap.val();
            if (data.password !== currentPass.trim()) {
                setError('La contraseña actual es incorrecta.');
                return;
            }

            await update(ref(db, `usuarios/${usuario}`), {
                password: newPass.trim(),
                passwordChangedAt: {
                    epoch: Date.now(),
                    iso: new Date().toISOString(),
                },
            });

            setMsg('✅ Contraseña actualizada correctamente.');
            setCurrentPass('');
            setNewPass('');
            setConfirmPass('');
            setTimeout(() => {
                onClose?.();
            }, 1400);
        } catch (err) {
            console.error(err);
            setError('No se pudo actualizar. Revisá la conexión.');
        } finally {
            setSaving(false);
        }
    };

    const inputCls =
        'w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-pink-500 outline-none text-base pr-12';
    const labelCls = 'block text-sm font-semibold text-gray-700 mb-1';

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in"
            onClick={() => !saving && onClose?.()}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-pink-50 to-purple-50">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🔐</span>
                        <div>
                            <h3 className="font-bold text-gray-800 text-base">Cambiar contraseña</h3>
                            <p className="text-xs text-gray-500">Usuario: {usuario}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="text-gray-400 hover:text-gray-700 text-2xl leading-none w-8 h-8 flex items-center justify-center disabled:opacity-50"
                        aria-label="Cerrar"
                    >
                        ×
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className={labelCls}>Contraseña actual</label>
                        <div className="relative">
                            <input
                                type={showCurrent ? 'text' : 'password'}
                                value={currentPass}
                                onChange={(e) => setCurrentPass(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="current-password"
                                className={inputCls}
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrent((s) => !s)}
                                className="absolute inset-y-0 right-3 flex items-center text-lg"
                                aria-label="Mostrar/ocultar"
                            >
                                {showCurrent ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>Nueva contraseña</label>
                        <div className="relative">
                            <input
                                type={showNew ? 'text' : 'password'}
                                value={newPass}
                                onChange={(e) => setNewPass(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                autoComplete="new-password"
                                className={inputCls}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew((s) => !s)}
                                className="absolute inset-y-0 right-3 flex items-center text-lg"
                                aria-label="Mostrar/ocultar"
                            >
                                {showNew ? '🙈' : '👁️'}
                            </button>
                        </div>
                        {newPass && (
                            <p
                                className={`text-xs mt-1 ${newPass.length < 6 ? 'text-red-500' : 'text-green-600'
                                    }`}
                            >
                                {newPass.length < 6
                                    ? `Faltan ${6 - newPass.length} caracteres`
                                    : '✓ Longitud válida'}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className={labelCls}>Repetir nueva contraseña</label>
                        <input
                            type={showNew ? 'text' : 'password'}
                            value={confirmPass}
                            onChange={(e) => setConfirmPass(e.target.value)}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-pink-500 outline-none text-base"
                        />
                        {confirmPass && newPass && (
                            <p
                                className={`text-xs mt-1 ${newPass === confirmPass ? 'text-green-600' : 'text-red-500'
                                    }`}
                            >
                                {newPass === confirmPass ? '✓ Coinciden' : '✕ No coinciden'}
                            </p>
                        )}
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                            {error}
                        </div>
                    )}
                    {msg && (
                        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded-lg">
                            {msg}
                        </div>
                    )}

                    <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="px-4 py-3 rounded-lg border border-gray-300 text-sm font-semibold hover:bg-gray-100 disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !!msg}
                            className="flex-1 py-3 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-bold shadow-lg disabled:opacity-60 transition active:scale-[0.98]"
                        >
                            {saving ? 'Actualizando…' : 'Actualizar contraseña'}
                        </button>
                    </div>
                </form>
            </div>

            <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        :global(.animate-in) { animation: fadeIn 0.18s ease-out; }
        :global(.animate-slide-up) {
          animation: slideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
        </div>
    );
}