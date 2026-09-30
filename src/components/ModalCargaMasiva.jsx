// src/components/ModalCargaMasiva.jsx
'use client';

import { useState } from 'react';
import { db } from '../firebase/firebase';
import { ref, get, push, update } from 'firebase/database';

const YMD_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const DMY_RE = /^(0?[1-9]|[12]\d|3[01])[\/\-](0?[1-9]|1[0-2])[\/\-](\d{4})$/;
const pad2 = (n) => String(n).padStart(2, '0');

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

function stamp() {
    return { epoch: Date.now(), iso: new Date().toISOString() };
}

export default function ModalCargaMasiva({ comparsaId, comparsaData, onClose, onDone }) {
    const [tab, setTab] = useState('excel');
    const [pasted, setPasted] = useState('');
    const [preview, setPreview] = useState([]);
    const [fileName, setFileName] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');

    // ------------------------------------------------------
    // Descargar plantilla con ejemplo
    // ------------------------------------------------------
    const descargarPlantilla = async () => {
        try {
            const XLSX = await import('xlsx');
            const data = [
                {
                    apellido: 'Pérez',
                    nombre: 'Juan',
                    dni: '40123456',
                    fechaNacimiento: '21/05/1995',
                    telefono: '3456123456',
                    instagram: 'juanp',
                },
                {
                    apellido: 'Gómez',
                    nombre: 'Ana',
                    dni: '35234567',
                    fechaNacimiento: '01/12/1992',
                    telefono: '3456987654',
                    instagram: 'anag',
                },
            ];
            const ws = XLSX.utils.json_to_sheet(data, {
                header: ['apellido', 'nombre', 'dni', 'fechaNacimiento', 'telefono', 'instagram'],
            });
            ws['!cols'] = [
                { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 16 }, { wch: 15 }, { wch: 15 },
            ];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Integrantes');
            XLSX.writeFile(wb, `plantilla_${comparsaId}.xlsx`);
        } catch (err) {
            console.error(err);
            setError('No se pudo generar la plantilla.');
        }
    };

    // ------------------------------------------------------
    // Parser (Excel y pegado)
    // ------------------------------------------------------
    const buildRow = (obj, i) => {
        const apellido = String(obj.apellido || '').trim();
        const nombre = String(obj.nombre || '').trim();
        const dni = String(obj.dni || '').replace(/\D/g, '');
        const fechaRaw = obj.fechaRaw ?? '';
        const telefono = String(obj.telefono || '').trim();
        const instagram = String(obj.instagram || '').trim().replace(/^@/, '');
        const fecha = normalizeDate(fechaRaw);

        const valido = !!(apellido && nombre && dni.length >= 6 && YMD_RE.test(fecha));
        let motivo = '';
        if (!apellido || !nombre) motivo = 'Falta apellido/nombre';
        else if (dni.length < 6) motivo = 'DNI inválido';
        else if (!YMD_RE.test(fecha)) motivo = 'Fecha inválida';

        return {
            row: i + 1,
            apellido,
            nombre,
            dni,
            fechaRaw: String(fechaRaw ?? ''),
            _fecha: fecha,
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
                    telefono: get(idxTel, 4),
                    instagram: get(idxIg, 5),
                },
                i
            );
        });
    };

    const onPastePreview = () => {
        setError('');
        setMsg('');
        const rows = parsePasted(pasted);
        setPreview(rows);
        if (rows.length === 0) setError('No se detectaron filas.');
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
                        telefono: nk.telefono || nk.celular || nk.tel || '',
                        instagram: nk.instagram || nk.ig || '',
                    },
                    idx
                );
            });
            setPreview(rows);
            if (rows.length === 0) setError('El Excel no tiene filas.');
        } catch (err) {
            console.error(err);
            setError('No se pudo leer el Excel.');
        }
    };

    const updateRow = (idx, field, value) => {
        setPreview((prev) => {
            const next = [...prev];
            const r = { ...next[idx], [field]: field === 'dni' ? String(value).replace(/\D/g, '') : value };
            const fecha = normalizeDate(r.fechaRaw);
            const valido = !!(r.apellido && r.nombre && r.dni.length >= 6 && YMD_RE.test(fecha));
            let motivo = '';
            if (!r.apellido || !r.nombre) motivo = 'Falta apellido/nombre';
            else if (r.dni.length < 6) motivo = 'DNI inválido';
            else if (!YMD_RE.test(fecha)) motivo = 'Fecha inválida';
            next[idx] = { ...r, _fecha: fecha, valido, motivo };
            return next;
        });
    };

    // ------------------------------------------------------
    // Confirmar importación
    // ------------------------------------------------------
    const confirmar = async () => {
        setError('');
        setMsg('');
        const validas = preview.filter((r) => r.valido);
        if (validas.length === 0) return setError('No hay filas válidas.');

        setSaving(true);
        try {
            // 1) Duplicados dentro del archivo
            const dnis = validas.map((v) => v.dni);
            const dupInterno = dnis.find((d, i) => dnis.indexOf(d) !== i);
            if (dupInterno) {
                setError(`DNI duplicado dentro del archivo: ${dupInterno}`);
                setSaving(false);
                return;
            }

            // 2) Duplicados contra la DB
            const snap = await get(ref(db, `bailarines/${comparsaId}`));
            const existentes = new Set();
            if (snap.exists()) {
                Object.values(snap.val()).forEach((b) => existentes.add(String(b.dni)));
            }
            const yaExisten = validas.filter((v) => existentes.has(v.dni));
            if (yaExisten.length > 0) {
                setError(
                    `Estos DNI ya están cargados en ${comparsaData?.nombre || comparsaId}: ${yaExisten
                        .map((v) => v.dni)
                        .join(', ')}`
                );
                setSaving(false);
                return;
            }

            // 3) Guardar
            const updates = {};
            validas.forEach((r) => {
                const newRef = push(ref(db, `bailarines/${comparsaId}`));
                updates[`bailarines/${comparsaId}/${newRef.key}`] = {
                    apellido: r.apellido,
                    nombre: r.nombre,
                    nombreCompleto: `${r.apellido} ${r.nombre}`,
                    dni: r.dni,
                    fechaNacimiento: r._fecha,
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
                {/* Header */}
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

                {/* Body scrolleable */}
                <div className="p-4 overflow-y-auto flex-1 space-y-4">
                    {/* Tabs */}
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

                    {/* Tab Excel */}
                    {tab === 'excel' && (
                        <div className="space-y-3">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-xs text-blue-900 leading-relaxed">
                                    <b>Columnas:</b>{' '}
                                    <code className="bg-white/70 px-1 rounded">apellido</code>,{' '}
                                    <code className="bg-white/70 px-1 rounded">nombre</code>,{' '}
                                    <code className="bg-white/70 px-1 rounded">dni</code>,{' '}
                                    <code className="bg-white/70 px-1 rounded">fechaNacimiento</code>,{' '}
                                    <code className="bg-white/70 px-1 rounded">telefono</code>,{' '}
                                    <code className="bg-white/70 px-1 rounded">instagram</code>.
                                    <br />
                                    <b>Fecha:</b> <b>dd/mm/aaaa</b> o <b>yyyy-mm-dd</b>.
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

                    {/* Tab Pegar */}
                    {tab === 'pegar' && (
                        <div className="space-y-3">
                            <textarea
                                rows={6}
                                value={pasted}
                                onChange={(e) => setPasted(e.target.value)}
                                placeholder={`apellido,nombre,dni,fechaNacimiento,telefono,instagram
Pérez,Juan,12345678,21/05/1990,3456111111,juanp
Gómez,Ana,34566789,01/12/1992,3456222222,anag`}
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

                    {/* Preview */}
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
                                            <th className="px-2 py-1 text-left">Teléfono</th>
                                            <th className="px-2 py-1 text-left">IG</th>
                                            <th className="px-2 py-1 text-left">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.map((r, idx) => (
                                            <tr key={r.row} className="border-t">
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
                                                        className="w-20 px-1 py-0.5 border rounded text-xs"
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
                                                        <span className="text-red-600" title={r.motivo}>✕</span>
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

                {/* Footer sticky */}
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