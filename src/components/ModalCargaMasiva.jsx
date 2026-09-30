// src/components/ModalCargaMasiva.jsx
'use client';

import { useState } from 'react';
import { db } from '../firebase/firebase';
import { ref, get, push, update } from 'firebase/database';

const YMD_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const DMY_RE = /^(0?[1-9]|[12]\d|3[01])[\/\-](0?[1-9]|1[0-2])[\/\-](\d{4})$/;
const pad2 = (n) => String(n).padStart(2, '0');
const TIPOS_VALIDOS = ['passista', 'ritmista'];

const COMPARSA_LABEL = {
    fenix: 'Fénix',
    sisiri: 'Sirirí',
    alumine: 'Aluminé',
    amaru: 'Amarú',
};

function normalizeDate(raw) {
    if (raw == null) return '';
    if (typeof raw === 'number' && isFinite(raw)) {
        const base = Date.UTC(1899, 11, 30);
        const d = new Date(base + raw * 86400000);
        return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
    }
    const s = String(raw).trim();
    if (!s) return '';
    if (YMD_RE.test(s)) return s;
    const dmy = s.match(DMY_RE);
    if (dmy) return `${dmy[3]}-${pad2(dmy[2])}-${pad2(dmy[1])}`;
    return '';
}

function normalizeTipo(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (!s) return '';
    if (s.startsWith('pass')) return 'passista';
    if (s.startsWith('ritm') || s.startsWith('batu') || s.startsWith('perc')) return 'ritmista';
    return s;
}

function stamp() {
    return { epoch: Date.now(), iso: new Date().toISOString() };
}

/**
 * Trae un mapa { dni: { comparsa, nombre } } con TODOS los DNI
 * existentes en TODAS las comparsas de la base.
 */
async function obtenerTodosLosDni() {
    const map = new Map();
    const snap = await get(ref(db, 'bailarines'));
    if (!snap.exists()) return map;
    const data = snap.val();
    for (const [comp, regs] of Object.entries(data)) {
        if (!regs) continue;
        for (const b of Object.values(regs)) {
            const dni = String(b?.dni || '').trim();
            if (!dni) continue;
            if (!map.has(dni)) {
                map.set(dni, {
                    comparsa: comp,
                    nombre: b?.nombreCompleto || `${b?.apellido || ''} ${b?.nombre || ''}`.trim(),
                });
            }
        }
    }
    return map;
}

