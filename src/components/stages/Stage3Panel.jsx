import React, { useState } from 'react';
import { Cpu, CheckCircle2, Circle, ArrowRight, Wand2, Info } from 'lucide-react';
import PanelCard from './PanelCard';
import { Badge, Callout, Field } from '../ui';
import { SALE_TYPES, SYSTEMS, getHardware } from '../../lib/workflow';
import { apiFetch } from '../../lib/api';

const pad = (n, len) => String(n).padStart(len, '0');

function validate(system, p, types, hardware) {
  const errors = {};
  if (system === 'vhq') {
    if (!p.vhq.serial.trim()) errors.serial = 'Ingresa la serie del POS';
    types.forEach((t) => { if (!/^VG\d{6}$/.test(p.vhq.terminals[t.key] || '')) errors[t.key] = 'Formato VG000000'; });
  }
  if (system === 'as400') {
    if (!p.as400.serial.trim()) errors.serial = 'Ingresa el ID de la serie';
  }
  if (system === 'mipos') {
    types.forEach((t) => { if (!/^MPG\d{5}$/.test(p.mipos.terminals[t.key] || '')) errors[t.key] = 'Formato MPG00000'; });
    if (!p.mipos.contactName.trim()) errors.contactName = 'Requerido';
    if (!/^\S+@\S+\.\S+$/.test(p.mipos.email)) errors.email = 'Correo inválido';
    if (!p.mipos.phone.trim()) errors.phone = 'Requerido';
    if (hardware !== 'hit' && !/^MPOS\d{10}$/.test(p.mipos.readerId || '')) errors.readerId = 'Formato MPOS + 10 dígitos';
  }
  if (system === 'csp') {
    if (!/^\d{9}$/.test(p.csp.binFrom)) errors.binFrom = '9 dígitos';
    if (!/^\d{9}$/.test(p.csp.binTo)) errors.binTo = '9 dígitos';
    if (!errors.binFrom && !errors.binTo && Number(p.csp.binFrom) > Number(p.csp.binTo)) errors.binTo = 'Debe ser ≥ inicio';
    if (!/^\d{4}$/.test(p.csp.closingTime)) errors.closingTime = 'HHMM';
  }
  return errors;
}

