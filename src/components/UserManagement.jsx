// src/components/UserManagement.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { db } from '../firebase/firebase';
import { ref, get, update, remove } from 'firebase/database';
import ConfirmModal from './ConfirmModal';
import { COMPARSAS, COMPARSA_IDS } from '../lib/comparsas';

const COMPARSAS_VALIDAS = ['root', ...COMPARSA_IDS];
const TIPOS_VALIDOS = ['root', 'usuario'];

export default function UserManagement() {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');
    const [showPass, setShowPass] = useState({});

    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState('');

    const [toDelete, setToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const [msg, setMsg] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const snap = await get(ref(db, 'usuarios'));
            if (snap.exists()) {
                const data = snap.val();
                const arr = Object.entries(data).map(([id, u]) => ({
                    id,
                    password: u.password || '',
                    comparsa: u.comparsa || '',
                    tipo: u.tipo || 'usuario',
                    createdAt: u.createdAt?.epoch || null,
                }));
                setUsuarios(arr);
            } else {
                setUsuarios([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const togglePass = (id) => {
        setShowPass((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const filtrados = useMemo(() => {
        const term = q.trim().toLowerCase();
        if (!term) return usuarios;
        return usuarios.filter(
            (u) =>
                u.id.toLowerCase().includes(term) ||
                u.comparsa.toLowerCase().includes(term) ||
                u.tipo.toLowerCase().includes(term)
        );
    }, [usuarios, q]);

    const openEdit = (u) => {
        setEditError('');
        setEditing({
            id: u.id,
            password: u.password,
            comparsa: u.comparsa,
            tipo: u.tipo,
        });
    };

    const saveEdit = async () => {
        setEditError('');
        if (!editing) return;
        if (!editing.password || editing.password.length < 6) {
            setEditError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (!COMPARSAS_VALIDAS.includes(editing.comparsa)) {
            setEditError('Comparsa inválida.');
            return;
        }
        if (!TIPOS_VALIDOS.includes(editing.tipo)) {
            setEditError('Tipo inválido.');
            return;
        }
        if (editing.tipo === 'root' && editing.comparsa !== 'root') {
            setEditError('Si el tipo es "root", la comparsa debe ser "root".');
            return;
        }
        if (editing.tipo === 'usuario' && editing.comparsa === 'root') {
            setEditError('Un usuario común no puede tener comparsa "root".');
            return;
        }

        setSaving(true);
        try {
            // 🔒 SIN updatedAt — no dejar marcas
            await update(ref(db, `usuarios/${editing.id}`), {
                password: editing.password,
                comparsa: editing.comparsa,
                tipo: editing.tipo,
            });

            setUsuarios((prev) =>
                prev.map((u) =>
                    u.id === editing.id
                        ? {
                            ...u,
                            password: editing.password,
                            comparsa: editing.comparsa,
                            tipo: editing.tipo,
                        }
                        : u
                )
            );
            setMsg(`✅ Usuario "${editing.id}" actualizado.`);
            setEditing(null);
            setTimeout(() => setMsg(''), 2500);
        } catch (err) {
            console.error(err);
            setEditError('No se pudo guardar.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (u) => {
        setDeleteError('');
        setToDelete(u);
    };

    const confirmDelete = async () => {
        if (!toDelete) return;
        setDeleting(true);
        setDeleteError('');
        try {
            await remove(ref(db, `usuarios/${toDelete.id}`));
            setUsuarios((prev) => prev.filter((u) => u.id !== toDelete.id));
            setMsg(`✅ Usuario "${toDelete.id}" eliminado.`);
            setToDelete(null);
            setTimeout(() => setMsg(''), 2500);
        } catch (err) {
            console.error(err);
            setDeleteError('No se pudo eliminar.');
        } finally {
            setDeleting(false);
        }
    };

    const roleBadge = (tipo) =>
        tipo === 'root'
            ? { label: '👑 Root', cls: 'bg-purple-100 text-purple-700' }
            : { label: '🎭 Comparsa', cls: 'bg-pink-100 text-pink-700' };

    return (
        <>
            {msg && (
                <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded-lg">
                    {msg}
                </div>
            )}

            <section className="bg-white rounded-xl shadow-sm p-4">
                <input
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar por usuario, comparsa o rol…"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-pink-500 outline-none text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">
                    Total: <b className="text-gray-800">{filtrados.length}</b> usuario
                    {filtrados.length !== 1 ? 's' : ''}
                </p>
            </section>

            <section className="bg-white rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <p className="p-6 text-gray-500">Cargando…</p>
                ) : filtrados.length === 0 ? (
                    <p className="p-6 text-gray-500">No hay usuarios.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-800 text-white">
                                <tr>
                                    <th className="text-left px-3 py-2">Usuario</th>
                                    <th className="text-left px-3 py-2">Contraseña</th>
                                    <th className="text-left px-3 py-2">Comparsa</th>
                                    <th className="text-left px-3 py-2">Rol</th>
                                    <th className="text-left px-3 py-2">Creado</th>
                                    <th className="px-3 py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtrados.map((u) => {
                                    const r = roleBadge(u.tipo);
                                    const visible = !!showPass[u.id];
                                    const dots = '•'.repeat(Math.min(u.password?.length || 8, 12));
                                    return (
                                        <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-3 py-2 whitespace-nowrap font-mono font-semibold text-gray-800">
                                                {u.id}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono text-gray-700">
                                                        {visible ? u.password : dots}
                                                    </code>
                                                    <button
                                                        onClick={() => togglePass(u.id)}
                                                        className="text-gray-500 hover:text-gray-800 text-base"
                                                        title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                                        aria-label={visible ? 'Ocultar' : 'Mostrar'}
                                                    >
                                                        {visible ? '🙈' : '👁️'}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                                                {u.comparsa || '—'}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <span
                                                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${r.cls}`}
                                                >
                                                    {r.label}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                                                {u.createdAt
                                                    ? new Date(u.createdAt).toLocaleDateString('es-AR')
                                                    : '—'}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-right space-x-2">
                                                <button
                                                    onClick={() => openEdit(u)}
                                                    className="text-blue-600 hover:text-blue-800 font-semibold text-xs"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(u)}
                                                    className="text-red-600 hover:text-red-800 font-semibold text-xs"
                                                >
                                                    Eliminar
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Modal edición */}
            {editing && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-1">
                            ✏️ Editar usuario
                        </h3>
                        <p className="text-xs text-gray-500 mb-4 font-mono">{editing.id}</p>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                    Contraseña
                                </label>
                                <input
                                    type="text"
                                    value={editing.password}
                                    onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono"
                                    placeholder="Mínimo 6 caracteres"
                                />
                                {editing.password && (
                                    <p
                                        className={`text-xs mt-1 ${editing.password.length < 6 ? 'text-red-500' : 'text-green-600'
                                            }`}
                                    >
                                        {editing.password.length < 6
                                            ? `Faltan ${6 - editing.password.length} caracteres`
                                            : '✓ Longitud válida'}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                    Comparsa
                                </label>
                                <select
                                    value={editing.comparsa}
                                    onChange={(e) => setEditing({ ...editing, comparsa: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white"
                                    disabled={editing.tipo === 'root'}
                                >
                                    <option value="">Seleccioná…</option>
                                    <option value="root">root</option>
                                    {COMPARSA_IDS.map((id) => (
                                        <option key={id} value={id}>
                                            {COMPARSAS[id].nombre} ({COMPARSAS[id].club})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                    Rol
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditing({ ...editing, tipo: 'usuario' })}
                                        className={`px-3 py-2 rounded-lg border-2 text-sm font-semibold transition ${editing.tipo === 'usuario'
                                            ? 'border-pink-500 bg-pink-50 text-pink-700'
                                            : 'border-gray-300 bg-white text-gray-700'
                                            }`}
                                    >
                                        🎭 Comparsa
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setEditing({ ...editing, tipo: 'root', comparsa: 'root' })
                                        }
                                        className={`px-3 py-2 rounded-lg border-2 text-sm font-semibold transition ${editing.tipo === 'root'
                                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                                            : 'border-gray-300 bg-white text-gray-700'
                                            }`}
                                    >
                                        👑 Root
                                    </button>
                                </div>
                            </div>

                            {editError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
                                    {editError}
                                </div>
                            )}

                            <p className="text-[11px] text-gray-400 pt-1">
                                ℹ️ Los cambios no quedan registrados con fecha de modificación.
                            </p>
                        </div>

                        <div className="flex justify-end gap-2 mt-5">
                            <button
                                onClick={() => setEditing(null)}
                                disabled={saving}
                                className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={saveEdit}
                                disabled={saving}
                                className="px-4 py-2 text-sm rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-semibold disabled:opacity-50"
                            >
                                {saving ? 'Guardando…' : 'Guardar cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal eliminar */}
            <ConfirmModal
                open={!!toDelete}
                title="Eliminar usuario"
                message={
                    toDelete ? (
                        <div className="text-center">
                            <p className="text-gray-600">
                                ¿Eliminar al usuario{' '}
                                <b className="font-mono text-gray-800">{toDelete.id}</b>?
                            </p>
                            <p className="mt-2 text-xs text-gray-500">
                                Rol:{' '}
                                <b>
                                    {toDelete.tipo === 'root' ? '👑 Root' : '🎭 Comparsa'}
                                </b>
                                {toDelete.comparsa && toDelete.comparsa !== 'root' && (
                                    <> · {toDelete.comparsa}</>
                                )}
                            </p>
                            <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg py-2 px-3">
                                ⚠️ Esta acción no se puede deshacer. El usuario perderá acceso al sistema.
                            </p>
                            {deleteError && (
                                <p className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
                                    {deleteError}
                                </p>
                            )}
                        </div>
                    ) : null
                }
                confirmText="Eliminar usuario"
                cancelText="Cancelar"
                variant="danger"
                loading={deleting}
                onConfirm={confirmDelete}
                onCancel={() => {
                    if (deleting) return;
                    setToDelete(null);
                    setDeleteError('');
                }}
            />
        </>
    );
}