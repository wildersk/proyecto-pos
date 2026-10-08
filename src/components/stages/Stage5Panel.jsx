import React, { useState } from 'react';
import { CheckCircle2, MapPin, CalendarDays, User, BadgeCheck } from 'lucide-react';
import PanelCard from './PanelCard';
import { Badge, Field, KV } from '../ui';
import { SALE_TYPES, SHIFTS, getHardware, formatDate, formatDateTime } from '../../lib/workflow';
import { apiFetch } from '../../lib/api';

const CONNECTION = { inalambrico: 'Señal celular / GPRS verificada', ip: 'Conexión LAN verificada', mipos: 'Lector enlazado por Bluetooth al correo registrado', hit: 'Conexión al host verificada' };

export default function Stage5Panel({ request, readOnly, actor, applyChange, toast }) {
  const types = SALE_TYPES.filter((t) => request.saleTypes.includes(t.key));
  const items = [
    { id: 'installed', label: 'Terminal instalada y encendida en el comercio' },
    { id: 'connection', label: CONNECTION[request.hardware] },
    ...types.map((t) => ({ id: `test-${t.key}`, label: `Transacción de prueba aprobada · ${t.label} (${t.entryMode.toLowerCase()})` })),
    { id: 'training', label: 'Capacitación básica al personal del comercio' },
  ];
  const [checks, setChecks] = useState({});
  const [receivedBy, setReceivedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [touched, setTouched] = useState(false);

  const allChecked = items.every((i) => checks[i.id]);
  const valid = allChecked && receivedBy.trim();

  const confirm = async () => {
    setTouched(true);
    if (!valid) return;

    try {
      const backendIdMatch = request.id.match(/^REQ-B(\d+)$/);
      if (backendIdMatch) {
        const backendId = parseInt(backendIdMatch[1], 10);
        const resOrdenes = await apiFetch(`/api/ordenes-despacho`);
        const ordenes = await resOrdenes.json();
        const miOrden = ordenes.find(o => o.terminal && o.terminal.afiliado && o.terminal.afiliado.solicitud && o.terminal.afiliado.solicitud.id === backendId);

        if (miOrden) {
          await apiFetch(`/api/ordenes-despacho/${miOrden.id}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'text/plain' },
            body: 'Confirmacion de Instalacion'
          });
        }
      }
    } catch (e) {
      console.error("Error sincronizando Etapa 5:", e);
    }

    applyChange(
      request.id,
      (r) => ({ ...r, completed: true, installation: { confirmedAt: new Date().toISOString(), receivedBy: receivedBy.trim(), notes, by: actor } }),
      { action: 'Instalación confirmada — gestión cerrada', stage: 5 },
    );
    toast('Instalación confirmada', `${request.id} quedó en estado Instalado`);
  };

  const visit = (
    <div className="grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-3">
      <span className="flex items-start gap-2 text-xs"><CalendarDays className="mt-0.5 h-4 w-4 text-slate-400" /><span><span className="kv-label block">Visita</span><span className="font-medium text-slate-900">{formatDate(request.delivery.date)} · {SHIFTS[request.delivery.shift]}</span></span></span>
      <span className="flex items-start gap-2 text-xs"><User className="mt-0.5 h-4 w-4 text-slate-400" /><span><span className="kv-label block">Técnico</span><span className="font-medium text-slate-900">{request.delivery.technician}</span></span></span>
      <span className="flex items-start gap-2 text-xs"><MapPin className="mt-0.5 h-4 w-4 text-slate-400" /><span><span className="kv-label block">Dirección</span><span className="font-medium text-slate-900">{request.delivery.address}</span></span></span>
      {request.delivery.notes && <p className="text-[11px] text-slate-500 sm:col-span-3">Indicaciones: {request.delivery.notes}</p>}
    </div>
  );

  if (request.completed) {
    return (
      <PanelCard title="Instalación completada" subtitle="El flujo de la gestión está cerrado" icon={BadgeCheck} badge={<Badge tone="emerald" dot>Instalado</Badge>}>
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">POS instalado y funcionando</p>
              <p className="text-xs text-emerald-800">Confirmado por {request.installation?.by} el {formatDateTime(request.installation?.confirmedAt)}</p>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-4">
            <KV label="Recibido por">{request.installation?.receivedBy}</KV>
            <KV label="Terminal">{getHardware(request.hardware)?.label}</KV>
            {request.installation?.notes && <div className="col-span-2"><KV label="Observaciones">{request.installation.notes}</KV></div>}
          </dl>
        </div>
      </PanelCard>
    );
  }

  return (
    <PanelCard
      title="Confirmación de instalación"
      subtitle="El técnico confirma la instalación exitosa en el comercio"
      icon={CheckCircle2}
      readOnly={readOnly}
      badge={<Badge tone="emerald">Pendiente de instalación</Badge>}
      footerNote={!readOnly && `${items.filter((i) => checks[i.id]).length} de ${items.length} verificaciones completadas.`}
      footer={!readOnly && <button onClick={confirm} className="btn-success"><CheckCircle2 className="h-4 w-4" /> Confirmar instalación</button>}
    >
      <div className="space-y-5">
        {visit}
        <div>
          <p className="section-title mb-2">Verificaciones en sitio</p>
          <div className={`divide-y divide-slate-100 rounded-lg border ${touched && !allChecked ? 'border-red-300' : 'border-slate-200'}`}>
            {items.map((it) => (
              <label key={it.id} className="flex cursor-pointer items-center gap-3 px-3.5 py-2.5 hover:bg-slate-50">
                <input type="checkbox" disabled={readOnly} checked={!!checks[it.id]} onChange={(e) => setChecks({ ...checks, [it.id]: e.target.checked })} className="h-4 w-4 accent-emerald-600" />
                <span className="text-sm text-slate-800">{it.label}</span>
              </label>
            ))}
          </div>
          {touched && !allChecked && <p className="error">Completa todas las verificaciones antes de confirmar.</p>}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Recibido por" required error={touched && !receivedBy.trim() ? 'Indica quién recibe el POS' : null}>
            <input disabled={readOnly} value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} className="input" placeholder="Nombre de quien recibe en el comercio" />
          </Field>
          <Field label="Observaciones">
            <input disabled={readOnly} value={notes} onChange={(e) => setNotes(e.target.value)} className="input" placeholder="Opcional" />
          </Field>
        </div>
      </div>
    </PanelCard>
  );
}
