"use client";

import { useState } from "react";

type StoreOpt = { id: string; name: string };
type ProfileRow = { id: string; name: string; role: "admin" | "vendedor"; store_id: string | null };

export default function UsuariosClient({
  stores,
  profiles,
}: {
  stores: StoreOpt[];
  profiles: ProfileRow[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [rows, setRows] = useState(profiles);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Usuarios</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + Invitar usuario
        </button>
      </div>

      <p className="text-sm text-ink-soft mb-4">
        Cualquier correo funciona (no hace falta que sea de tu misma empresa). A la persona le llegará un
        correo para elegir su contraseña, y podrá entrar solo con acceso a lo de su propia tienda.
      </p>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-black/5 text-left">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Rol</th>
              <th className="px-4 py-2">Tienda</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-2">{p.name || "—"}</td>
                <td className="px-4 py-2">{p.role === "admin" ? "Administrador" : "Vendedor"}</td>
                <td className="px-4 py-2">{stores.find((s) => s.id === p.store_id)?.name || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <InviteForm
          stores={stores}
          onClose={() => setShowForm(false)}
          onInvited={(p) => {
            setRows((r) => [...r, p]);
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

function InviteForm({
  stores,
  onClose,
  onInvited,
}: {
  stores: StoreOpt[];
  onClose: () => void;
  onInvited: (p: ProfileRow) => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "vendedor">("vendedor");
  const [storeId, setStoreId] = useState(stores[0]?.id || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (!email) return setError("Escribe un correo.");
    setSaving(true);
    const res = await fetch("/api/invite-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, role, storeId: role === "vendedor" ? storeId : null }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setError(data.error || "No se pudo invitar.");
    onInvited({ id: crypto.randomUUID(), name, role, store_id: role === "vendedor" ? storeId : null });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="card w-full max-w-sm">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">Invitar usuario</h2>
          <button onClick={onClose} className="text-ink-soft">
            ✕
          </button>
        </div>
        <div className="field mb-3">
          <label>Correo electrónico</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@correo.com" />
        </div>
        <div className="field mb-3">
          <label>Nombre</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field mb-3">
          <label>Rol</label>
          <select value={role} onChange={(e) => setRole(e.target.value as any)}>
            <option value="vendedor">Vendedor</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        {role === "vendedor" && (
          <div className="field mb-4">
            <label>Tienda</label>
            <select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={saving} onClick={save}>
            {saving ? "Invitando…" : "Invitar"}
          </button>
        </div>
      </div>
    </div>
  );
}
