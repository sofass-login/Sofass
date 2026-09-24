"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = { id: string; name: string; [k: string]: any };

function Section({
  title,
  table,
  rows,
  extraField,
  hint,
}: {
  title: string;
  table: string;
  rows: Row[];
  extraField?: { key: string; label: string };
  hint?: string;
}) {
  const supabase = createClient();
  const [list, setList] = useState(rows);
  const [name, setName] = useState("");
  const [extra, setExtra] = useState("");
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!name.trim()) return;
    setSaving(true);
    const payload: any = { name: name.trim() };
    if (extraField) payload[extraField.key] = extra;
    const { data, error } = await supabase.from(table).insert(payload).select().single();
    setSaving(false);
    if (error) return alert("No se pudo guardar: " + error.message);
    setList((l) => [...l, data as Row]);
    setName("");
    setExtra("");
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return alert("No se pudo eliminar: " + error.message);
    setList((l) => l.filter((r) => r.id !== id));
  }

  return (
    <div className="card">
      <h2 className="font-semibold mb-1">{title}</h2>
      {hint && <p className="text-xs text-ink-soft mb-3">{hint}</p>}
      <ul className="space-y-1 mb-3">
        {list.map((r) => (
          <li key={r.id} className="flex items-center justify-between text-sm border-b border-border py-1.5">
            <span>
              {r.name}
              {extraField && r[extraField.key] ? ` · ${r[extraField.key]}` : ""}
            </span>
            <button className="text-ink-soft text-xs" onClick={() => remove(r.id)}>
              Eliminar
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="text-sm text-ink-soft">Sin elementos todavía.</li>}
      </ul>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {extraField && (
          <input
            className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
            placeholder={extraField.label}
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
          />
        )}
        <button className="btn btn-primary !px-3" disabled={saving} onClick={add}>
          +
        </button>
      </div>
    </div>
  );
}

export default function ConfigClient({
  stores,
  warehouses,
  suppliers,
}: {
  stores: Row[];
  warehouses: Row[];
  suppliers: Row[];
}) {
  return (
    <div>
      <h1 className="text-lg font-semibold mb-4">Configuración</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        <Section title="Tiendas" table="stores" rows={stores} extraField={{ key: "address", label: "Dirección" }} />
        <Section
          title="Almacenes"
          table="warehouses"
          rows={warehouses}
          extraField={{ key: "location", label: "Ubicación" }}
          hint='Crea uno llamado exactamente "Vendido" para activar el flujo de entregas.'
        />
        <Section title="Fabricantes / proveedores" table="suppliers" rows={suppliers} />
      </div>
      <p className="text-xs text-ink-soft mt-4">
        Para artículos del catálogo y familias, dímelo y añado esas pantallas también — de momento se pueden
        crear artículos directamente desde Supabase (tabla <code>items</code>) o pídemelo y te hago un
        importador.
      </p>
    </div>
  );
}
