import React, { useState } from 'react';
import { Truck, CalendarDays, ArrowRight, Sun, Sunset } from 'lucide-react';
import PanelCard from './PanelCard';
import { Badge, Field, KV } from '../ui';
import { TECHNICIANS, SHIFTS, isBusinessDay, nextBusinessDays, formatDate, formatDateTime } from '../../lib/workflow';
import { apiFetch } from '../../lib/api';

export default function Stage4Panel({ request, readOnly, applyChange, toast }) {
  const suggestions = nextBusinessDays(5);
  const [d, setD] = useState({
    date: request.delivery.date || suggestions[0],
    shift: request.delivery.shift || 'AM',
    technician: request.delivery.technician || TECHNICIANS[0],
    address: request.delivery.address || request.business.address,
    notes: request.delivery.notes || '',
    shipped: false,
  });
  const [touched, setTouched] = useState(false);

  const dateError = !d.date ? 'Selecciona una fecha' : !isBusinessDay(d.date) ? 'Solo se permiten días hábiles (lunes a viernes)' : null;
  const valid = !dateError && d.address.trim() && d.technician && d.shipped;

  const submit = async () => {
    setTouched(true);
    if (!valid) return;

    try {
      const backendIdMatch = request.id.match(/^REQ-B(\d+)$/);
      if (backendIdMatch) {
        const backendId = parseInt(backendIdMatch[1], 10);
        const resTerminales = await apiFetch(`/api/terminales`);
        const terminales = await resTerminales.json();
        const miTerminal = terminales.find(t => t.afiliado && t.afiliado.solicitud && t.afiliado.solicitud.id === backendId);

        if (miTerminal) {
          await apiFetch(`/api/ordenes-despacho`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fechaHabil: d.date,
              jornada: d.shift,
              terminal: { id: miTerminal.id }
            })
          });
        }
      }
    } catch (e) {
      console.error("Error sincronizando Etapa 4:", e);
    }

    const delivery = { date: d.date, shift: d.shift, technician: d.technician, address: d.address, notes: d.notes };
    applyChange(request.id, (r) => ({ ...r, stage: 5, delivery: { ...delivery, dispatchedAt: new Date().toISOString() } }), {
      action: `Visita programada para ${formatDate(d.date)} (${d.shift}) y POS despachado`,
      stage: 4,
      notify: { stage: 5, message: `Visita asignada a ${d.technician} para ${formatDate(d.date)} (${d.shift}): ${request.business.name}` },
    });
    toast('Entrega programada', `${formatDate(d.date)} · jornada ${d.shift}`);
  };

  if (readOnly) {
    return (
      <PanelCard title="Entrega" subtitle="Visita programada y POS despachado" icon={Truck} readOnly>
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KV label="Fecha de visita">{formatDate(request.delivery.date)}</KV>
          <KV label="Jornada">{SHIFTS[request.delivery.shift]}</KV>
          <KV label="Técnico">{request.delivery.technician}</KV>
          <KV label="Despachado">{formatDateTime(request.delivery.dispatchedAt)}</KV>
          <div className="col-span-2 md:col-span-4"><KV label="Dirección">{request.delivery.address}</KV></div>
        </dl>
      </PanelCard>
    );
  }

  return (
    <PanelCard
      title="Programar visita y envío del POS"
      subtitle="La visita se programa en días hábiles, en jornada AM o PM"
      icon={Truck}
      badge={<Badge tone="cyan">En entrega</Badge>}
      footerNote="El técnico asignado recibirá la notificación de la visita."
      footer={<button onClick={submit} className="btn-primary">Programar y despachar <ArrowRight className="h-4 w-4" /></button>}
    >
      <div className="space-y-5">
        <div>
          <p className="section-title mb-2">Fecha de visita</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((ymd) => {
              const dt = new Date(`${ymd}T12:00:00`);
              const active = d.date === ymd;
              return (
                <button
                  key={ymd}
                  onClick={() => setD({ ...d, date: ymd })}
                  className={`w-20 rounded-lg border px-2 py-2 text-center transition ${active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <span className={`block text-[10px] font-medium uppercase ${active ? 'text-slate-300' : 'text-slate-500'}`}>{dt.toLocaleDateString('es-GT', { weekday: 'short' })}</span>
                  <span className="block text-lg font-semibold leading-tight">{dt.getDate()}</span>
                  <span className={`block text-[10px] ${active ? 'text-slate-300' : 'text-slate-500'}`}>{dt.toLocaleDateString('es-GT', { month: 'short' })}</span>
                </button>
              );
            })}
            <div className="flex min-w-44 flex-col justify-center">
              <label className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="date" value={d.date} min={suggestions[0]} onChange={(e) => setD({ ...d, date: e.target.value })} className={`input pl-9 ${dateError ? 'input-error' : ''}`} />
              </label>
            </div>
          </div>
          {dateError ? <p className="error">{dateError}</p> : <p className="help">{formatDate(d.date)}</p>}
        </div>

        <div>
          <p className="section-title mb-2">Jornada</p>
          <div className="grid grid-cols-2 gap-3 sm:max-w-md">
            {[['AM', Sun], ['PM', Sunset]].map(([k, Icon]) => (
              <button
                key={k}
                onClick={() => setD({ ...d, shift: k })}
                className={`flex items-center gap-3 rounded-lg border px-3.5 py-3 text-left transition ${d.shift === k ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <Icon className={`h-4 w-4 ${d.shift === k ? 'text-brand-600' : 'text-slate-400'}`} />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">Jornada {k}</span>
                  <span className="block text-[11px] text-slate-500">{SHIFTS[k].split('· ')[1]}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Técnico asignado" required>
            <select value={d.technician} onChange={(e) => setD({ ...d, technician: e.target.value })} className="input">
              {TECHNICIANS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Dirección de entrega" required className="md:col-span-2" error={touched && !d.address.trim() ? 'Requerida' : null} help="Hogar o empresa del cliente">
            <input value={d.address} onChange={(e) => setD({ ...d, address: e.target.value })} className="input" />
          </Field>
          <Field label="Indicaciones para el técnico" className="md:col-span-3">
            <input value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} className="input" placeholder="Ej. Llamar 30 minutos antes, preguntar por recepción" />
          </Field>
        </div>

        <label className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-3 ${touched && !d.shipped ? 'border-red-300 bg-red-50/50' : 'border-slate-200'}`}>
          <input type="checkbox" checked={d.shipped} onChange={(e) => setD({ ...d, shipped: e.target.checked })} className="mt-0.5 h-4 w-4 accent-brand-600" />
          <span>
            <span className="block text-sm font-medium text-slate-900">POS empacado y enviado al cliente</span>
            <span className="block text-[11px] text-slate-500">Confirma que la terminal salió hacia la dirección indicada.</span>
          </span>
        </label>
      </div>
    </PanelCard>
  );
}
