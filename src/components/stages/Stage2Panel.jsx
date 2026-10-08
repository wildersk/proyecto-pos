import React, { useState } from 'react';
import { ShieldCheck, Check, X, Wand2, Undo2, ArrowRight } from 'lucide-react';
import PanelCard from './PanelCard';
import { DocumentRow } from './Stage1Panel';
import { Badge, Callout, Field, KV } from '../ui';
import { SALE_TYPES, isValidAffiliate, randomDigits, formatDateTime } from '../../lib/workflow';
import { apiFetch } from '../../lib/api';

function ReviewToggle({ value, onChange, disabled }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
      <button
        disabled={disabled}
        onClick={() => onChange('aprobado')}
        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium ${value === 'aprobado' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
      >
        <Check className="h-3 w-3" /> Aprobar
      </button>
      <button
        disabled={disabled}
        onClick={() => onChange('rechazado')}
        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium ${value === 'rechazado' ? 'bg-red-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
      >
        <X className="h-3 w-3" /> Rechazar
      </button>
    </div>
  );
}

export default function Stage2Panel({ request, readOnly, actor, applyChange, toast, onViewDocument }) {
  const [docs, setDocs] = useState({ dpi: request.documents.dpi?.status || 'pendiente', patente: request.documents.patente?.status || 'pendiente' });
  const [affiliates, setAffiliates] = useState({ ...request.affiliates });
  const [notes, setNotes] = useState('');
  const [touched, setTouched] = useState(false);

  const types = SALE_TYPES.filter((t) => request.saleTypes.includes(t.key));
  const values = types.map((t) => affiliates[t.key]);
  const duplicated = new Set(values).size !== values.length;
  const affiliatesOk = types.every((t) => isValidAffiliate(affiliates[t.key])) && !duplicated;
  const docsOk = docs.dpi === 'aprobado' && docs.patente === 'aprobado';
  const anyRejected = docs.dpi === 'rechazado' || docs.patente === 'rechazado';

  const generateAll = () => {
    const next = { ...affiliates };
    types.forEach((t) => { if (!isValidAffiliate(next[t.key])) next[t.key] = randomDigits(8); });
    setAffiliates(next);
  };

  const approve = async () => {
    setTouched(true);
    if (!docsOk || !affiliatesOk) return;

    try {
      const backendIdMatch = request.id.match(/^REQ-B(\d+)$/);
      if (backendIdMatch) {
        const backendId = backendIdMatch[1];
        const firstAffiliate = Object.values(affiliates).find(v => v);
        
        await apiFetch(`/api/afiliados`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            numeroAfiliado: firstAffiliate || '',
            solicitud: { id: parseInt(backendId, 10) }
          })
        });

        await apiFetch(`/api/solicitudes/${backendId}/estado`, {
          method: 'PUT',
          headers: { 'Content-Type': 'text/plain' },
          body: 'Aprobada'
        });
      }
    } catch (e) {
      console.error("Error sincronizando Etapa 2 con Backend:", e);
    }

    applyChange(
      request.id,
      (r) => ({
        ...r,
        stage: 3,
        documents: { dpi: { ...r.documents.dpi, status: 'aprobado' }, patente: { ...r.documents.patente, status: 'aprobado' } },
        affiliates: { normal: '', cuotas: '', puntos: '', ...Object.fromEntries(types.map((t) => [t.key, affiliates[t.key]])) },
        validation: { by: actor, at: new Date().toISOString(), notes },
      }),
      { action: 'Documentos aprobados y afiliados creados', stage: 2, notify: { stage: 3, message: `Tienes pendiente una programación nueva: ${request.business.name}` } },
    );
    toast('Afiliados creados', 'Se notificó al área de Programación (etapa 3)');
  };

  const giveBack = () => {
    if (!notes.trim()) { setTouched(true); return; }
    applyChange(
      request.id,
      (r) => ({
        ...r,
        stage: 1,
        returned: { reason: notes.trim(), at: new Date().toISOString() },
        documents: { dpi: { ...r.documents.dpi, status: docs.dpi }, patente: { ...r.documents.patente, status: docs.patente } },
      }),
      { action: `Devuelta a servicio al cliente: ${notes.trim()}`, stage: 2, notify: { stage: 1, message: `Gestión devuelta por validación: ${request.business.name}` } },
    );
    toast('Gestión devuelta a etapa 1', request.id);
  };

  if (readOnly) {
    return (
      <PanelCard title="Validación de documentos" subtitle="Afiliados creados en esta etapa" icon={ShieldCheck} readOnly badge={<Badge tone="emerald" dot>Validada</Badge>}>
        <div className="grid gap-4 sm:grid-cols-3">
          {types.map((t) => (
            <div key={t.key} className="rounded-lg border border-slate-200 p-3.5">
              <p className="kv-label">Afiliado · {t.label}</p>
              <p className="mt-1 font-mono text-lg font-semibold tracking-wider text-slate-900">{request.affiliates[t.key] || '—'}</p>
            </div>
          ))}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4">
          <KV label="Validado por">{request.validation?.by}</KV>
          <KV label="Fecha">{formatDateTime(request.validation?.at)}</KV>
        </dl>
      </PanelCard>
    );
  }

  return (
    <PanelCard
      title="Validación de documentos y creación de afiliados"
      subtitle="Revisa los documentos cargados y crea un afiliado numérico de 8 dígitos por cada tipo de venta"
      icon={ShieldCheck}
      badge={<Badge tone="amber">En validación</Badge>}
      footerNote="Al aprobar, se notifica al área de Programación que tiene una programación nueva pendiente."
      footer={
        <>
          <button onClick={giveBack} disabled={!anyRejected} className="btn-danger" title={anyRejected ? '' : 'Rechaza al menos un documento para devolver'}>
            <Undo2 className="h-4 w-4" /> Devolver a etapa 1
          </button>
          <button onClick={approve} disabled={!docsOk} className="btn-primary">
            Aprobar y enviar a programación <ArrowRight className="h-4 w-4" />
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <section>
          <p className="section-title mb-3">1 · Revisión de documentos</p>
          <div className="space-y-2">
            <DocumentRow label="Foto del DPI" doc={request.documents.dpi} onView={() => onViewDocument('DPI')}>
              <ReviewToggle value={docs.dpi} onChange={(v) => setDocs((prev) => ({ ...prev, dpi: v }))} />
            </DocumentRow>
            <DocumentRow label="Patente de comercio" doc={request.documents.patente} onView={() => onViewDocument('PATENTE')}>
              <ReviewToggle value={docs.patente} onChange={(v) => setDocs((prev) => ({ ...prev, patente: v }))} />
            </DocumentRow>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <p className="section-title">2 · Afiliados por tipo de venta</p>
            <button onClick={generateAll} disabled={!docsOk} className="btn-ghost btn-sm"><Wand2 className="h-3.5 w-3.5" /> Generar números</button>
          </div>
          {!docsOk && (
            <Callout tone="slate" className="mb-3">Aprueba ambos documentos para habilitar la creación de afiliados.</Callout>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            {types.map((t) => {
              const v = affiliates[t.key] || '';
              const invalid = touched && !isValidAffiliate(v);
              return (
                <Field key={t.key} label={`Afiliado ${t.label}`} required error={invalid ? 'Debe tener 8 dígitos numéricos' : null} help={`${v.length}/8 dígitos`}>
                  <input
                    value={v}
                    disabled={!docsOk}
                    inputMode="numeric"
                    maxLength={8}
                    placeholder="12457845"
                    onChange={(e) => setAffiliates({ ...affiliates, [t.key]: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                    className={`input font-mono tracking-widest ${invalid ? 'input-error' : ''}`}
                  />
                </Field>
              );
            })}
          </div>
          {touched && duplicated && <p className="error">Cada tipo de venta debe tener un afiliado distinto.</p>}
        </section>

        <section>
          <Field label="Observaciones" help={anyRejected ? 'Obligatorio para devolver la gestión: indica qué debe corregir servicio al cliente.' : 'Opcional'} error={touched && anyRejected && !notes.trim() ? 'Indica el motivo de la devolución' : null}>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="input" placeholder="Ej. La foto del DPI no es legible, solicitar nueva captura." />
          </Field>
        </section>
      </div>
    </PanelCard>
  );
}
