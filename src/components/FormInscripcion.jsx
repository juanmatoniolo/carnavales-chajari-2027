// src/components/FormInscripcion.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { db } from '../firebase/firebase';
import { ref, get, push, set } from 'firebase/database';

const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const DIAS = Array.from({ length: 31 }, (_, i) => i + 1);
const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS = Array.from({ length: ANIO_ACTUAL - 1920 + 1 }, (_, i) => ANIO_ACTUAL - i);

const TIPOS_INTEGRANTE = [
    { value: 'passista', label: 'Passista', emoji: '💃', desc: 'Baila en el desfile' },
    { value: 'ritmista', label: 'Ritmista (batucada)', emoji: '🥁', desc: 'Toca en la batucada' },
];

function calcularEdad(y, m, d) {
    if (!y || !m || !d) return null;
    const today = new Date();
    let age = today.getFullYear() - y;
    const mdNow = (today.getMonth() + 1) * 100 + today.getDate();
    const mdBirth = m * 100 + d;
    if (mdNow < mdBirth) age--;
    return age >= 0 ? age : null;
}

export default function FormInscripcion({
    comparsaId,
    comparsaData,
    onSuccess,
    onCancel,
    compact = false,
    mode = 'public', // 'public' | 'admin'
}) {
    const isAdmin = mode === 'admin';

    const [apellido, setApellido] = useState('');
    const [nombre, setNombre] = useState('');
    const [dni, setDni] = useState('');
    const [dia, setDia] = useState('');
    const [mes, setMes] = useState('');
    const [anio, setAnio] = useState('');
    const [tipo, setTipo] = useState(''); // 'passista' | 'ritmista'
    const [telefono, setTelefono] = useState('');
    const [instagram, setInstagram] = useState('');

    const [aceptaTutor, setAceptaTutor] = useState(false);
    const [tutorNombre, setTutorNombre] = useState('');
    const [tutorApellido, setTutorApellido] = useState('');
    const [tutorTelefono, setTutorTelefono] = useState('');

    const [aceptaCompromiso, setAceptaCompromiso] = useState(false);

    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');

    const edad = useMemo(() => {
        return calcularEdad(Number(anio), Number(mes), Number(dia));
    }, [anio, mes, dia]);

    const esMenor12 = edad !== null && edad < 12;

    useEffect(() => {
        if (!esMenor12) {
            setAceptaTutor(false);
            setTutorNombre('');
            setTutorApellido('');
            setTutorTelefono('');
        }
    }, [esMenor12]);

    const resetForm = () => {
        setApellido('');
        setNombre('');
        setDni('');
        setDia('');
        setMes('');
        setAnio('');
        setTipo('');
        setTelefono('');
        setInstagram('');
        setAceptaTutor(false);
        setTutorNombre('');
        setTutorApellido('');
        setTutorTelefono('');
        setAceptaCompromiso(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMsg('');
        setError('');

        if (!apellido.trim() || !nombre.trim()) return setError('Completá apellido y nombre.');
        const dniLimpio = dni.replace(/\D/g, '');
        if (dniLimpio.length < 6) return setError('DNI inválido.');
        if (!dia || !mes || !anio) return setError('Completá la fecha de nacimiento.');
        if (edad === null || edad < 0 || edad > 110) return setError('Fecha de nacimiento inválida.');
        if (!tipo) return setError('Seleccioná si es Passista o Ritmista.');
        if (!telefono.trim()) return setError('Ingresá un teléfono de contacto.');

        if (esMenor12) {
            if (!aceptaTutor) return setError('Debés autorizar la participación del menor.');
            if (!tutorNombre.trim() || !tutorApellido.trim() || !tutorTelefono.trim()) {
                return setError('Completá los datos del tutor (madre/padre/responsable).');
            }
        }

        if (!isAdmin && !aceptaCompromiso) {
            return setError('Debés aceptar el compromiso de participar en las 4 noches.');
        }

        const fechaNacimiento = `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

        setSaving(true);
        try {
            const snap = await get(ref(db, `bailarines/${comparsaId}`));
            if (snap.exists()) {
                const data = snap.val();
                const dup = Object.values(data).some((b) => String(b.dni) === dniLimpio);
                if (dup) {
                    setError(`Ya hay un inscripto con el DNI ${dniLimpio} en ${comparsaData?.nombre || comparsaId}.`);
                    return;
                }
            }

            const payload = {
                apellido: apellido.trim(),
                nombre: nombre.trim(),
                nombreCompleto: `${apellido.trim()} ${nombre.trim()}`,
                dni: dniLimpio,
                fechaNacimiento,
                tipo, // 'passista' | 'ritmista'
                telefono: telefono.trim(),
                instagram: instagram.trim().replace(/^@/, ''),
                esMenor: esMenor12,
                tutor: esMenor12
                    ? {
                        apellido: tutorApellido.trim(),
                        nombre: tutorNombre.trim(),
                        telefono: tutorTelefono.trim(),
                    }
                    : null,
                createdAt: { epoch: Date.now(), iso: new Date().toISOString() },
            };

            const newRef = push(ref(db, `bailarines/${comparsaId}`));
            await set(newRef, payload);

            setMsg('✅ Inscripción registrada correctamente.');
            resetForm();

            if (typeof onSuccess === 'function') {
                onSuccess({ id: newRef.key, ...payload });
            }
        } catch (err) {
            console.error(err);
            setError('No se pudo guardar. Revisá la conexión.');
        } finally {
            setSaving(false);
        }
    };

    const inputCls =
        'w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-pink-500 outline-none text-base';
    const labelCls = 'block text-sm font-semibold text-gray-700 mb-1';

    return (
        <form onSubmit={handleSubmit} className={compact ? 'space-y-4' : 'space-y-5'}>
            {/* Apellido y Nombre */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className={labelCls}>Apellido</label>
                    <input
                        type="text"
                        value={apellido}
                        onChange={(e) => setApellido(e.target.value)}
                        placeholder="Pérez"
                        className={inputCls}
                        required
                    />
                </div>
                <div>
                    <label className={labelCls}>Nombre</label>
                    <input
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Juan"
                        className={inputCls}
                        required
                    />
                </div>
            </div>

            {/* DNI */}
            <div>
                <label className={labelCls}>DNI</label>
                <input
                    type="text"
                    inputMode="numeric"
                    value={dni}
                    onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                    placeholder="12345678"
                    className={inputCls}
                    required
                />
                <p className="text-xs text-gray-400 mt-1">
                    Se usa para identificar al integrante (no puede repetirse en la misma comparsa).
                </p>
            </div>

            {/* Fecha de nacimiento */}
            <div>
                <label className={labelCls}>Fecha de nacimiento</label>
                <div className="grid grid-cols-3 gap-2">
                    <select value={dia} onChange={(e) => setDia(e.target.value)} className={inputCls} required>
                        <option value="">Día</option>
                        {DIAS.map((d) => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                    <select value={mes} onChange={(e) => setMes(e.target.value)} className={inputCls} required>
                        <option value="">Mes</option>
                        {MESES.map((m, i) => (
                            <option key={m} value={i + 1}>{m}</option>
                        ))}
                    </select>
                    <select value={anio} onChange={(e) => setAnio(e.target.value)} className={inputCls} required>
                        <option value="">Año</option>
                        {ANIOS.map((a) => (
                            <option key={a} value={a}>{a}</option>
                        ))}
                    </select>
                </div>
                {edad !== null && (
                    <p className="text-xs text-gray-500 mt-1">
                        Edad: <b className="text-gray-700">{edad} años</b>
                        {esMenor12 && <span className="ml-2 text-amber-600">⚠️ Menor de 12 años</span>}
                    </p>
                )}
            </div>

            {/* 🆕 Tipo de integrante */}
            <div>
                <label className={labelCls}>Tipo de integrante</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {TIPOS_INTEGRANTE.map((t) => {
                        const active = tipo === t.value;
                        return (
                            <button
                                type="button"
                                key={t.value}
                                onClick={() => setTipo(t.value)}
                                className={`text-left px-4 py-3 rounded-lg border-2 transition ${active
                                    ? 'border-pink-500 bg-pink-50 ring-2 ring-pink-200'
                                    : 'border-gray-300 bg-white hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">{t.emoji}</span>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-sm text-gray-800">{t.label}</p>
                                        <p className="text-xs text-gray-500 truncate">{t.desc}</p>
                                    </div>
                                    {active && <span className="ml-auto text-pink-600 text-lg">✓</span>}
                                </div>
                            </button>
                        );
                    })}
                </div>
                {!tipo && (
                    <p className="text-xs text-gray-400 mt-1">
                        Elegí una opción para continuar.
                    </p>
                )}
            </div>

            {/* Teléfono */}
            <div>
                <label className={labelCls}>Teléfono de contacto</label>
                <input
                    type="tel"
                    inputMode="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="3456123456"
                    className={inputCls}
                    required
                />
            </div>

            {/* Instagram */}
            <div>
                <label className={labelCls}>
                    Usuario de Instagram <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">@</span>
                    <input
                        type="text"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value.replace(/^@/, ''))}
                        placeholder="usuario"
                        className={`${inputCls} pl-8`}
                    />
                </div>
            </div>

            {/* Menor de 12 años */}
            {esMenor12 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={aceptaTutor}
                            onChange={(e) => setAceptaTutor(e.target.checked)}
                            className="mt-1 w-5 h-5 accent-amber-600 shrink-0"
                        />
                        <span className="text-sm text-amber-900 leading-snug">
                            <b>Autorizo a mi hiji/a a participar</b> del Carnaval representando a la comparsa{' '}
                            <b>{comparsaData?.nombre || comparsaId}</b>.
                        </span>
                    </label>

                    {aceptaTutor && (
                        <div className="space-y-3 pt-2 border-t border-amber-200">
                            <p className="text-xs font-semibold text-amber-900">Datos del responsable</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    value={tutorApellido}
                                    onChange={(e) => setTutorApellido(e.target.value)}
                                    placeholder="Apellido del tutor"
                                    className={inputCls}
                                    required={esMenor12}
                                />
                                <input
                                    type="text"
                                    value={tutorNombre}
                                    onChange={(e) => setTutorNombre(e.target.value)}
                                    placeholder="Nombre del tutor"
                                    className={inputCls}
                                    required={esMenor12}
                                />
                            </div>
                            <input
                                type="tel"
                                inputMode="tel"
                                value={tutorTelefono}
                                onChange={(e) => setTutorTelefono(e.target.value)}
                                placeholder="Celular del tutor"
                                className={inputCls}
                                required={esMenor12}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Compromiso — solo en formulario público */}
            {!isAdmin && (
                <div className="bg-pink-50 border border-pink-200 rounded-xl p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={aceptaCompromiso}
                            onChange={(e) => setAceptaCompromiso(e.target.checked)}
                            className="mt-1 w-5 h-5 accent-pink-600 shrink-0"
                        />
                        <span className="text-sm text-pink-900 leading-snug">
                            Me comprometo a participar en las <b>4 noches del carnaval</b> representando a la
                            comparsa <b>{comparsaData?.nombre || comparsaId}</b> ({comparsaData?.club || ''}).
                        </span>
                    </label>
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

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={saving}
                        className="px-4 py-3 rounded-lg border border-gray-300 text-sm font-semibold hover:bg-gray-100 disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                )}
                <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-3 rounded-lg text-white font-bold shadow-lg transition disabled:opacity-60"
                    style={{ backgroundColor: comparsaData?.color || '#ec4899' }}
                >
                    {saving ? 'Guardando…' : 'Inscribir'}
                </button>
            </div>
        </form>
    );
}