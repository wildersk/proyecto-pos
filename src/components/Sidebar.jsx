import React from 'react';
import { LayoutDashboard, Network, RotateCcw, CreditCard, Users } from 'lucide-react';
import { STAGES } from '../lib/workflow';

function Item({ id, icon: Icon, label, hint, count, unread, view, setView }) {
  const active = view === id;
  return (
    <button
      onClick={() => setView(id)}
      className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${
        active ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-brand-500' : 'text-slate-500 group-hover:text-slate-300'}`} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{label}</span>
        {hint && <span className="block truncate text-[10px] text-slate-500">{hint}</span>}
      </span>
      {unread > 0 && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" title={`${unread} sin leer`} />}
      {count != null && (
        <span className={`min-w-6 rounded-md px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums ${active ? 'bg-brand-600 text-white' : 'bg-white/5 text-slate-400'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

export default function Sidebar({ view, setView, role, user, onLogout, requests, notifications, onReset }) {
  const pendingIn = (stage) => requests.filter((r) => r.stage === stage && !r.completed).length;
  const unreadIn = (stage) => notifications.filter((n) => n.stage === stage && !n.read).length;

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-ink-900 lg:flex">
      <div className="flex items-center gap-3 border-b border-white/5 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white shadow-lg shadow-brand-600/30">
          <CreditCard className="h-5 w-5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight text-white">POS Central</p>
          <p className="truncate mt-1 text-[11px] text-slate-300">
            👤 {user?.username} ({role === 'admin' ? 'Admin' : `Etapa ${role}`})
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {role === 'admin' && (
          <div className="space-y-0.5">
            <Item view={view} setView={setView} id="dashboard" icon={LayoutDashboard} label="Panel general" />
          </div>
        )}

        <div>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Flujo de trabajo</p>
          <div className="space-y-0.5">
            {STAGES.filter(s => role === 'admin' || role === s.id).map((s) => (
              <Item
                view={view}
                setView={setView}
                key={s.id}
                id={`stage-${s.id}`}
                icon={s.icon}
                label={`${s.id}. ${s.name}`}
                hint={s.role}
                count={pendingIn(s.id)}
                unread={unreadIn(s.id)}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Plataforma</p>
          <div className="space-y-0.5">
            <Item view={view} setView={setView} id="systems" icon={Network} label="Sistemas integrados" hint="VHQ · AS400 · Mipos · CSP" />
            {role === 'admin' && (
              <Item view={view} setView={setView} id="users" icon={Users} label="Gestión de Usuarios" hint="Control de accesos y roles" />
            )}
          </div>
        </div>
      </nav>

      <div className="border-t border-white/5 p-3 space-y-1">
        <button onClick={onLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-400 hover:bg-white/5 hover:text-red-300">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> Cerrar Sesión
        </button>
        <button onClick={onReset} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-white/5 hover:text-slate-300">
          <RotateCcw className="h-3.5 w-3.5" /> Restablecer datos demo
        </button>
      </div>
    </aside>
  );
}
