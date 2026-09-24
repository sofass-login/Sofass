"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

const money = (n: number) =>
  (Number(n) || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });

type LedgerRow = {
  id: string;
  label: string;
  detail: string;
  amount: number;
  created_at: string;
};

export default function CajaClient({
  profile,
  stores,
}: {
  profile: Profile;
  stores: { id: string; name: string }[];
}) {
  const supabase = createClient();
  const isAdmin = profile.role === "admin";
  const [storeId, setStoreId] = useState<string>(profile.store_id || stores[0]?.id || "");
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<null | "apertura" | "retirada">(null);

  async function load(sid: string) {
    if (!sid) return;
    setLoading(true);
    const [{ data: cash }, { data: sales }] = await Promise.all([
      supabase.from("cash").select("*").eq("store_id", sid).order("created_at"),
      supabase
        .from("sales")
        .select("id, client_name, total, status, created_at")
        .eq("store_id", sid)
        .eq("status", "cobrada")
        .order("created_at"),
    ]);
    const ledger: LedgerRow[] = [
      ...(cash ?? []).map((c: any) => ({
        id: "cash-" + c.id,
        label: c.type === "apertura" ? "Apertura de caja" : "Retirada de caja",
        detail: c.note || "",
        amount: c.type === "apertura" ? Number(c.amount) : -Number(c.amount),
        created_at: c.created_at,
      })),
      ...(sales ?? []).map((s: any) => ({
        id: "sale-" + s.id,
        label: "Venta",
        detail: s.client_name || "Cliente",
        amount: Number(s.total),
        created_at: s.created_at,
      })),
    ].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));

    setRows(ledger.reverse());
    setBalance(ledger.reduce((acc, r) => acc + r.amount, 0));
    setLoading(false);
  }

  useEffect(() => {
    load(storeId);
    if (!storeId) return;
    const ch = supabase
      .channel("caja-" + storeId)
      .on("postgres_changes", { event: "*", schema: "public", table: "cash", filter: `store_id=eq.${storeId}` }, () =>
        load(storeId)
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "sales", filter: `store_id=eq.${storeId}` }, () =>
        load(storeId)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h1 className="text-lg font-semibold">Caja</h1>
        {isAdmin && (
          <select
            className="rounded-lg border border-border px-3 py-2 text-sm"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="card mb-4">
        <p className="text-xs text-ink-soft uppercase tracking-wide">Saldo actual de caja</p>
        <p className="text-3xl font-semibold mb-3">{money(balance)}</p>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={() => setShowForm("apertura")}>
            ↓ Apertura
          </button>
          <button className="btn btn-ghost" onClick={() => setShowForm("retirada")}>
            ↑ Retirada
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-ink-soft">Cargando…</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="card flex justify-between items-center py-2">
              <div>
                <p className="text-sm font-medium">{r.label}</p>
                <p className="text-xs text-ink-soft">
                  {r.detail} · {new Date(r.created_at).toLocaleString("es-ES")}
                </p>
              </div>
              <p className={`font-medium ${r.amount < 0 ? "text-red-600" : ""}`}>{money(r.amount)}</p>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <CashForm
          type={showForm}
          storeId={storeId}
          storeName={stores.find((s) => s.id === storeId)?.name || ""}
          onClose={() => setShowForm(null)}
          onSaved={() => {
            setShowForm(null);
            load(storeId);
          }}
        />
      )}
    </div>
  );
}

function CashForm({
  type,
  storeId,
  storeName,
  onClose,
  onSaved,
}: {
  type: "apertura" | "retirada";
  storeId: string;
  storeName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const amt = Number(amount) || 0;
    if (amt <= 0) return setError("Introduce un importe.");
    setSaving(true);
    const { error } = await supabase.from("cash").insert({
      store_id: storeId,
      store_name: storeName,
      type,
      amount: amt,
      note,
    });
    setSaving(false);
    if (error) {
      setError("No se pudo guardar: " + error.message);
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="card w-full max-w-sm">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">{type === "apertura" ? "Apertura de caja" : "Retirada de caja"}</h2>
          <button onClick={onClose} className="text-ink-soft">
            ✕
          </button>
        </div>
        <div className="field mb-3">
          <label>Importe (€)</label>
          <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="field mb-3">
          <label>Nota (opcional)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Motivo" />
        </div>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={saving} onClick={save}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