export default function ModalCargaMasiva({ comparsaId, comparsaData, onClose, onDone }) {
    const [tab, setTab] = useState('excel');
    const [pasted, setPasted] = useState('');
    const [preview, setPreview] = useState([]);
    const [fileName, setFileName] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');

    const descargarPlantilla = async () => {
        try {
            const XLSX = await import('xlsx');
            const data = [
                {
                    apellido: 'Pérez',
                    nombre: 'Juan',
                    dni: '40123456',
                    fechaNacimiento: '21/05/1995',
                    tipo: 'passista',
                    telefono: '3456123456',
                    instagram: 'juanp',
                },
                {
                    apellido: 'Gómez',
                    nombre: 'Ana',
                    dni: '35234567',
                    fechaNacimiento: '01/12/1992',
                    tipo: 'ritmista',
                    telefono: '3456987654',
                    instagram: 'anag',
                },
            ];
            const ws = XLSX.utils.json_to_sheet(data, {
                header: ['apellido', 'nombre', 'dni', 'fechaNacimiento', 'tipo', 'telefono', 'instagram'],
            });
            ws['!cols'] = [
                { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 16 },
                { wch: 12 }, { wch: 15 }, { wch: 15 },
            ];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Integrantes');
            XLSX.writeFile(wb, `plantilla_${comparsaId}.xlsx`);
        } catch (err) {
            console.error(err);
            setError('No se pudo generar la plantilla.');
        }
    };

    const buildRow = (obj, i) => {
        const apellido = String(obj.apellido || '').trim();
        const nombre = String(obj.nombre || '').trim();
        const dni = String(obj.dni || '').replace(/\D/g, '');
        const fechaRaw = obj.fechaRaw ?? '';
        const tipo = normalizeTipo(obj.tipo);
        const telefono = String(obj.telefono || '').trim();
        const instagram = String(obj.instagram || '').trim().replace(/^@/, '');
        const fecha = normalizeDate(fechaRaw);

        const valido =
            !!(apellido && nombre && dni.length >= 6 && YMD_RE.test(fecha) && TIPOS_VALIDOS.includes(tipo));
        let motivo = '';
        if (!apellido || !nombre) motivo = 'Falta apellido/nombre';
        else if (dni.length < 6) motivo = 'DNI inválido';
        else if (!YMD_RE.test(fecha)) motivo = 'Fecha inválida';
        else if (!TIPOS_VALIDOS.includes(tipo)) motivo = 'Tipo inválido (passista/ritmista)';

        return {
            row: i + 1,
            apellido,
            nombre,
            dni,
            fechaRaw: String(fechaRaw ?? ''),
            _fecha: fecha,
            tipo,
            telefono,
            instagram,
            valido,
            motivo,
        };
    };

    const parsePasted = (text) => {
        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        if (lines.length === 0) return [];
        const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
        const headers = lines[0].split(sep).map((h) => h.replace(/\s|_/g, '').toLowerCase());
        const idxAp = headers.findIndex((h) => ['apellido', 'apellidos'].includes(h));
        const idxNom = headers.findIndex((h) => ['nombre', 'nombres'].includes(h));
        const idxDni = headers.findIndex((h) => ['dni', 'documento'].includes(h));
        const idxFecha = headers.findIndex((h) => ['fechanacimiento', 'fecha', 'nacimiento'].includes(h));
        const idxTipo = headers.findIndex((h) => ['tipo', 'categoria', 'rol'].includes(h));
        const idxTel = headers.findIndex((h) => ['telefono', 'celular', 'tel'].includes(h));
        const idxIg = headers.findIndex((h) => ['instagram', 'ig'].includes(h));

        const hasHeader = idxAp !== -1 && idxNom !== -1 && idxDni !== -1 && idxFecha !== -1;
        const body = hasHeader ? lines.slice(1) : lines;

        return body.map((line, i) => {
            const cols = line.split(sep).map((s) => s.trim());
            const get = (idx, fb) => (hasHeader ? cols[idx] : cols[fb]) || '';
            return buildRow(
                {
                    apellido: get(idxAp, 0),
                    nombre: get(idxNom, 1),
                    dni: get(idxDni, 2),
                    fechaRaw: get(idxFecha, 3),
                    tipo: get(idxTipo, 4),
                    telefono: get(idxTel, 5),
                    instagram: get(idxIg, 6),
                },
                i
            );
        });
    };

    // 🔎 Aplica validación de DNI a un array de filas contra un mapa existente
    const aplicarChequeoDni = (rows, dniMap) => {
        // Primero: duplicados dentro del propio archivo
        const contador = new Map();
        rows.forEach((r) => {
            if (!r.dni) return;
            contador.set(r.dni, (contador.get(r.dni) || 0) + 1);
        });

        return rows.map((r) => {
            if (!r.valido) return r; // ya era inválido por otro motivo

            if ((contador.get(r.dni) || 0) > 1) {
                return {
                    ...r,
                    valido: false,
                    motivo: 'DNI duplicado en el archivo',
                };
            }

            const existing = dniMap.get(r.dni);
            if (existing) {
                const label = COMPARSA_LABEL[existing.comparsa] || existing.comparsa;
                return {
                    ...r,
                    valido: false,
                    motivo: `Ya registrado en ${label}`,
                };
            }

            return r;
        });
    };

    const onPastePreview = async () => {
        setError('');
        setMsg('');
        const rows = parsePasted(pasted);
        if (rows.length === 0) {
            setPreview([]);
            setError('No se detectaron filas.');
            return;
        }
        try {
            const dniMap = await obtenerTodosLosDni();
            setPreview(aplicarChequeoDni(rows, dniMap));
        } catch (err) {
            console.error(err);
            setPreview(rows);
            setError('No se pudo validar los DNI contra la base.');
        }
    };

    const onExcelChange = async (e) => {
        setError('');
        setMsg('');
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        try {
            const XLSX = await import('xlsx');
            const data = await file.arrayBuffer();
            const wb = XLSX.read(data, { cellDates: true });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(ws, { defval: '' });

            const rows = json.map((row, idx) => {
                const nk = {};
                Object.keys(row).forEach((k) => {
                    nk[String(k).replace(/\s|_/g, '').toLowerCase()] = row[k];
                });
                return buildRow(
                    {
                        apellido: nk.apellido || nk.apellidos || '',
                        nombre: nk.nombre || nk.nombres || '',
                        dni: nk.dni || nk.documento || '',
                        fechaRaw: nk.fechanacimiento ?? nk.fecha ?? nk.nacimiento ?? '',
                        tipo: nk.tipo || nk.categoria || nk.rol || '',
                        telefono: nk.telefono || nk.celular || nk.tel || '',
                        instagram: nk.instagram || nk.ig || '',
                    },
                    idx
                );
            });

            const dniMap = await obtenerTodosLosDni();
            setPreview(aplicarChequeoDni(rows, dniMap));
            if (rows.length === 0) setError('El Excel no tiene filas.');
        } catch (err) {
            console.error(err);
            setError('No se pudo leer el Excel.');
        }
    };

    const updateRow = (idx, field, value) => {
        setPreview((prev) => {
            const next = [...prev];
            const r = { ...next[idx] };

            if (field === 'dni') r.dni = String(value).replace(/\D/g, '');
            else if (field === 'tipo') r.tipo = normalizeTipo(value);
            else r[field] = value;

            const fecha = normalizeDate(r.fechaRaw);
            let valido =
                !!(r.apellido && r.nombre && r.dni.length >= 6 && YMD_RE.test(fecha) && TIPOS_VALIDOS.includes(r.tipo));
            let motivo = '';
            if (!r.apellido || !r.nombre) motivo = 'Falta apellido/nombre';
            else if (r.dni.length < 6) motivo = 'DNI inválido';
            else if (!YMD_RE.test(fecha)) motivo = 'Fecha inválida';
            else if (!TIPOS_VALIDOS.includes(r.tipo)) motivo = 'Tipo inválido';

            // Chequeo de duplicado dentro del archivo (rápido, sin Firebase)
            if (valido && r.dni) {
                const dup = next.some((x, i) => i !== idx && x.dni === r.dni);
                if (dup) {
                    valido = false;
                    motivo = 'DNI duplicado en el archivo';
                }
            }

            // Si había un "Ya registrado en X" previo, lo mantenemos por si el user no cambió el DNI
            if (valido && motivo === '' && r.motivo && r.motivo.startsWith('Ya registrado')) {
                valido = false;
                motivo = r.motivo;
            }

            next[idx] = { ...r, _fecha: fecha, valido, motivo };
            return next;
        });
    };

    const confirmar = async () => {
        setError('');
        setMsg('');
        const validas = preview.filter((r) => r.valido);
        if (validas.length === 0) return setError('No hay filas válidas.');

        setSaving(true);
        try {
            // 🔒 Chequeo final contra TODA la base
            const dniMap = await obtenerTodosLosDni();

            // Duplicados dentro del archivo
            const dnis = validas.map((v) => v.dni);
            const dupInterno = dnis.find((d, i) => dnis.indexOf(d) !== i);
            if (dupInterno) {
                setError(`DNI duplicado dentro del archivo: ${dupInterno}`);
                setSaving(false);
                return;
            }

            // Duplicados contra la base (en cualquier comparsa)
            const conflictos = validas.filter((v) => dniMap.has(v.dni));
            if (conflictos.length > 0) {
                const detalle = conflictos
                    .map((v) => {
                        const info = dniMap.get(v.dni);
                        const label = COMPARSA_LABEL[info.comparsa] || info.comparsa;
                        return `${v.dni} (en ${label})`;
                    })
                    .join(', ');
                setError(`Estos DNI ya están registrados: ${detalle}`);
                // Refrescamos el preview para marcar cuáles fallan
                setPreview(aplicarChequeoDni(preview, dniMap));
                setSaving(false);
                return;
            }

            const updates = {};
            validas.forEach((r) => {
                const newRef = push(ref(db, `bailarines/${comparsaId}`));
                updates[`bailarines/${comparsaId}/${newRef.key}`] = {
                    apellido: r.apellido,
                    nombre: r.nombre,
                    nombreCompleto: `${r.apellido} ${r.nombre}`,
                    dni: r.dni,
                    fechaNacimiento: r._fecha,
                    tipo: r.tipo,
                    telefono: r.telefono,
                    instagram: r.instagram,
                    esMenor: false,
                    tutor: null,
                    createdAt: stamp(),
                };
            });
            await update(ref(db), updates);

            setMsg(`✅ ${validas.length} integrante(s) importado(s) correctamente.`);
            setPreview([]);
            setPasted('');
            setFileName('');
            if (typeof onDone === 'function') onDone();
        } catch (err) {
            console.error(err);
            setError('No se pudo importar.');
        } finally {
            setSaving(false);
        }
    };

    const inputCls = 'px-3 py-2 rounded-lg border border-gray-300 text-sm';

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white w-full sm:max-w-4xl sm:rounded-2xl shadow-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col mt-12 sm:mt-0 rounded-t-2xl">
                <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
                    <h3 className="text-lg font-bold text-gray-800">📥 Carga masiva</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-800 text-2xl leading-none w-8 h-8 flex items-center justify-center"
                        aria-label="Cerrar"
                    >
                        ×
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1 space-y-4">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setTab('excel')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold ${tab === 'excel' ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-700'
                                }`}
                        >
                            📊 Excel
                        </button>
                        <button
                            onClick={() => setTab('pegar')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold ${tab === 'pegar' ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-700'
                                }`}
                        >
                            📋 Pegar datos
                        </button>
                    </div>

                    {tab === 'excel' && (
                        <div className="space-y-3">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-xs text-blue-900 leading-relaxed">
                                    <b>Columnas:</b>{' '}
                                    <code className="bg-white/70 px-1 rounded">apellido</code>,{' '}
                                    <code className="bg-white/70 px-1 rounded">nombre</code>,{' '}
                                    <code className="bg-white/70 px-1 rounded">dni</code>,{' '}
                                    <code className="bg-white/70 px-1 rounded">fechaNacimiento</code>,{' '}
                                    <code className="bg-white/70 px-1 rounded">tipo</code>{' '}
                                    (<span className="text-pink-700 font-bold">passista</span> o{' '}
                                    <span className="text-pink-700 font-bold">ritmista</span>),{' '}
                                    <code className="bg-white/70 px-1 rounded">telefono</code>,{' '}
                                    <code className="bg-white/70 px-1 rounded">instagram</code>.
                                    <br />
                                    <b>Fecha:</b> <b>dd/mm/aaaa</b> o <b>yyyy-mm-dd</b>.
                                    <br />
                                    <span className="text-red-700">
                                        ⚠️ Los DNI ya registrados en cualquier comparsa serán rechazados automáticamente.
                                    </span>
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={descargarPlantilla}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold border border-gray-300"
                            >
                                ⬇️ Descargar plantilla de ejemplo (.xlsx)
                            </button>

                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={onExcelChange}
                                className="w-full px-3 py-3 rounded-lg border border-gray-300 text-sm bg-white file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-pink-600 file:text-white file:font-semibold file:cursor-pointer"
                            />
                            {fileName && (
                                <p className="text-xs text-gray-500">
                                    Archivo: <b>{fileName}</b>
                                </p>
                            )}
                        </div>
                    )}

                    {tab === 'pegar' && (
                        <div className="space-y-3">
                            <textarea
                                rows={6}
                                value={pasted}
                                onChange={(e) => setPasted(e.target.value)}
                                placeholder={`apellido,nombre,dni,fechaNacimiento,tipo,telefono,instagram
Pérez,Juan,12345678,21/05/1990,passista,3456111111,juanp
Gómez,Ana,34566789,01/12/1992,ritmista,3456222222,anag`}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs sm:text-sm font-mono"
                            />
                            <button
                                onClick={onPastePreview}
                                type="button"
                                className="w-full sm:w-auto px-4 py-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold"
                            >
                                Previsualizar
                            </button>
                        </div>
                    )}

                    {preview.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm text-gray-600">
                                Filas: <b>{preview.length}</b> · Válidas:{' '}
                                <b className="text-green-700">{preview.filter((r) => r.valido).length}</b> · Inválidas:{' '}
                                <b className="text-red-600">{preview.filter((r) => !r.valido).length}</b>
                            </p>
                            <div className="overflow-x-auto border rounded-lg max-h-72 overflow-y-auto">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-100 sticky top-0">
                                        <tr>
                                            <th className="px-2 py-1 text-left">#</th>
                                            <th className="px-2 py-1 text-left">Apellido</th>
                                            <th className="px-2 py-1 text-left">Nombre</th>
                                            <th className="px-2 py-1 text-left">DNI</th>
                                            <th className="px-2 py-1 text-left">Fecha</th>
                                            <th className="px-2 py-1 text-left">Tipo</th>
                                            <th className="px-2 py-1 text-left">Teléfono</th>
                                            <th className="px-2 py-1 text-left">IG</th>
                                            <th className="px-2 py-1 text-left">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.map((r, idx) => (
                                            <tr
                                                key={r.row}
                                                className={`border-t ${!r.valido ? 'bg-red-50/50' : ''}`}
                                            >
                                                <td className="px-2 py-1">{r.row}</td>
                                                <td className="px-2 py-1">
                                                    <input
                                                        value={r.apellido}
                                                        onChange={(e) => updateRow(idx, 'apellido', e.target.value)}
                                                        className="w-24 px-1 py-0.5 border rounded text-xs"
                                                    />
                                                </td>
                                                <td className="px-2 py-1">
                                                    <input
                                                        value={r.nombre}
                                                        onChange={(e) => updateRow(idx, 'nombre', e.target.value)}
                                                        className="w-24 px-1 py-0.5 border rounded text-xs"
                                                    />
                                                </td>
                                                <td className="px-2 py-1">
                                                    <input
                                                        value={r.dni}
                                                        onChange={(e) => updateRow(idx, 'dni', e.target.value)}
                                                        className={`w-20 px-1 py-0.5 border rounded text-xs ${r.motivo && r.motivo.includes('DNI')
                                                            ? 'border-red-400 bg-red-50'
                                                            : ''
                                                            }`}
                                                    />
                                                </td>
                                                <td className="px-2 py-1">
                                                    <input
                                                        value={r.fechaRaw}
                                                        onChange={(e) => updateRow(idx, 'fechaRaw', e.target.value)}
                                                        className="w-24 px-1 py-0.5 border rounded text-xs"
                                                    />
                                                </td>
                                                <td className="px-2 py-1">
                                                    <select
                                                        value={r.tipo}
                                                        onChange={(e) => updateRow(idx, 'tipo', e.target.value)}
                                                        className="w-24 px-1 py-0.5 border rounded text-xs bg-white"
                                                    >
                                                        <option value="">—</option>
                                                        <option value="passista">💃 Passista</option>
                                                        <option value="ritmista">🥁 Ritmista</option>
                                                    </select>
                                                </td>
                                                <td className="px-2 py-1">
                                                    <input
                                                        value={r.telefono}
                                                        onChange={(e) => updateRow(idx, 'telefono', e.target.value)}
                                                        className="w-24 px-1 py-0.5 border rounded text-xs"
                                                    />
                                                </td>
                                                <td className="px-2 py-1">
                                                    <input
                                                        value={r.instagram}
                                                        onChange={(e) => updateRow(idx, 'instagram', e.target.value)}
                                                        className="w-20 px-1 py-0.5 border rounded text-xs"
                                                    />
                                                </td>
                                                <td className="px-2 py-1">
                                                    {r.valido ? (
                                                        <span className="text-green-700 font-semibold">OK</span>
                                                    ) : (
                                                        <span className="text-red-600" title={r.motivo}>
                                                            ✕ {r.motivo}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

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
                </div>

                <div className="p-4 border-t bg-white flex flex-col-reverse sm:flex-row justify-end gap-2 sticky bottom-0">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="px-4 py-3 sm:py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                    >
                        Cerrar
                    </button>
                    <button
                        onClick={confirmar}
                        disabled={saving || preview.filter((r) => r.valido).length === 0}
                        className="px-4 py-3 sm:py-2 text-sm rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold"
                    >
                        {saving ? 'Importando…' : 'Confirmar e importar'}
                    </button>
                </div>
            </div>
        </div>
    );
}