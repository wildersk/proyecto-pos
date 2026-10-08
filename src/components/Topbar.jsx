import React, { useEffect, useRef, useState } from 'react';
import { Search, Bell, Plus, ChevronDown } from 'lucide-react';
import { STAGES, getStage, timeAgo, TONES } from '../lib/workflow';
import { Avatar } from './ui';

const TITLES = {
  dashboard: { title: 'Panel general', subtitle: 'Visión consolidada de todas las gestiones POS' },
  systems: { title: 'Sistemas integrados', subtitle: 'Sistemas legados unificados en la plataforma' },
  users: { title: 'Gestión de Usuarios', subtitle: 'Control de accesos y roles del sistema' },
};

export default function Topbar({ currentUser, view, setView, currentStage, searchQuery, setSearchQuery, notifications, onMarkRead, onOpenRequest, onNewRequest }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const stage = currentStage ? getStage(currentStage) : null;
  const heading = stage
    ? { title: `Etapa ${stage.id} · ${stage.name}`, subtitle: stage.description }
    : TITLES[view];

  const visible = notifications.filter((n) => currentStage == null || n.stage === currentStage);
  const unread = visible.filter((n) => !n.read).length;
  const user = stage ? { name: stage.user, role: stage.role } : { name: 'Administrador General', role: 'Supervisor de operaciones' };

  const isAdmin = currentUser?.role === 'admin';
  const userRole = isAdmin ? 'admin' : Number(currentUser?.role);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-6 lg:px-8">
        <div className="min-w-0 flex-1">
          <select
            value={view}
            onChange={(e) => setView(e.target.value)}
            className="input mb-1 h-8 w-auto text-xs lg:hidden"
          >
            {isAdmin && <option value="dashboard">Panel general</option>}
            {STAGES.filter((s) => isAdmin || userRole === s.id).map((s) => (
              <option key={s.id} value={`stage-${s.id}`}>
                Etapa {s.id} · {s.name}
              </option>
            ))}
            <option value="systems">Sistemas integrados</option>
            {isAdmin && <option value="users">Gestión de Usuarios</option>}
          </select>
          <h1 className="truncate text-[15px] font-semibold text-slate-900">{heading.title}</h1>
          <p className="hidden truncate text-xs text-slate-500 sm:block">{heading.subtitle}</p>
        </div>

        <div className="relative hidden w-72 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar gestión, NIT, DPI, afiliado…"
            className="input pl-9"
          />
        </div>

        {(view === 'dashboard' || currentStage === 1) && (
          <button onClick={onNewRequest} className="btn-primary">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nueva gestión</span>
          </button>
        )}

        <div className="relative" ref={ref}>
          <button onClick={() => setOpen((o) => !o)} className="btn-icon relative h-9 w-9" aria-label="Notificaciones">
            <Bell className="h-4.5 w-4.5" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
          </button>
          {open && (
            <div className="card absolute right-0 top-11 w-96 overflow-hidden shadow-xl animate-pop-in">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Notificaciones</p>
                  <p className="text-[11px] text-slate-500">{stage ? `Bandeja de ${stage.role}` : 'Todas las etapas'}</p>
                </div>
                {unread > 0 && (
                  <button onClick={() => onMarkRead(currentStage)} className="text-xs font-medium text-brand-600 hover:text-brand-700">
                    Marcar como leídas
                  </button>
                )}
              </div>
              <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
                {visible.length === 0 && <li className="px-4 py-8 text-center text-xs text-slate-500">Sin notificaciones</li>}
                {visible.slice(0, 20).map((n) => {
                  const st = getStage(n.stage);
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => { onOpenRequest(n.requestId); setOpen(false); }}
                        className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50 ${n.read ? '' : 'bg-brand-50/40'}`}
                      >
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-slate-200' : TONES[st.tone].dot}`} />
                        <span className="min-w-0">
                          <span className="block text-xs text-slate-800">{n.message}</span>
                          <span className="mt-0.5 block text-[11px] text-slate-500">Etapa {n.stage} · {n.requestId} · {timeAgo(n.at)}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {currentUser && (
          <div className="hidden items-center gap-2.5 border-l border-slate-200 pl-4 xl:flex">
            <Avatar name={currentUser.role === 'admin' ? 'Admin' : `Etapa ${currentUser.role}`} size="sm" />
            <div className="leading-tight">
              <p className="text-xs font-semibold text-slate-900">
                {currentUser.role === 'admin' ? 'Administrador' : (getStage(Number(currentUser.role))?.name || `Rol ${currentUser.role}`)}
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