export default function Stage3Panel({ request, readOnly, applyChange, toast }) {
  const hw = getHardware(request.hardware);
  const types = SALE_TYPES.filter((t) => request.saleTypes.includes(t.key));
  const [p, setP] = useState(() => {
    const base = structuredClone(request.programming);
    // Prellenar contacto Mipos con los datos del cliente
    if (!base.mipos.contactName) base.mipos.contactName = `${request.customer.firstName} ${request.customer.lastName}`;
    if (!base.mipos.email) base.mipos.email = request.customer.email;
    if (!base.mipos.phone) base.mipos.phone = request.customer.phone;
    return base;
  });
  const [active, setActive] = useState(hw.systems.find((s) => !request.programming[s].done) || hw.systems[0]);
  const [errors, setErrors] = useState({});

  const set = (sys, field, value) => setP((prev) => ({ ...prev, [sys]: { ...prev[sys], [field]: value, done: false } }));
  const setTerminal = (sys, key, value) => setP((prev) => ({ ...prev, [sys]: { ...prev[sys], terminals: { ...prev[sys].terminals, [key]: value.toUpperCase() }, done: false } }));

  const autofill = () => {
    const seed = Math.floor(1000 + Math.random() * 8999);
    setP((prev) => {
      const next = structuredClone(prev);
      if (active === 'vhq') {
        if (!next.vhq.serial) next.vhq.serial = `VG0${seed} - 1355664877${pad(seed, 4)}`;
        types.forEach((t) => { if (!next.vhq.terminals[t.key]) next.vhq.terminals[t.key] = `VG${pad(seed % 1000, 3)}${pad(t.vhqSuffix, 3)}`; });
      }
      if (active === 'as400' && !next.as400.serial) {
        next.as400.serial = next.vhq.serial ? next.vhq.serial.split(' - ')[0] : next.mipos.terminals[types[0].key] || `VG0${seed}`;
      }
      if (active === 'mipos') {
        types.forEach((t, i) => { if (!next.mipos.terminals[t.key]) next.mipos.terminals[t.key] = `MPG${pad(seed * 10 + i, 5).slice(-5)}`; });
        if (request.hardware !== 'hit' && !next.mipos.readerId) next.mipos.readerId = `MPOS2021${pad(seed, 6)}`;
      }
      if (active === 'csp') {
        if (!next.csp.binFrom) next.csp.binFrom = '400000000';
        if (!next.csp.binTo) next.csp.binTo = '499999999';
      }
      return next;
    });
    setErrors({});
  };

  const register = () => {
    const errs = validate(active, p, types, request.hardware);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const next = { ...p, [active]: { ...p[active], done: true } };
    setP(next);
    applyChange(request.id, (r) => ({ ...r, programming: next }), { action: `Alta registrada en ${SYSTEMS[active].name}`, stage: 3 });
    toast(`${SYSTEMS[active].name} registrado`, request.id);
    const pending = hw.systems.find((s) => !next[s].done);
    if (pending) setActive(pending);
  };

  const allDone = hw.systems.every((s) => p[s].done);

  const finish = async () => {
    try {
      const backendIdMatch = request.id.match(/^REQ-B(\d+)$/);
      if (backendIdMatch) {
        const backendId = backendIdMatch[1];
        const serial = p.vhq?.serial || p.as400?.serial || p.mipos?.readerId || "SN-12345";
        const tid = (p.vhq?.terminals && Object.values(p.vhq.terminals)[0]) || 
                    (p.mipos?.terminals && Object.values(p.mipos.terminals)[0]) || "TID-001";

        const resAfiliados = await apiFetch(`/api/afiliados`);
        const afiliados = await resAfiliados.json();
        const miAfiliado = afiliados.find(a => a.solicitud && a.solicitud.id === parseInt(backendId, 10));

        if (miAfiliado) {
          await apiFetch(`/api/terminales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              numeroSerie: serial,
              tid: tid,
              tipoConexion: "IP", // Asumido
              sistemaSubyacente: hw.systems.join(','),
              afiliado: { id: miAfiliado.id }
            })
          });
        }
      }
    } catch (e) {
      console.error("Error sincronizando Etapa 3 con Backend:", e);
    }

    applyChange(request.id, (r) => ({ ...r, stage: 4, programming: p }), {
      action: `Programación completada (${hw.systems.map((s) => SYSTEMS[s].name).join(', ')})`,
      stage: 3,
      notify: { stage: 4, message: `POS programado, listo para coordinar entrega: ${request.business.name}` },
    });
    toast('Programación completada', 'La gestión pasó a Entrega (etapa 4)');
  };

  const sys = SYSTEMS[active];
  const err = (k) => (errors[k] ? <p className="error">{errors[k]}</p> : null);
  const ro = readOnly;

  return (
    <PanelCard
      title="Programación del POS"
      subtitle={`Terminal ${hw.label}: se configura en ${hw.systems.map((s) => SYSTEMS[s].name).join(' → ')}`}
      icon={Cpu}
      readOnly={ro}
      badge={!ro && <Badge tone="violet">En proceso</Badge>}
      footerNote={!ro && (allDone ? 'Todos los sistemas están registrados. Puedes enviar el POS a entrega.' : `${hw.systems.filter((s) => p[s].done).length} de ${hw.systems.length} sistemas registrados.`)}
      footer={!ro && (
        <button onClick={finish} disabled={!allDone} className="btn-primary">
          Finalizar y enviar a entrega <ArrowRight className="h-4 w-4" />
        </button>
      )}
    >
      <div className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
        {/* Navegación de sistemas */}
        <nav className="space-y-1.5">
          {hw.systems.map((key, i) => {
            const s = SYSTEMS[key];
            const done = p[key].done;
            return (
              <button
                key={key}
                onClick={() => { setActive(key); setErrors({}); }}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ${active === key ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                {done ? <CheckCircle2 className={`h-4 w-4 shrink-0 ${active === key ? 'text-emerald-400' : 'text-emerald-600'}`} /> : <Circle className="h-4 w-4 shrink-0 text-slate-400" />}
                <span className="min-w-0">
                  <span className="block text-xs font-semibold">{i + 1}. {s.name}</span>
                  <span className={`block text-[10px] ${active === key ? 'text-slate-300' : 'text-slate-500'}`}>{s.kind} · {s.protocol}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Formulario del sistema activo */}
        <div className="min-w-0 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{sys.name}</p>
              <p className="text-[11px] text-slate-500">{sys.description}</p>
            </div>
            {p[active].done ? <Badge tone="emerald" dot>Registrado</Badge> : !ro && (
              <button onClick={autofill} className="btn-ghost btn-sm"><Wand2 className="h-3.5 w-3.5" /> Autocompletar</button>
            )}
          </div>

          <div className="space-y-4 p-4">
            {active === 'vhq' && (
              <>
                <Field label="ID serie del POS" required help="Modelo y número de serie, ej. VG04566 - 13556648778987">
                  <input disabled={ro} value={p.vhq.serial} onChange={(e) => set('vhq', 'serial', e.target.value.toUpperCase())} className={`input font-mono ${errors.serial ? 'input-error' : ''}`} placeholder="VG04566 - 13556648778987" />
                  {err('serial')}
                </Field>
                <SaleTable
                  types={types}
                  request={request}
                  columns={['Tipo de venta', 'Afiliado (etapa 2)', 'ID terminal VHQ']}
                  render={(t) => (
                    <>
                      <input disabled={ro} value={p.vhq.terminals[t.key]} onChange={(e) => setTerminal('vhq', t.key, e.target.value)} className={`input h-8 font-mono ${errors[t.key] ? 'input-error' : ''}`} placeholder={`VG00000${t.vhqSuffix}`} />
                      {err(t.key)}
                    </>
                  )}
                />
              </>
            )}

            {active === 'as400' && (
              <>
                <Field label="ID de la serie" required help="Serie con la que se da de alta el POS en AS400">
                  <input disabled={ro} value={p.as400.serial} onChange={(e) => set('as400', 'serial', e.target.value.toUpperCase())} className={`input font-mono ${errors.serial ? 'input-error' : ''}`} placeholder="VG04566" />
                  {err('serial')}
                </Field>
                <SaleTable
                  types={types}
                  request={request}
                  columns={['Tipo de venta', 'Afiliado (etapa 2)', 'Código AS400']}
                  render={(t) => <span className="inline-flex rounded-md bg-slate-900 px-2 py-1 font-mono text-xs font-semibold text-white">{t.as400}</span>}
                />
              </>
            )}

            {active === 'mipos' && (
              <>
                {request.hardware === 'hit' && (
                  <Callout tone="blue" icon={Info}>Terminal HIT: se configura igual que Mipos pero <strong>sin lector</strong>.</Callout>
                )}
                <SaleTable
                  types={types}
                  request={request}
                  columns={['Tipo de venta', 'Afiliado (etapa 2)', 'ID terminal']}
                  render={(t) => (
                    <>
                      <input disabled={ro} value={p.mipos.terminals[t.key]} onChange={(e) => setTerminal('mipos', t.key, e.target.value)} className={`input h-8 font-mono ${errors[t.key] ? 'input-error' : ''}`} placeholder="MPG03225" />
                      {err(t.key)}
                    </>
                  )}
                  note="Una terminal por cada tipo de transacción."
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Nombre" required error={errors.contactName}>
                    <input disabled={ro} value={p.mipos.contactName} onChange={(e) => set('mipos', 'contactName', e.target.value)} className="input" />
                  </Field>
                  <Field label="Correo" required error={errors.email}>
                    <input disabled={ro} value={p.mipos.email} onChange={(e) => set('mipos', 'email', e.target.value)} className="input" />
                  </Field>
                  <Field label="Teléfono" required error={errors.phone}>
                    <input disabled={ro} value={p.mipos.phone} onChange={(e) => set('mipos', 'phone', e.target.value)} className="input" />
                  </Field>
                </div>
                {request.hardware !== 'hit' && (
                  <Field label="Lector ID" required error={errors.readerId} help={`Enlazado al correo ${p.mipos.email || '—'}`}>
                    <input disabled={ro} value={p.mipos.readerId} onChange={(e) => set('mipos', 'readerId', e.target.value.toUpperCase())} className="input font-mono" placeholder="MPOS2021124578" />
                  </Field>
                )}
              </>
            )}

            {active === 'csp' && (
              <>
                <div className="grid gap-3 sm:grid-cols-4">
                  <Field label="Nombre">
                    <input readOnly value={request.business.name} className="input" />
                  </Field>
                  <Field label="Moneda" required>
                    <select disabled={ro} value={p.csp.currency} onChange={(e) => set('csp', 'currency', e.target.value)} className="input">
                      <option value="GTQ">GTQ · Quetzal</option>
                      <option value="USD">USD · Dólar</option>
                    </select>
                  </Field>
                  <Field label="Tipo de transacción">
                    <input readOnly value={p.csp.transactionType} className="input font-mono" />
                  </Field>
                  <Field label="Hora de cierre" required error={errors.closingTime} help="Formato HHMM">
                    <input disabled={ro} value={p.csp.closingTime} maxLength={4} onChange={(e) => set('csp', 'closingTime', e.target.value.replace(/\D/g, ''))} className="input font-mono" />
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Ranqueo de bines · desde" required error={errors.binFrom}>
                    <input disabled={ro} value={p.csp.binFrom} maxLength={9} onChange={(e) => set('csp', 'binFrom', e.target.value.replace(/\D/g, ''))} className="input font-mono" placeholder="999999999" />
                  </Field>
                  <Field label="Ranqueo de bines · hasta" required error={errors.binTo}>
                    <input disabled={ro} value={p.csp.binTo} maxLength={9} onChange={(e) => set('csp', 'binTo', e.target.value.replace(/\D/g, ''))} className="input font-mono" placeholder="999999999" />
                  </Field>
                </div>
                <SaleTable
                  types={types}
                  request={request}
                  columns={['Tipo de venta', 'ID venta (afiliado)', 'Terminal · modo de lectura']}
                  render={(t) => (
                    <span className="text-xs text-slate-700">
                      <span className="font-mono">{p.mipos.terminals[t.key] || '—'}</span>
                      <span className="ml-2 rounded-md bg-slate-100 px-1.5 py-0.5 font-medium">{t.entryMode}</span>
                    </span>
                  )}
                  note="Sin contacto para venta normal, con chip para cuotas y banda para puntos."
                />
              </>
            )}
          </div>

          {!ro && (
            <div className="flex justify-end border-t border-slate-100 px-4 py-3">
              <button onClick={register} disabled={p[active].done} className="btn-dark btn-sm">
                <CheckCircle2 className="h-3.5 w-3.5" /> {p[active].done ? 'Registrado' : `Registrar alta en ${sys.name}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </PanelCard>
  );
}

function SaleTable({ types, request, columns, render, note }) {
  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="table">
          <thead>
            <tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.key}>
                <td className="font-medium text-slate-800">{t.label}</td>
                <td className="font-mono text-xs text-slate-700">{request.affiliates[t.key] || '—'}</td>
                <td className="w-1/2">{render(t)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && <p className="help">{note}</p>}
    </div>
  );
}
