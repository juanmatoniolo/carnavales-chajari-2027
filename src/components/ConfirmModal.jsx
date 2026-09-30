// src/components/ConfirmModal.jsx
'use client';

import { useEffect } from 'react';

export default function ConfirmModal({
    open,
    title = '¿Estás seguro?',
    message,
    confirmText = 'Eliminar',
    cancelText = 'Cancelar',
    variant = 'danger', // 'danger' | 'warning' | 'info'
    color = null,       // color de acento (por defecto usa el del variant)
    loading = false,
    onConfirm,
    onCancel,
}) {
    // Cerrar con tecla ESC
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === 'Escape' && !loading) onCancel?.();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, loading, onCancel]);

    // Bloquear scroll del body mientras está abierto
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    if (!open) return null;

    const variants = {
        danger: {
            accent: '#ef4444',
            icon: '🗑️',
            iconBg: 'bg-red-100',
            iconColor: 'text-red-600',
            btn: 'bg-red-500 hover:bg-red-600',
        },
        warning: {
            accent: '#f59e0b',
            icon: '⚠️',
            iconBg: 'bg-amber-100',
            iconColor: 'text-amber-600',
            btn: 'bg-amber-500 hover:bg-amber-600',
        },
        info: {
            accent: '#3b82f6',
            icon: 'ℹ️',
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-600',
            btn: 'bg-blue-500 hover:bg-blue-600',
        },
    };

    const v = variants[variant] || variants.danger;
    const accent = color || v.accent;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in"
            onClick={() => !loading && onCancel?.()}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up"
                onClick={(e) => e.stopPropagation()}
                style={{ borderTop: `6px solid ${accent}` }}
            >
                {/* Header con ícono */}
                <div className="pt-6 pb-4 px-6 text-center">
                    <div
                        className={`mx-auto w-16 h-16 rounded-full ${v.iconBg} flex items-center justify-center mb-4`}
                    >
                        <span className="text-3xl">{v.icon}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 leading-tight">
                        {title}
                    </h3>
                    {message && (
                        <div className="mt-2 text-sm text-gray-600 leading-relaxed">
                            {message}
                        </div>
                    )}
                </div>

                {/* Botones */}
                <div className="px-6 pb-6 flex gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 py-3 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition active:scale-[0.98]"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className={`flex-1 py-3 rounded-xl text-white text-sm font-bold shadow-md disabled:opacity-60 transition active:scale-[0.98] ${v.btn}`}
                    >
                        {loading ? 'Eliminando…' : confirmText}
                    </button>
                </div>
            </div>

            {/* Animaciones */}
            <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        :global(.animate-in) {
          animation: fadeIn 0.18s ease-out;
        }
        :global(.animate-slide-up) {
          animation: slideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
        </div>
    );
}