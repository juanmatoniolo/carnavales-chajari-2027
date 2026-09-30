// src/app/panel/page.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import ProtectedRoute from '../../components/ProtectedRoute';
import Header from '../../components/Header';
import ConfirmModal from '../../components/ConfirmModal';
import UserManagement from '../../components/UserManagement';
import { db } from '../../firebase/firebase';
import { ref, get, remove, update } from 'firebase/database';
import { COMPARSAS, COMPARSA_IDS } from '../../lib/comparsas';
import { calcEdad, formatYMD, formatEpoch } from '../../lib/dates';

function labelTipo(tipo) {
    if (tipo === 'passista') return { emoji: '💃', label: 'Passista', color: '#ec4899' };
    if (tipo === 'ritmista') return { emoji: '🥁', label: 'Ritmista', color: '#f59e0b' };
    return { emoji: '—', label: 'Sin tipo', color: '#9ca3af' };
}

export default function PanelRootPage() {
    const [tab, setTab] = useState('inscriptos'); // 'inscriptos' | 'usuarios'

    const [bailarines, setBailarines] = useState([]);
    const [loading, setLoading] = useState(true);

    const [q, setQ] = useState('');
    const [fComparsa, setFComparsa] = useState('todas');
    const [fEdadMin, setFEdadMin] = useState('');
    const [fEdadMax, setFEdadMax] = useState('');
    const [fTipo, setFTipo] = useState('todos');

    const [toDelete, setToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const [selected, setSelected] = useState(new Set());
    const [showBulkDelete, setShowBulkDelete] = useState(false);
    const [bulkDeleting, setBulkDeleting] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const snap = await get(ref(db, 'bailarines'));
            if (snap.exists()) {
                const data = snap.val();
                const arr = [];
                Object.entries(data).forEach(([comparsa, regs]) => {
                    Object.entries(regs).forEach(([id, b]) => {
                        arr.push({
                            id,
                            comparsa,
                            apellido: b.apellido || '',
                            nombre: b.nombre || '',
                            nombreCompleto:
                                b.nombreCompleto || `${b.apellido || ''} ${b.nombre || ''}`.trim(),
                            dni: b.dni || '',
                            fechaNacimiento: b.fechaNacimiento || '',
                            tipo: b.tipo || '',
                            telefono: b.telefono || '',
                            instagram: b.instagram || '',
                            esMenor: b.esMenor || false,
                            tutor: b.tutor || null,
                            edad: calcEdad(b.fechaNacimiento),
                            createdAt: b.createdAt?.epoch || null,
                            updatedAt: b.updatedAt?.epoch || null,
                        });
                    });
                });
                setBailarines(arr);
            } else {
                setBailarines([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (tab === 'inscriptos') load();
    }, [tab]);

    const counts = useMemo(() => {
        const c = {};
        COMPARSA_IDS.forEach((id) => {
            c[id] = { total: 0, passistas: 0, ritmistas: 0 };
        });
        bailarines.forEach((b) => {
            if (!c[b.comparsa]) c[b.comparsa] = { total: 0, passistas: 0, ritmistas: 0 };
            c[b.comparsa].total++;
            if (b.tipo === 'passista') c[b.comparsa].passistas++;
            if (b.tipo === 'ritmista') c[b.comparsa].ritmistas++;
        });
        return c;
    }, [bailarines]);

    const totales = useMemo(() => {
        const total = bailarines.length;
        const passistas = bailarines.filter((b) => b.tipo === 'passista').length;
        const ritmistas = bailarines.filter((b) => b.tipo === 'ritmista').length;
        return { total, passistas, ritmistas };
    }, [bailarines]);

    const filtrados = useMemo(() => {
        const term = q.trim().toLowerCase();
        const min = fEdadMin === '' ? null : Number(fEdadMin);
        const max = fEdadMax === '' ? null : Number(fEdadMax);
        return bailarines
            .filter((b) => {
                if (fComparsa !== 'todas' && b.comparsa !== fComparsa) return false;
                const full = (b.nombreCompleto || '').toLowerCase();
                if (term && !full.includes(term) && !b.dni.includes(term)) return false;
                if (min !== null && (b.edad === null || b.edad < min)) return false;
                if (max !== null && (b.edad === null || b.edad > max)) return false;
                if (fTipo !== 'todos' && b.tipo !== fTipo) return false;
                return true;
            })
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }, [bailarines, q, fComparsa, fEdadMin, fEdadMax, fTipo]);

    const rowKey = (b) => `${b.comparsa}-${b.id}`;

    const toggleSelect = (b) => {
        const k = rowKey(b);
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(k)) next.delete(k);
            else next.add(k);
            return next;
        });
    };

    const allVisibleSelected =
        filtrados.length > 0 && filtrados.every((b) => selected.has(rowKey(b)));

    const toggleAllVisible = () => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (allVisibleSelected) {
                filtrados.forEach((b) => next.delete(rowKey(b)));
            } else {
                filtrados.forEach((b) => next.add(rowKey(b)));
            }
            return next;
        });
    };

    const clearSelection = () => setSelected(new Set());

    const handleDelete = (b) => {
        setDeleteError('');
        setToDelete(b);
    };

    const confirmDelete = async () => {
        if (!toDelete) return;
        setDeleting(true);
        setDeleteError('');
        try {
            await remove(ref(db, `bailarines/${toDelete.comparsa}/${toDelete.id}`));
            setBailarines((prev) =>
                prev.filter((x) => !(x.id === toDelete.id && x.comparsa === toDelete.comparsa))
            );
            setSelected((prev) => {
                const next = new Set(prev);
                next.delete(`${toDelete.comparsa}-${toDelete.id}`);
                return next;
            });
            setToDelete(null);
        } catch (err) {
            console.error(err);
            setDeleteError('No se pudo eliminar. Revisá la conexión.');
        } finally {
            setDeleting(false);
        }
    };

    const confirmBulkDelete = async () => {
        setBulkDeleting(true);
        setDeleteError('');
        try {
            const updates = {};
            bailarines.forEach((b) => {
                if (selected.has(rowKey(b))) {
                    updates[`bailarines/${b.comparsa}/${b.id}`] = null;
                }
            });
            await update(ref(db), updates);
            setBailarines((prev) => prev.filter((b) => !selected.has(rowKey(b))));
            setSelected(new Set());
            setShowBulkDelete(false);
        } catch (err) {
            console.error(err);
            setDeleteError('No se pudieron eliminar. Revisá la conexión.');
        } finally {
            setBulkDeleting(false);
        }
    };

    // 🔒 Excel del panel root: SIN teléfono
    const exportExcel = async () => {
        const XLSX = await import('xlsx');
        const rows = filtrados.map((b) => ({
            Comparsa: COMPARSAS[b.comparsa]?.nombre || b.comparsa,
            Club: COMPARSAS[b.comparsa]?.club || '',
            Apellido: b.apellido,
            Nombre: b.nombre,
            DNI: b.dni,
            'Fecha Nac.': formatYMD(b.fechaNacimiento),
            Edad: b.edad ?? '',
            Tipo: labelTipo(b.tipo).label,
            Menor: b.esMenor ? 'Sí' : 'No',
            Cargado: formatEpoch(b.createdAt),
            Modificado: b.updatedAt ? formatEpoch(b.updatedAt) : '',
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Bailarines');
        XLSX.writeFile(wb, `bailarines_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const limpiarFiltros = () => {
        setQ('');
        setFComparsa('todas');
        setFEdadMin('');
        setFEdadMax('');
        setFTipo('todos');
    };

    const hasSelection = selected.size > 0;

    return (
        <ProtectedRoute requireTipo="root">
            <main className={`min-h-screen bg-gray-50 ${hasSelection ? 'pb-28' : 'pb-10'}`}>
                <Header titulo="Panel Root" subtitulo="Administración general" />

                {/* Tabs */}
                <div className="bg-white border-b border-gray-200 sticky top-[65px] z-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6">
                        <div className="flex gap-1 -mb-px overflow-x-auto">
                            <button
                                onClick={() => setTab('inscriptos')}
                                className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition whitespace-nowrap ${tab === 'inscriptos'
                                    ? 'border-pink-600 text-pink-700'
                                    : 'border-transparent text-gray-500 hover:text-gray-800'
                                    }`}
                            >
                                🎭 Inscriptos
                                <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                                    {bailarines.length}
                                </span>
                            </button>
                            <button
                                onClick={() => setTab('usuarios')}
                                className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition whitespace-nowrap ${tab === 'usuarios'
                                    ? 'border-purple-600 text-purple-700'
                                    : 'border-transparent text-gray-500 hover:text-gray-800'
                                    }`}
                            >
                                👥 Usuarios
                            </button>
                        </div>
                    </div>
                </div>

                {/* ============ TAB INSCRIPTOS ============ */}
                {tab === 'inscriptos' && (
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
                        <section className="grid grid-cols-3 gap-3">
                            <div className="bg-white rounded-xl shadow-sm p-4">
                                <p className="text-xs text-gray-500">Total general</p>
                                <p className="text-3xl font-bold text-gray-800">{totales.total}</p>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm p-4">
                                <p className="text-xs text-gray-500">💃 Passistas</p>
                                <p className="text-3xl font-bold text-pink-600">{totales.passistas}</p>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm p-4">
                                <p className="text-xs text-gray-500">🥁 Ritmistas</p>
                                <p className="text-3xl font-bold text-amber-600">{totales.ritmistas}</p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-gray-700 mb-3">
                                Inscriptos por comparsa
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                {COMPARSA_IDS.map((id) => {
                                    const comp = COMPARSAS[id];
                                    const cc = counts[id] || { total: 0, passistas: 0, ritmistas: 0 };
                                    return (
                                        <button
                                            key={id}
                                            onClick={() => setFComparsa(fComparsa === id ? 'todas' : id)}
                                            className={`text-left bg-white rounded-xl shadow-sm p-4 border-l-4 transition hover:shadow-md ${fComparsa === id ? 'ring-2 ring-pink-500' : ''
                                                }`}
                                            style={{ borderLeftColor: comp.color }}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <Image
                                                    src={comp.logo}
                                                    alt={comp.nombre}
                                                    width={28}
                                                    height={28}
                                                    className="rounded-full bg-white"
                                                />
                                                <p className="font-bold text-gray-800 text-sm">{comp.nombre}</p>
                                            </div>
                                            <p className="text-3xl font-bold" style={{ color: comp.color }}>
                                                {cc.total}
                                            </p>
                                            <div className="flex gap-2 mt-2 text-xs">
                                                <span className="text-pink-600 font-semibold">💃 {cc.passistas}</span>
                                                <span className="text-amber-600 font-semibold">🥁 {cc.ritmistas}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">{comp.club}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        <section className="bg-white rounded-xl shadow-sm p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                                <input
                                    type="text"
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Buscar por nombre o DNI…"
                                    className="lg:col-span-2 px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-pink-500 outline-none text-sm"
                                />
                                <select
                                    value={fComparsa}
                                    onChange={(e) => setFComparsa(e.target.value)}
                                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white"
                                >
                                    <option value="todas">Todas las comparsas</option>
                                    {COMPARSA_IDS.map((id) => (
                                        <option key={id} value={id}>
                                            {COMPARSAS[id].nombre} ({COMPARSAS[id].club})
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={fTipo}
                                    onChange={(e) => setFTipo(e.target.value)}
                                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white"
                                >
                                    <option value="todos">Todos los tipos</option>
                                    <option value="passista">💃 Passistas</option>
                                    <option value="ritmista">🥁 Ritmistas</option>
                                </select>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="number"
                                        value={fEdadMin}
                                        onChange={(e) => setFEdadMin(e.target.value)}
                                        placeholder="Edad mín."
                                        min="0"
                                        className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
                                    />
                                    <input
                                        type="number"
                                        value={fEdadMax}
                                        onChange={(e) => setFEdadMax(e.target.value)}
                                        placeholder="Edad máx."
                                        min="0"
                                        className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                                <span className="text-sm text-gray-500">
                                    Resultados: <b className="text-gray-800">{filtrados.length}</b>
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={limpiarFiltros}
                                        className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-100"
                                    >
                                        Limpiar filtros
                                    </button>
                                    <button
                                        onClick={exportExcel}
                                        disabled={filtrados.length === 0}
                                        className="px-4 py-2 text-sm rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold"
                                    >
                                        📥 Excel
                                    </button>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white rounded-xl shadow-sm overflow-hidden">
                            {loading ? (
                                <p className="p-6 text-gray-500">Cargando…</p>
                            ) : filtrados.length === 0 ? (
                                <p className="p-6 text-gray-500">No hay resultados.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-800 text-white">
                                            <tr>
                                                <th className="w-10 px-3 py-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={allVisibleSelected}
                                                        onChange={toggleAllVisible}
                                                        className="w-4 h-4 accent-pink-500 cursor-pointer"
                                                        title="Seleccionar todo"
                                                    />
                                                </th>
                                                <th className="text-left px-3 py-2">Comparsa</th>
                                                <th className="text-left px-3 py-2">Nombre</th>
                                                <th className="text-left px-3 py-2">DNI</th>
                                                <th className="text-left px-3 py-2">Nacimiento</th>
                                                <th className="text-left px-3 py-2">Edad</th>
                                                <th className="text-left px-3 py-2">Tipo</th>
                                                <th className="text-left px-3 py-2">Creado</th>
                                                <th className="text-left px-3 py-2">Modificado</th>
                                                <th className="px-3 py-2"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filtrados.map((b) => {
                                                const comp = COMPARSAS[b.comparsa];
                                                const t = labelTipo(b.tipo);
                                                const k = rowKey(b);
                                                const isSelected = selected.has(k);
                                                return (
                                                    <tr
                                                        key={k}
                                                        className={`border-b border-gray-100 ${isSelected ? 'bg-pink-50' : 'hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        <td className="px-3 py-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleSelect(b)}
                                                                className="w-4 h-4 accent-pink-500 cursor-pointer"
                                                            />
                                                        </td>
                                                        <td
                                                            className="px-3 py-2 whitespace-nowrap"
                                                            style={{ color: comp?.color, fontWeight: 600 }}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                {comp && (
                                                                    <Image
                                                                        src={comp.logo}
                                                                        alt={comp.nombre}
                                                                        width={20}
                                                                        height={20}
                                                                        className="rounded-full"
                                                                    />
                                                                )}
                                                                <span className="text-xs sm:text-sm">
                                                                    {comp?.nombre || b.comparsa}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2 whitespace-nowrap">
                                                            <div className="flex items-center gap-1">
                                                                {b.esMenor && (
                                                                    <span title="Menor" className="text-amber-500">👶</span>
                                                                )}
                                                                {b.nombreCompleto}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2 whitespace-nowrap">{b.dni}</td>
                                                        <td className="px-3 py-2 whitespace-nowrap">
                                                            {formatYMD(b.fechaNacimiento)}
                                                        </td>
                                                        <td className="px-3 py-2 whitespace-nowrap">{b.edad ?? '-'}</td>
                                                        <td className="px-3 py-2 whitespace-nowrap">
                                                            <span
                                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                                                                style={{
                                                                    backgroundColor: `${t.color}15`,
                                                                    color: t.color,
                                                                }}
                                                            >
                                                                {t.emoji} {t.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-gray-500 text-xs">
                                                            {formatEpoch(b.createdAt)}
                                                        </td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-xs">
                                                            {b.updatedAt ? (
                                                                <span className="text-amber-600">
                                                                    ✏️ {formatEpoch(b.updatedAt)}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-400">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-right">
                                                            <button
                                                                onClick={() => handleDelete(b)}
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
                    </div>
                )}

                {/* ============ TAB USUARIOS ============ */}
                {tab === 'usuarios' && (
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
                        <section className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-xl p-4">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                👥 Gestión de usuarios
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                Administrá las cuentas de acceso de las comparsas y de otros administradores.
                                Podés ver contraseñas, editarlas, cambiar roles o eliminar usuarios.
                            </p>
                        </section>

                        <UserManagement />
                    </div>
                )}

                {/* Barra bulk — solo en tab inscriptos */}
                {tab === 'inscriptos' && hasSelection && (
                    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-2xl">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-9 h-9 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-sm shrink-0">
                                    {selected.size}
                                </div>
                                <span className="text-sm font-semibold text-gray-700 truncate">
                                    {selected.size === 1 ? '1 seleccionado' : `${selected.size} seleccionados`}
                                </span>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <button
                                    onClick={clearSelection}
                                    disabled={bulkDeleting}
                                    className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => setShowBulkDelete(true)}
                                    disabled={bulkDeleting}
                                    className="px-4 py-2 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    🗑️ Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal eliminar individual */}
                <ConfirmModal
                    open={!!toDelete}
                    title="Eliminar integrante"
                    message={
                        toDelete ? (
                            <div className="text-center">
                                <p className="text-gray-600">
                                    ¿Seguro que querés eliminar a{' '}
                                    <b className="text-gray-800">{toDelete.nombreCompleto}</b>?
                                </p>
                                <p className="mt-2 text-xs text-gray-500">
                                    DNI <b>{toDelete.dni}</b> · {labelTipo(toDelete.tipo).label}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                    Comparsa:{' '}
                                    <b style={{ color: COMPARSAS[toDelete.comparsa]?.color }}>
                                        {COMPARSAS[toDelete.comparsa]?.nombre || toDelete.comparsa}
                                    </b>
                                </p>
                                <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg py-2 px-3">
                                    ⚠️ Esta acción no se puede deshacer.
                                </p>
                                {deleteError && (
                                    <p className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
                                        {deleteError}
                                    </p>
                                )}
                            </div>
                        ) : null
                    }
                    confirmText="Eliminar"
                    cancelText="Cancelar"
                    variant="danger"
                    color={toDelete ? COMPARSAS[toDelete.comparsa]?.color : undefined}
                    loading={deleting}
                    onConfirm={confirmDelete}
                    onCancel={() => {
                        if (deleting) return;
                        setToDelete(null);
                        setDeleteError('');
                    }}
                />

                {/* Modal eliminar en masa */}
                <ConfirmModal
                    open={showBulkDelete}
                    title="Eliminar seleccionados"
                    message={
                        <div className="text-center">
                            <p className="text-gray-600">
                                ¿Seguro que querés eliminar{' '}
                                <b className="text-gray-800">
                                    {selected.size} integrante{selected.size !== 1 ? 's' : ''}
                                </b>
                                ?
                            </p>
                            <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg py-2 px-3">
                                ⚠️ Esta acción no se puede deshacer.
                            </p>
                            {deleteError && (
                                <p className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
                                    {deleteError}
                                </p>
                            )}
                        </div>
                    }
                    confirmText={`Eliminar ${selected.size}`}
                    cancelText="Cancelar"
                    variant="danger"
                    loading={bulkDeleting}
                    onConfirm={confirmBulkDelete}
                    onCancel={() => {
                        if (bulkDeleting) return;
                        setShowBulkDelete(false);
                        setDeleteError('');
                    }}
                />
            </main>
        </ProtectedRoute>
    );
}