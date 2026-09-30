// src/app/inicio/page.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { FaWhatsapp } from 'react-icons/fa';
import ProtectedRoute from '../../components/ProtectedRoute';
import Header from '../../components/Header';
import FormInscripcion from '../../components/FormInscripcion';
import ModalCargaMasiva from '../../components/ModalCargaMasiva';
import ConfirmModal from '../../components/ConfirmModal';
import { db } from '../../firebase/firebase';
import { ref, get, remove, update } from 'firebase/database';
import { COMPARSAS } from '../../lib/comparsas';
import { calcEdad, formatYMD, formatEpoch } from '../../lib/dates';

function labelTipo(tipo) {
    if (tipo === 'passista') return { emoji: '💃', label: 'Passista', color: '#ec4899' };
    if (tipo === 'ritmista') return { emoji: '🥁', label: 'Ritmista', color: '#f59e0b' };
    return { emoji: '—', label: 'Sin tipo', color: '#9ca3af' };
}

function whatsappUrl(tel) {
    if (!tel) return null;
    let n = String(tel).replace(/\D/g, '');
    if (!n) return null;
    if (n.startsWith('0')) n = n.slice(1);
    if (!n.startsWith('54')) n = '549' + n;
    return `https://wa.me/${n}`;
}

export default function InicioPage() {
    const [usuario, setUsuario] = useState('');
    const [comparsa, setComparsa] = useState('');
    const [allBailarines, setAllBailarines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('comparsa');

    const [q, setQ] = useState('');
    const [fEdadMin, setFEdadMin] = useState('');
    const [fEdadMax, setFEdadMax] = useState('');
    const [fTipo, setFTipo] = useState('todos');

    const [showAdd, setShowAdd] = useState(false);
    const [showBulk, setShowBulk] = useState(false);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState('');
    const [shareMsg, setShareMsg] = useState('');

    const [toDelete, setToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const [selected, setSelected] = useState(new Set());
    const [showBulkDelete, setShowBulkDelete] = useState(false);
    const [bulkDeleting, setBulkDeleting] = useState(false);

    useEffect(() => {
        setUsuario(localStorage.getItem('usuario') || '');
        setComparsa(localStorage.getItem('comparsa') || '');
    }, []);

    const load = async () => {
        setLoading(true);
        try {
            const snap = await get(ref(db, 'bailarines'));
            if (snap.exists()) {
                const data = snap.val();
                const arr = [];
                Object.entries(data).forEach(([comp, regs]) => {
                    Object.entries(regs).forEach(([id, b]) => {
                        arr.push({
                            id,
                            comparsa: comp,
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
                setAllBailarines(arr);
            } else {
                setAllBailarines([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (comparsa && comparsa !== 'root') load();
    }, [comparsa]);

    useEffect(() => {
        setSelected(new Set());
    }, [tab]);

    const c = COMPARSAS[comparsa] || null;

    const sourceList = useMemo(() => {
        if (tab === 'comparsa') {
            return allBailarines.filter((b) => b.comparsa === comparsa);
        }
        return allBailarines;
    }, [allBailarines, tab, comparsa]);

    const filtrados = useMemo(() => {
        const term = q.trim().toLowerCase();
        const min = fEdadMin === '' ? null : Number(fEdadMin);
        const max = fEdadMax === '' ? null : Number(fEdadMax);
        return sourceList
            .filter((b) => {
                const full = (b.nombreCompleto || '').toLowerCase();
                if (term && !full.includes(term) && !b.dni.includes(term)) return false;
                if (min !== null && (b.edad === null || b.edad < min)) return false;
                if (max !== null && (b.edad === null || b.edad > max)) return false;
                if (fTipo !== 'todos' && b.tipo !== fTipo) return false;
                return true;
            })
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }, [sourceList, q, fEdadMin, fEdadMax, fTipo]);

    const stats = useMemo(() => {
        const total = sourceList.length;
        const passistas = sourceList.filter((b) => b.tipo === 'passista').length;
        const ritmistas = sourceList.filter((b) => b.tipo === 'ritmista').length;
        const conEdad = sourceList.filter((b) => b.edad !== null);
        const promedio = conEdad.length
            ? Math.round(conEdad.reduce((s, b) => s + b.edad, 0) / conEdad.length)
            : '-';
        return { total, passistas, ritmistas, promedio };
    }, [sourceList]);

    const canEdit = (b) => b.comparsa === comparsa;
    const rowKey = (b) => `${b.comparsa}-${b.id}`;

    const toggleSelect = (b) => {
        if (!canEdit(b)) return;
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
        if (tab !== 'comparsa') return;
        setSelected((prev) => {
            const next = new Set(prev);
            if (allVisibleSelected) {
                filtrados.forEach((b) => next.delete(rowKey(b)));
            } else {
                filtrados.forEach((b) => {
                    if (canEdit(b)) next.add(rowKey(b));
                });
            }
            return next;
        });
    };

    const clearSelection = () => setSelected(new Set());

    const handleDelete = (b) => {
        if (!canEdit(b)) return;
        setDeleteError('');
        setToDelete(b);
    };

    const confirmDelete = async () => {
        if (!toDelete) return;
        setDeleting(true);
        setDeleteError('');
        try {
            await remove(ref(db, `bailarines/${toDelete.comparsa}/${toDelete.id}`));
            setAllBailarines((prev) =>
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
            allBailarines.forEach((b) => {
                if (selected.has(rowKey(b))) {
                    updates[`bailarines/${b.comparsa}/${b.id}`] = null;
                }
            });
            await update(ref(db), updates);
            setAllBailarines((prev) => prev.filter((b) => !selected.has(rowKey(b))));
            setSelected(new Set());
            setShowBulkDelete(false);
        } catch (err) {
            console.error(err);
            setDeleteError('No se pudieron eliminar. Revisá la conexión.');
        } finally {
            setBulkDeleting(false);
        }
    };

    const openEdit = (b) => {
        if (!canEdit(b)) return;
        setEditError('');
        setEditing({
            id: b.id,
            comparsa: b.comparsa,
            apellido: b.apellido,
            nombre: b.nombre,
            dni: b.dni,
            fechaNacimiento: b.fechaNacimiento,
            tipo: b.tipo || '',
            telefono: b.telefono,
            instagram: b.instagram,
        });
    };

    const saveEdit = async () => {
        setEditError('');
        if (!editing) return;
        if (
            !editing.apellido.trim() ||
            !editing.nombre.trim() ||
            !editing.dni.trim() ||
            !editing.fechaNacimiento
        ) {
            setEditError('Completá apellido, nombre, DNI y fecha.');
            return;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(editing.fechaNacimiento)) {
            setEditError('Fecha inválida.');
            return;
        }
        if (!editing.tipo) {
            setEditError('Seleccioná Passista o Ritmista.');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                apellido: editing.apellido.trim(),
                nombre: editing.nombre.trim(),
                nombreCompleto: `${editing.apellido.trim()} ${editing.nombre.trim()}`,
                dni: editing.dni.replace(/\D/g, ''),
                fechaNacimiento: editing.fechaNacimiento,
                tipo: editing.tipo,
                telefono: editing.telefono.trim(),
                instagram: editing.instagram.trim().replace(/^@/, ''),
                updatedAt: { epoch: Date.now(), iso: new Date().toISOString() },
            };
            await update(ref(db, `bailarines/${editing.comparsa}/${editing.id}`), payload);

            setAllBailarines((prev) =>
                prev.map((x) =>
                    x.id === editing.id && x.comparsa === editing.comparsa
                        ? {
                            ...x,
                            ...payload,
                            edad: calcEdad(payload.fechaNacimiento),
                            updatedAt: payload.updatedAt.epoch,
                        }
                        : x
                )
            );
            setEditing(null);
        } catch (err) {
            console.error(err);
            setEditError('No se pudo guardar.');
        } finally {
            setSaving(false);
        }
    };

    // ============ EXPORT (condicional por tab) ============
    const exportExcel = async () => {
        const XLSX = await import('xlsx');
        const esTabComparsa = tab === 'comparsa';

        const rows = filtrados.map((b) => {
            const base = {
                Nombre: b.nombreCompleto,
                DNI: b.dni,
                'Fecha Nac.': formatYMD(b.fechaNacimiento),
                Edad: b.edad ?? '',
                Tipo: labelTipo(b.tipo).label,
            };

            if (esTabComparsa) {
                return {
                    ...base,
                    Teléfono: b.telefono,
                    Instagram: b.instagram ? `@${b.instagram}` : '',
                    Menor: b.esMenor ? 'Sí' : 'No',
                    'Tutor (si menor)': b.tutor
                        ? `${b.tutor.apellido} ${b.tutor.nombre} - ${b.tutor.telefono}`
                        : '',
                };
            } else {
                // General: sin teléfono
                return {
                    Comparsa: COMPARSAS[b.comparsa]?.nombre || b.comparsa,
                    Club: COMPARSAS[b.comparsa]?.club || '',
                    ...base,
                    Creado: formatEpoch(b.createdAt),
                    Modificado: b.updatedAt ? formatEpoch(b.updatedAt) : '',
                };
            }
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Bailarines');
        const sufijo = esTabComparsa ? comparsa : 'general';
        XLSX.writeFile(wb, `bailarines_${sufijo}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const compartirLink = async () => {
        const url = `${window.location.origin}/inscripcion/${comparsa}`;
        const titulo = `Inscripción ${c?.nombre || comparsa}`;
        const texto = `Inscribite a la comparsa ${c?.nombre || comparsa} (${c?.club || ''}) para los Carnavales 2027 🎭`;
        try {
            if (navigator.share) {
                await navigator.share({ title: titulo, text: texto, url });
            } else {
                await navigator.clipboard.writeText(url);
                setShareMsg('✅ Link copiado al portapapeles');
                setTimeout(() => setShareMsg(''), 2500);
            }
        } catch {
            try {
                await navigator.clipboard.writeText(url);
                setShareMsg('✅ Link copiado al portapapeles');
                setTimeout(() => setShareMsg(''), 2500);
            } catch {
                setShareMsg(`🔗 ${url}`);
                setTimeout(() => setShareMsg(''), 5000);
            }
        }
    };

    const limpiarFiltros = () => {
        setQ('');
        setFEdadMin('');
        setFEdadMax('');
        setFTipo('todos');
    };

    const hasSelection = selected.size > 0;
    const esTabComparsa = tab === 'comparsa';

    return (
        <ProtectedRoute requireTipo="usuario">
            <main className={`min-h-screen bg-gray-50 ${hasSelection ? 'pb-32' : 'pb-24'}`}>
                <Header
                    titulo={c?.nombre || comparsa}
                    subtitulo={`${usuario} · ${c?.club || ''}`}
                    logo={c?.logo}
                    color={c?.color}
                />

                {/* Tabs */}
                <div className="bg-white border-b border-gray-200 sticky top-[65px] z-20">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6">
                        <div className="flex gap-1 -mb-px overflow-x-auto">
                            <button
                                onClick={() => setTab('general')}
                                className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition whitespace-nowrap ${tab === 'general'
                                    ? 'border-pink-600 text-pink-700'
                                    : 'border-transparent text-gray-500 hover:text-gray-800'
                                    }`}
                            >
                                🌐 General
                                <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                                    {allBailarines.length}
                                </span>
                            </button>
                            <button
                                onClick={() => setTab('comparsa')}
                                className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition whitespace-nowrap ${tab === 'comparsa'
                                    ? 'border-pink-600 text-pink-700'
                                    : 'border-transparent text-gray-500 hover:text-gray-800'
                                    }`}
                            >
                                🎭 {c?.nombre || 'Mi comparsa'}
                                <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                                    {allBailarines.filter((b) => b.comparsa === comparsa).length}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 space-y-5">
                    <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4">
                            <p className="text-xs text-gray-500 truncate">Total</p>
                            <p
                                className="text-2xl sm:text-3xl font-bold"
                                style={{ color: esTabComparsa ? c?.color : '#374151' }}
                            >
                                {stats.total}
                            </p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4">
                            <p className="text-xs text-gray-500 truncate">💃 Passistas</p>
                            <p className="text-2xl sm:text-3xl font-bold text-pink-600">
                                {stats.passistas}
                            </p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4">
                            <p className="text-xs text-gray-500 truncate">🥁 Ritmistas</p>
                            <p className="text-2xl sm:text-3xl font-bold text-amber-600">
                                {stats.ritmistas}
                            </p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4">
                            <p className="text-xs text-gray-500 truncate">Prom. edad</p>
                            <p className="text-2xl sm:text-3xl font-bold text-gray-700">
                                {stats.promedio}
                            </p>
                        </div>
                    </section>

                    {esTabComparsa && (
                        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <button
                                onClick={() => setShowAdd(true)}
                                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold shadow-sm active:scale-[0.98] transition"
                            >
                                ➕ Cargar integrante
                            </button>
                            <button
                                onClick={() => setShowBulk(true)}
                                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm active:scale-[0.98] transition"
                            >
                                📥 Carga masiva
                            </button>
                            <button
                                onClick={compartirLink}
                                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold shadow-sm active:scale-[0.98] transition"
                            >
                                🔗 Compartir link
                            </button>
                        </section>
                    )}

                    {shareMsg && (
                        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded-lg">
                            {shareMsg}
                        </div>
                    )}

                    <section className="bg-white rounded-xl shadow-sm p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                            <input
                                type="text"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Buscar por nombre, apellido o DNI…"
                                className="sm:col-span-2 px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-pink-500 outline-none text-sm"
                            />
                            <select
                                value={fTipo}
                                onChange={(e) => setFTipo(e.target.value)}
                                className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white"
                            >
                                <option value="todos">Todos los tipos</option>
                                <option value="passista">💃 Passistas</option>
                                <option value="ritmista">🥁 Ritmistas</option>
                            </select>
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

                        <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                            <span className="text-sm text-gray-500">
                                Resultados: <b className="text-gray-800">{filtrados.length}</b>
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={limpiarFiltros}
                                    className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-100"
                                >
                                    Limpiar
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
                            <p className="p-6 text-gray-500">
                                {esTabComparsa
                                    ? 'No hay integrantes cargados en tu comparsa.'
                                    : 'No hay resultados.'}
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-800 text-white">
                                        <tr>
                                            {/* Checkbox — solo comparsa */}
                                            {esTabComparsa && (
                                                <th className="w-10 px-3 py-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={allVisibleSelected}
                                                        onChange={toggleAllVisible}
                                                        className="w-4 h-4 accent-pink-500 cursor-pointer"
                                                        title="Seleccionar todo"
                                                    />
                                                </th>
                                            )}

                                            {/* 🌐 GENERAL */}
                                            {!esTabComparsa && (
                                                <>
                                                    <th className="text-left px-3 py-2">Comparsa</th>
                                                    <th className="text-left px-3 py-2">Nombre</th>
                                                    <th className="text-left px-3 py-2">DNI</th>
                                                    <th className="text-left px-3 py-2">Nacimiento</th>
                                                    <th className="text-left px-3 py-2">Edad</th>
                                                    <th className="text-left px-3 py-2">Tipo</th>
                                                    <th className="text-left px-3 py-2">Creado</th>
                                                    <th className="text-left px-3 py-2">Modificado</th>
                                                </>
                                            )}

                                            {/* 🎭 COMPARSA */}
                                            {esTabComparsa && (
                                                <>
                                                    <th className="text-left px-3 py-2">Nombre</th>
                                                    <th className="text-left px-3 py-2">DNI</th>
                                                    <th className="text-left px-3 py-2">Nacimiento</th>
                                                    <th className="text-left px-3 py-2">Edad</th>
                                                    <th className="text-left px-3 py-2">Tipo</th>
                                                    <th className="text-left px-3 py-2">Teléfono</th>
                                                    <th className="px-3 py-2"></th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtrados.map((b) => {
                                            const bc = COMPARSAS[b.comparsa];
                                            const editable = canEdit(b);
                                            const t = labelTipo(b.tipo);
                                            const k = rowKey(b);
                                            const isSelected = selected.has(k);
                                            const wa = whatsappUrl(b.telefono);
                                            return (
                                                <tr
                                                    key={k}
                                                    className={`border-b border-gray-100 ${isSelected
                                                        ? 'bg-pink-50'
                                                        : editable
                                                            ? 'hover:bg-gray-50'
                                                            : 'bg-gray-50/50'
                                                        }`}
                                                >
                                                    {esTabComparsa && (
                                                        <td className="px-3 py-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleSelect(b)}
                                                                className="w-4 h-4 accent-pink-500 cursor-pointer"
                                                            />
                                                        </td>
                                                    )}

                                                    {/* 🌐 GENERAL */}
                                                    {!esTabComparsa && (
                                                        <>
                                                            <td
                                                                className="px-3 py-2 whitespace-nowrap"
                                                                style={{ color: bc?.color, fontWeight: 600 }}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    {bc && (
                                                                        <Image
                                                                            src={bc.logo}
                                                                            alt={bc.nombre}
                                                                            width={20}
                                                                            height={20}
                                                                            className="rounded-full"
                                                                        />
                                                                    )}
                                                                    <span className="text-xs sm:text-sm">
                                                                        {bc?.nombre || b.comparsa}
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
                                                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
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
                                                        </>
                                                    )}

                                                    {/* 🎭 COMPARSA */}
                                                    {esTabComparsa && (
                                                        <>
                                                            <td className="px-3 py-2">
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
                                                            <td className="px-3 py-2 whitespace-nowrap text-xs">
                                                                {b.telefono ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-medium text-gray-700">
                                                                            {b.telefono}
                                                                        </span>
                                                                        {wa && (
                                                                            <a
                                                                                href={wa}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-sm transition active:scale-95"
                                                                                title={`Enviar WhatsApp a ${b.telefono}`}
                                                                                aria-label="WhatsApp"
                                                                            >
                                                                                <FaWhatsapp size={16} />
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-gray-400">—</span>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2 whitespace-nowrap text-right space-x-2">
                                                                <button
                                                                    onClick={() => openEdit(b)}
                                                                    className="text-blue-600 hover:text-blue-800 font-semibold text-xs"
                                                                >
                                                                    Editar
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(b)}
                                                                    className="text-red-600 hover:text-red-800 font-semibold text-xs"
                                                                >
                                                                    Eliminar
                                                                </button>
                                                            </td>
                                                        </>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>

                {esTabComparsa && !hasSelection && (
                    <button
                        onClick={compartirLink}
                        className="fixed bottom-6 right-6 z-20 flex items-center justify-center w-14 h-14 rounded-full bg-pink-600 hover:bg-pink-700 text-white shadow-2xl active:scale-95 transition"
                        aria-label="Compartir link de inscripción"
                    >
                        <span className="text-2xl leading-none">🔗</span>
                    </button>
                )}

                {hasSelection && (
                    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-2xl">
                        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-9 h-9 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-sm shrink-0">
                                    {selected.size}
                                </div>
                                <span className="text-sm font-semibold text-gray-700 truncate">
                                    {selected.size === 1
                                        ? '1 seleccionado'
                                        : `${selected.size} seleccionados`}
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

                {showAdd && (
                    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
                        <div className="min-h-full flex items-start sm:items-center justify-center p-4 pt-20 sm:pt-4 pb-10">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                                <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white rounded-t-2xl z-10">
                                    <h3 className="text-base sm:text-lg font-bold text-gray-800 pr-2">
                                        ➕ Nuevo integrante — {c?.nombre || comparsa}
                                    </h3>
                                    <button
                                        onClick={() => setShowAdd(false)}
                                        className="text-gray-500 hover:text-gray-800 text-2xl leading-none w-8 h-8 flex items-center justify-center shrink-0"
                                        aria-label="Cerrar"
                                    >
                                        ×
                                    </button>
                                </div>
                                <div className="p-4 sm:p-5">
                                    <FormInscripcion
                                        comparsaId={comparsa}
                                        comparsaData={c}
                                        mode="admin"
                                        compact
                                        onSuccess={() => {
                                            setShowAdd(false);
                                            load();
                                        }}
                                        onCancel={() => setShowAdd(false)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showBulk && (
                    <ModalCargaMasiva
                        comparsaId={comparsa}
                        comparsaData={c}
                        onClose={() => setShowBulk(false)}
                        onDone={() => {
                            setShowBulk(false);
                            load();
                        }}
                    />
                )}

                {editing && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">
                                ✏️ Editar integrante
                            </h3>

                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Apellido</label>
                                        <input
                                            type="text"
                                            value={editing.apellido}
                                            onChange={(e) => setEditing({ ...editing, apellido: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre</label>
                                        <input
                                            type="text"
                                            value={editing.nombre}
                                            onChange={(e) => setEditing({ ...editing, nombre: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">DNI</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={editing.dni}
                                        onChange={(e) =>
                                            setEditing({ ...editing, dni: e.target.value.replace(/\D/g, '') })
                                        }
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                                        Fecha de nacimiento
                                    </label>
                                    <input
                                        type="date"
                                        value={editing.fechaNacimiento}
                                        onChange={(e) => setEditing({ ...editing, fechaNacimiento: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                                        Tipo de integrante
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setEditing({ ...editing, tipo: 'passista' })}
                                            className={`px-3 py-2 rounded-lg border-2 text-sm font-semibold transition ${editing.tipo === 'passista'
                                                ? 'border-pink-500 bg-pink-50 text-pink-700'
                                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                                }`}
                                        >
                                            💃 Passista
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditing({ ...editing, tipo: 'ritmista' })}
                                            className={`px-3 py-2 rounded-lg border-2 text-sm font-semibold transition ${editing.tipo === 'ritmista'
                                                ? 'border-amber-500 bg-amber-50 text-amber-700'
                                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                                }`}
                                        >
                                            🥁 Ritmista
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Teléfono</label>
                                        <input
                                            type="tel"
                                            value={editing.telefono}
                                            onChange={(e) => setEditing({ ...editing, telefono: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Instagram</label>
                                        <input
                                            type="text"
                                            value={editing.instagram}
                                            onChange={(e) =>
                                                setEditing({ ...editing, instagram: e.target.value.replace(/^@/, '') })
                                            }
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                                        />
                                    </div>
                                </div>

                                {editError && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
                                        {editError}
                                    </div>
                                )}
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
                    color={c?.color}
                    loading={deleting}
                    onConfirm={confirmDelete}
                    onCancel={() => {
                        if (deleting) return;
                        setToDelete(null);
                        setDeleteError('');
                    }}
                />

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
                    color={c?.color}
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