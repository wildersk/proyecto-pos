import React, { useState, useEffect } from 'react';
import { Users, Plus, Shield, User } from 'lucide-react';
import { Field, Badge } from '../components/ui';
import { apiFetch } from '../lib/api';

export default function UsersManagementView() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ username: '', password: '', role: '1' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const ROLES_MAP = {
    'admin': 'Administrador',
    '1': '1. Servicio al Cliente',
    '2': '2. Validador',
    '3': '3. Programador',
    '4': '4. Logística',
    '5': '5. Técnico'
  };

  const fetchUsers = async () => {
    try {
      const res = await apiFetch(`/api/usuarios`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.username || !form.password) {
      setError('Por favor completa todos los campos.');
      return;
    }

    try {
      const res = await apiFetch(`/api/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        setSuccess('Usuario creado exitosamente.');
        setForm({ username: '', password: '', role: '1' });
        fetchUsers();
      } else {
        setError('Error al crear usuario. (Puede que el nombre de usuario ya exista).');
      }
    } catch (err) {
      setError('Error de conexión con el servidor.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Gestión de Usuarios</h1>
            <p className="text-sm text-slate-500">Crea nuevos usuarios y asigna sus roles en el sistema.</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_300px]">
          {/* Lista de Usuarios */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Usuarios Activos</h2>
            </div>
            {loading ? (
              <div className="p-5 text-sm text-slate-500">Cargando usuarios...</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{u.username}</p>
                        <p className="text-xs text-slate-500">{ROLES_MAP[u.role]}</p>
                      </div>
                    </div>
                    {u.role === 'admin' ? (
                      <Badge tone="violet" icon={Shield}>Admin</Badge>
                    ) : (
                      <Badge tone="slate">Etapa {u.role}</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Formulario de Creación */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm h-fit">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Crear Nuevo Usuario</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <Field label="Nombre de Usuario" required>
                <input 
                  type="text" 
                  value={form.username} 
                  onChange={e => setForm({...form, username: e.target.value})} 
                  className="input" 
                  placeholder="Ej. jperez"
                />
              </Field>

              <Field label="Contraseña" required>
                <input 
                  type="password" 
                  value={form.password} 
                  onChange={e => setForm({...form, password: e.target.value})} 
                  className="input" 
                  placeholder="••••••••"
                />
              </Field>

              <Field label="Rol del Sistema" required>
                <select 
                  value={form.role} 
                  onChange={e => setForm({...form, role: e.target.value})} 
                  className="input"
                >
                  {Object.entries(ROLES_MAP).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </Field>

              {error && <p className="text-xs text-red-600">{error}</p>}
              {success && <p className="text-xs text-emerald-600">{success}</p>}

              <button type="submit" className="btn-primary w-full justify-center">
                <Plus className="h-4 w-4" /> Registrar Usuario
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
