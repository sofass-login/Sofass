"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Item = { id: string; name: string; sku: string; price: number };
type Warehouse = { id: string; name: string };
type StockRow = { item_id: string; warehouse_id: string; qty: number };

export default function AlmacenClient({
  items,
  warehouses,
  stock,
}: {
  items: Item[];
  warehouses: Warehouse[];
  stock: StockRow[];
}) {
  const supabase = createClient();
  const [search, setSearch] = useState("");
  const [showEntrada, setShowEntrada] = useState(false);

  const stockByItem = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of stock) m.set(s.item_id, (m.get(s.item_id) || 0) + Number(s.qty));
    return m;
  }, [stock]);

  const filtered = items.filter(
    (i) =>
      !search ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h1 className="text-lg font-semibold">Almacén</h1>
        <div className="flex gap-2">
          <input
            placeholder="Buscar artículo o SKU…"
            className="rounded-lg border border-border px-3 py-2 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-primary" onClick={() => setShowEntrada(true)}>
            + Entrada
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-black/5 text-left">
            <tr>
              <th className="px-4 py-2">Artículo</th>
              <th className="px-4 py-2">SKU</th>
              <th className="px-4 py-2 text-right">Precio</th>
              <th className="px-4 py-2 text-right">Stock total</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} className="border-t border-border">
                <td className="px-4 py-2">{i.name}</td>
                <td className="px-4 py-2 text-ink-soft">{i.sku}</td>
                <td className="px-4 py-2 text-right">
                  {(Number(i.price) || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                </td>
                <td className="px-4 py-2 text-right font-medium">{stockByItem.get(i.id) || 0}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-soft">
                  Sin artículos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showEntrada && (
        <EntradaForm items={items} warehouses={warehouses} onClose={() => setShowEntrada(false)} />
      )}
    </div>
  );
}

function EntradaForm({
  items,
  warehouses,
  onClose,
}: {
  items: Item[];
  warehouses: Warehouse[];
  onClose: () => void;
}) {
  const supabase = createClient();
  const [itemId, setItemId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (!itemId) return setError("Elige un artículo.");
    if (!warehouseId) return setError("Elige un almacén.");
    setSaving(true);
    const { error } = await supabase.rpc("register_stock_movement", {
      p_type: "entrada",
      p_item_id: itemId,
      p_warehouse_id: warehouseId,
      p_qty: qty,
      p_unit_price: Number(unitPrice) || 0,
      p_store_id: null,
      p_store_name: "",
      p_actor_name: "Administrador",
    });
    setSaving(false);
    if (error) return setError("No se pudo guardar: " + error.message);
    window.location.reload();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="card w-full max-w-sm">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">Registrar entrada</h2>
          <button onClick={onClose} className="text-ink-soft">
            ✕
          </button>
        </div>
        <div className="field mb-3">
          <label>Artículo</label>
          <select value={itemId} onChange={(e) => setItemId(e.target.value)}>
            <option value="">— seleccionar —</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.sku})
              </option>
            ))}
          </select>
        </div>
        <div className="field mb-3">
          <label>Almacén de destino</label>
          <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
            <option value="">— seleccionar —</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field mb-3">
          <label>Cantidad</label>
          <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
        </div>
        <div className="field mb-3">
          <label>Precio unitario (€)</label>
          <input type="number" step="any" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
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
