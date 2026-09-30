// src/app/panel/page.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import ProtectedRoute from '../../components/ProtectedRoute';
import { db } from '../../firebase/firebase';
import { ref, get, remove } from 'firebase/database';
import { COMPARSAS, COMPARSA_IDS } from '../../lib/comparsas';
import { calcEdad, formatYMD, formatEpoch } from '../../lib/dates';

export default function PanelRootPage() {
    const [bailarines, setBailarines] = useState([]);
    const [loading, setLoading] = useState(true);

    const [q, setQ] = useState('');
    const [fComparsa, setFComparsa] = useState('todas');
    const [fEdadMin, setFEdadMin] = useState('');
    const [fEdadMax, setFEdadMax] = useState('');

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
                            nombre: b.nombre || '',
                            dni: b.dni || '',
                            fechaNacimiento: b.fechaNacimiento || '',
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
        load();
    }, []);

    const counts = useMemo(() => {
        const c = {};
        COMPARSA_IDS.forEach((id) => (c[id] = 0));
        bailarines.forEach((b) => {
            c[b.comparsa] = (c[b.comparsa] || 0) + 1;
        });
        return c;
    }, [bailarines]);

    const total = bailarines.length;

    const filtrados = useMemo(() => {
        const term = q.trim().toLowerCase();
        const min = fEdadMin === '' ? null : Number(fEdadMin);
        const max = fEdadMax === '' ? null : Number(fEdadMax);
        return bailarines
            .filter((b) => {
                if (fComparsa !== 'todas' && b.comparsa !== fComparsa) return false;
                if (term && !b.nombre.toLowerCase().includes(term) && !b.dni.includes(term)) return false;
                if (min !== null && (b.edad === null || b.edad < min)) return false;
                if (max !== null && (b.edad === null || b.edad > max)) return false;
                return true;
            })
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }, [bailarines, q, fComparsa, fEdadMin, fEdadMax]);

    const handleDelete = async (b) => {
        if (!confirm(`¿Eliminar a ${b.nombre} (DNI ${b.dni}) de ${COMPARSAS[b.comparsa]?.nombre}?`)) return;
        try {
            await remove(ref(db, `bailarines/${b.comparsa}/${b.id}`));
            setBailarines((prev) => prev.filter((x) => !(x.id === b.id && x.comparsa === b.comparsa)));
        } catch (err) {
            console.error(err);
            alert('Error al eliminar.');
        }
    };

    const exportExcel = async () => {
        const XLSX = await import('xlsx');
        const rows = filtrados.map((b) => ({
            Comparsa: COMPARSAS[b.comparsa]?.nombre || b.comparsa,
            Club: COMPARSAS[b.comparsa]?.club || '',
            Nombre: b.nombre,
            DNI: b.dni,
            'Fecha Nac.': formatYMD(b.fechaNacimiento),
            Edad: b.edad ?? '',
            Cargado: formatEpoch(b.createdAt),
            Modificado: b.updatedAt ? formatEpoch(b.updatedAt) : '',
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Bailarines');
        XLSX.writeFile(wb, `bailarines_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = '/';
    };

    return (
        <ProtectedRoute requireTipo="root">
            <main className="min-h-screen bg-gray-50 pb-10">
                <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800">👑 Panel Root</h1>
                    <button
                        onClick={handleLogout}
                        className="px-3 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600"
                    >
                        Salir
                    </button>
                </header>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
                    <section>
                        <div className="flex items-baseline justify-between mb-3">
                            <h2 className="text-lg font-semibold text-gray-700">Inscriptos por comparsa</h2>
                            <span className="text-sm text-gray-500">
                                Total: <b className="text-gray-800">{total}</b>
                            </span>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {COMPARSA_IDS.map((id) => {
                                const c = COMPARSAS[id];
                                return (
                                    <button
                                        key={id}
                                        onClick={() => setFComparsa(fComparsa === id ? 'todas' : id)}
                                        className={`text-left bg-white rounded-xl shadow-sm p-4 border-l-4 transition hover:shadow-md ${fComparsa === id ? 'ring-2 ring-pink-500' : ''
                                            }`}
                                        style={{ borderLeftColor: c.color }}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <Image
                                                src={c.logo}
                                                alt={c.nombre}
                                                width={28}
                                                height={28}
                                                className="rounded-full bg-white"
                                            />
                                            <p className="font-bold text-gray-800 text-sm">{c.nombre}</p>
                                        </div>
                                        <p className="text-3xl font-bold" style={{ color: c.color }}>
                                            {counts[id] || 0}
                                        </p>
                                        <p className="text-xs text-gray-500">{c.club}</p>
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
                                className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
                            >
                                <option value="todas">Todas las comparsas</option>
                                {COMPARSA_IDS.map((id) => (
                                    <option key={id} value={id}>
                                        {COMPARSAS[id].nombre} ({COMPARSAS[id].club})
                                    </option>
                                ))}
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
                                    onClick={() => {
                                        setQ('');
                                        setFComparsa('todas');
                                        setFEdadMin('');
                                        setFEdadMax('');
                                    }}
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
                                            <th className="text-left px-3 py-2">Comparsa</th>
                                            <th className="text-left px-3 py-2">Nombre</th>
                                            <th className="text-left px-3 py-2">DNI</th>
                                            <th className="text-left px-3 py-2">Nacimiento</th>
                                            <th className="text-left px-3 py-2">Edad</th>
                                            <th className="text-left px-3 py-2">Cargado</th>
                                            <th className="text-left px-3 py-2">Modificado</th>
                                            <th className="px-3 py-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtrados.map((b) => {
                                            const c = COMPARSAS[b.comparsa];
                                            return (
                                                <tr
                                                    key={`${b.comparsa}-${b.id}`}
                                                    className="border-b border-gray-100 hover:bg-gray-50"
                                                >
                                                    <td
                                                        className="px-3 py-2 whitespace-nowrap"
                                                        style={{ color: c?.color, fontWeight: 600 }}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {c && (
                                                                <Image
                                                                    src={c.logo}
                                                                    alt={c.nombre}
                                                                    width={20}
                                                                    height={20}
                                                                    className="rounded-full"
                                                                />
                                                            )}
                                                            {c?.nombre || b.comparsa}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap">{b.nombre}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap">{b.dni}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap">
                                                        {formatYMD(b.fechaNacimiento)}
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap">{b.edad ?? '-'}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-gray-500 text-xs">
                                                        {formatEpoch(b.createdAt)}
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-xs">
                                                        {b.updatedAt ? (
                                                            <span className="text-amber-600">✏️ {formatEpoch(b.updatedAt)}</span>
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
            </main>
        </ProtectedRoute>
    );
}