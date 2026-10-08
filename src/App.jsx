import React, { useCallback, useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import DashboardView from './views/DashboardView';
import StageWorkspace from './views/StageWorkspace';
import LegacySystemsViewer from './components/LegacySystemsViewer';
import RequestFormModal from './components/RequestFormModal';
import RequestDetailDrawer from './components/RequestDetailDrawer';
import DocumentViewerModal from './components/DocumentViewerModal';
import LoginView from './views/LoginView';
import UsersManagementView from './views/UsersManagementView';
import { Toasts } from './components/ui';
import { initialRequests, initialNotifications } from './data/mockRequests';
import { getStage, nowISO, newRequestId } from './lib/workflow';
import { apiFetch, setAuthToken, setUnauthorizedHandler } from './lib/api';

const STORAGE_KEY = 'pos-central-demo-v2';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* sin almacenamiento disponible */ }
  return { requests: initialRequests, notifications: initialNotifications };
}

export default function App() {
  const [{ requests, notifications }, setData] = useState(loadState);
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState([]);

  const [formState, setFormState] = useState(null); // { mode: 'create' | 'edit', request? }
  const [detailId, setDetailId] = useState(null);
  const [docModal, setDocModal] = useState(null); // { type, request }

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ requests, notifications })); } catch { /* cuota excedida o bloqueado */ }
  }, [requests, notifications]);

  const currentStage = view.startsWith('stage-') ? Number(view.split('-')[1]) : null;
  const actor = currentStage ? getStage(currentStage).user : 'Administrador';

  const toast = useCallback((title, description, tone = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, title, description, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setCurrentUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      toast('Sesión expirada', 'Inicia sesión nuevamente.', 'red');
    });
    return () => setUnauthorizedHandler(null);
  }, [logout, toast]);

  // Aplica un cambio a una gestión, registra historial y, si aplica, notifica a la siguiente etapa
  const applyChange = useCallback((id, patch, { action, stage, notify } = {}) => {
    setData((prev) => {
      const at = nowISO();
      const reqs = prev.requests.map((r) => {
        if (r.id !== id) return r;
        const next = typeof patch === 'function' ? patch(r) : { ...r, ...patch };
        return action ? { ...next, history: [...(r.history || []), { at, stage: stage ?? r.stage, action, by: getStage(stage ?? r.stage)?.user }] } : next;
      });
      const notes = notify
        ? [{ id: Math.random().toString(36).slice(2), stage: notify.stage, requestId: id, message: notify.message, at, read: false }, ...prev.notifications]
        : prev.notifications;
      return { requests: reqs, notifications: notes };
    });
  }, []);

  const createRequest = async (req, sendNow) => {
    let backendId = newRequestId(requests);
    try {
      const response = await apiFetch(`/api/solicitudes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          giroNegocio: req.business.tradeType,
          datosFiscales: `NIT: ${req.customer.nit}, Cliente: ${req.customer.firstName} ${req.customer.lastName}`,
          modalidadPos: req.saleTypes.join(', ')
        })
      });
      if (response.ok) {
        const data = await response.json();
        backendId = `REQ-B${data.id}`; // Prefijo B para identificar que viene del backend
      }
    } catch (error) {
      console.error("Error conectando al backend:", error);
      toast('Error de conexión', 'No se pudo conectar al backend. Guardado localmente.', 'red');
    }

    const id = backendId;
    const at = nowISO();
    const history = [{ at, stage: 1, action: sendNow ? 'Gestión creada' : 'Gestión creada (borrador)', by: getStage(1).user }];
    if (sendNow) history.push({ at, stage: 1, action: 'Enviada a validación', by: getStage(1).user });
    const full = { ...req, id, createdAt: at, stage: sendNow ? 2 : 1, history };
    setData((prev) => ({
      requests: [full, ...prev.requests],
      notifications: sendNow
        ? [{ id: Math.random().toString(36).slice(2), stage: 2, requestId: id, message: `Nueva gestión pendiente de validación: ${full.business.name}`, at, read: false }, ...prev.notifications]
        : prev.notifications,
    }));
    toast(sendNow ? 'Gestión creada y enviada a validación' : 'Gestión guardada como borrador', `${id} · ${full.business.name}`);
  };

  const saveEdit = (req) => {
    applyChange(req.id, req, { action: 'Datos de la gestión actualizados', stage: 1 });
    toast('Cambios guardados', req.id);
  };

  const markNotificationsRead = (stage) =>
    setData((prev) => ({ ...prev, notifications: prev.notifications.map((n) => (stage == null || n.stage === stage ? { ...n, read: true } : n)) }));

  const resetDemo = () => {
    setData({ requests: initialRequests, notifications: initialNotifications });
    toast('Datos de demostración restablecidos');
  };

  const detailRequest = requests.find((r) => r.id === detailId) || null;

  const role = currentUser ? (currentUser.role === 'admin' ? 'admin' : Number(currentUser.role)) : null;

  if (!currentUser) {
    return (
      <LoginView onLogin={(user) => {
        setCurrentUser(user);
        const r = user.role === 'admin' ? 'admin' : Number(user.role);
        setView(r === 'admin' ? 'dashboard' : `stage-${r}`);
      }} />
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar 
        view={view} 
        setView={setView} 
        role={role} 
        user={currentUser}
        onLogout={logout}
        requests={requests} 
        notifications={notifications} 
        onReset={resetDemo} 
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          currentUser={currentUser}
          view={view}
          setView={setView}
          currentStage={currentStage}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          notifications={notifications}
          onMarkRead={markNotificationsRead}
          onOpenRequest={(id) => setDetailId(id)}
          onNewRequest={() => setFormState({ mode: 'create' })}
        />

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-6 lg:px-8">
          {view === 'users' && <UsersManagementView />}

          {view === 'dashboard' && (
            <DashboardView
              requests={requests}
              notifications={notifications}
              searchQuery={searchQuery}
              onOpenDetail={setDetailId}
              onGoToStage={(s) => setView(`stage-${s}`)}
              onNewRequest={() => setFormState({ mode: 'create' })}
            />
          )}

          {currentStage && (
            <StageWorkspace
              key={currentStage}
              stage={currentStage}
              actor={actor}
              requests={requests}
              searchQuery={searchQuery}
              applyChange={applyChange}
              toast={toast}
              onOpenDetail={setDetailId}
              onViewDocument={(type, request) => setDocModal({ type, request })}
              onNewRequest={() => setFormState({ mode: 'create' })}
              onEditRequest={(request) => setFormState({ mode: 'edit', request })}
            />
          )}

          {view === 'systems' && <LegacySystemsViewer />}
        </main>

        <footer className="border-t border-slate-200 bg-white px-8 py-3 text-[11px] text-slate-500">
          <div className="mx-auto flex max-w-[1400px] flex-col justify-between gap-1 sm:flex-row">
            <span>Plataforma Centralizada de Gestión POS · Prototipo v2 · 2026</span>
            <span>Eswin Pineda (Frontend) · Wilmer de León (Backend)</span>
          </div>
        </footer>
      </div>

      {formState && <RequestFormModal
        key={formState.request?.id || 'new'}
        state={formState}
        onClose={() => setFormState(null)}
        onCreate={createRequest}
        onSave={saveEdit}
      />}

      <RequestDetailDrawer
        request={detailRequest}
        onClose={() => setDetailId(null)}
        onViewDocument={(type, request) => setDocModal({ type, request })}
      />

      {docModal && <DocumentViewerModal
        key={`${docModal.type}-${docModal.request.id}`}
        open
        onClose={() => setDocModal(null)}
        type={docModal?.type}
        request={docModal?.request}
      />}

      <Toasts toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}
