"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Sale, SaleLine } from "@/lib/types";

type StoreOpt = { id: string; name: string };
type ItemOpt = { id: string; name: string; sku: string };
type SupplierOpt = { id: string; name: string };

const money = (n: number) =>
  (Number(n) || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });

export default function VentasClient({
  profile,
  stores,
  items,
  suppliers,
}: {
  profile: Profile;
  stores: StoreOpt[];
  items: ItemOpt[];
  suppliers: SupplierOpt[];
}) {
  const supabase = createClient();
  const isAdmin = profile.role === "admin";
  const [storeId, setStoreId] = useState<string>(profile.store_id || stores[0]?.id || "");
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function loadSales(sid: string) {
    if (!sid) return;
    setLoading(true);
    const { data } = await supabase
      .from("sales")
      .select("*")
      .eq("store_id", sid)
      .order("created_at", { ascending: false });
    setSales(
      (data ?? []).map((d: any) => ({
        ...d,
        client_name: d.client_name,
        items: d.items ?? [],
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    loadSales(storeId);
    if (!storeId) return;
    const channel = supabase
      .channel("sales-" + storeId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales", filter: `store_id=eq.${storeId}` },
        () => loadSales(storeId)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  async function handOver(saleId: string, lineId: string) {
    const { error } = await supabase.rpc("hand_over_sale_line", {
      p_sale_id: saleId,
      p_line_id: lineId,
    });
    if (error) alert("No se pudo marcar como entregado: " + error.message);
    else loadSales(storeId);
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h1 className="text-lg font-semibold">Ventas</h1>
        <div className="flex items-center gap-2">
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
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Registrar venta
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-ink-soft">Cargando…</p>
      ) : sales.length === 0 ? (
        <p className="text-sm text-ink-soft">Todavía no hay ventas registradas en esta tienda.</p>
      ) : (
        <div className="space-y-3">
          {sales.map((s) => (
            <div key={s.id} className="card">
              <div className="flex justify-between items-start gap-3 flex-wrap">
                <div>
                  <p className="font-medium">{s.client_name || "Cliente"}</p>
                  <p className="text-xs text-ink-soft">
                    {new Date(s.created_at).toLocaleString("es-ES")}
                    {s.pedido_number ? ` · Pedido ${s.pedido_number}` : ""} · {s.method}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{money(s.total)}</p>
                  <p className="text-xs text-ink-soft">{s.status === "cobrada" ? "Cobrada" : "Pendiente"}</p>
                </div>
              </div>
              {s.items?.length > 0 && (
                <ul className="mt-3 pt-3 border-t border-border space-y-1 text-sm">
                  {s.items.map((l: SaleLine) => {
                    const needsHandOver = l.orderType === "stock" && l.delivered && l.handedOver === false;
                    return (
                      <li key={l.id} className="flex items-center gap-2 flex-wrap">
                        <span>
                          {l.delivered ? (needsHandOver ? "📦" : "✓") : l.orderType === "pedido" ? "📋" : "⏳"}
                        </span>
                        <span>
                          {l.itemName} <b>x{l.qty}</b>
                        </span>
                        {l.supplierName && (
                          <span className="text-ink-soft">· Fabricante: {l.supplierName}</span>
                        )}
                        {l.sourceWarehouses?.length ? (
                          <span className="text-ink-soft">
                            · Procedía de: {l.sourceWarehouses.map((w) => w.warehouseName).join(", ")}
                          </span>
                        ) : null}
                        {needsHandOver && (
                          <button
                            className="btn btn-primary !py-1 !px-2 text-xs ml-auto"
                            onClick={() => handOver(s.id, l.id)}
                          >
                            ✓ Entregado
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <SaleForm
          storeId={storeId}
          storeName={stores.find((s) => s.id === storeId)?.name || ""}
          items={items}
          suppliers={suppliers}
          sellerName={profile.name || "Administrador"}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            loadSales(storeId);
          }}
        />
      )}
    </div>
  );
}

function SaleForm({
  storeId,
  storeName,
  items,
  suppliers,
  sellerName,
  onClose,
  onSaved,
}: {
  storeId: string;
  storeName: string;
  items: ItemOpt[];
  suppliers: SupplierOpt[];
  sellerName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [clientName, setClientName] = useState("");
  const [pedidoNumber, setPedidoNumber] = useState("");
  const [total, setTotal] = useState("");
  const [deposit, setDeposit] = useState("");
  const [method, setMethod] = useState("Efectivo");
  const [status, setStatus] = useState("cobrada");
  const [lines, setLines] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selItem, setSelItem] = useState("");
  const [selQty, setSelQty] = useState(1);
  const [selType, setSelType] = useState<"stock" | "pedido">("stock");
  const [selNote, setSelNote] = useState("");
  const [selSupplier, setSelSupplier] = useState("");
  const [selCustomName, setSelCustomName] = useState("");
  const isCustom = selItem === "__custom__";

  function addLine() {
    if (isCustom) {
      if (!selSupplier) return alert("Elige el fabricante.");
      if (!selCustomName.trim()) return alert("Escribe el nombre del producto.");
      const supplier = suppliers.find((s) => s.id === selSupplier);
      setLines((l) => [
        ...l,
        {
          itemId: null,
          itemName: selCustomName.trim(),
          qty: selQty,
          orderType: "pedido",
          note: selNote,
          supplierId: selSupplier,
          supplierName: supplier?.name || "",
        },
      ]);
    } else {
      if (!selItem) return alert("Elige un artículo.");
      const item = items.find((i) => i.id === selItem);
      if (!item) return;
      setLines((l) => [
        ...l,
        { itemId: item.id, itemName: item.name, qty: selQty, orderType: selType, note: selNote },
      ]);
    }
    setSelItem("");
    setSelQty(1);
    setSelNote("");
    setSelCustomName("");
    setSelSupplier("");
  }

  async function save() {
    setError(null);
    const totalNum = Number(total) || 0;
    if (totalNum <= 0) return setError("Introduce un total.");
    setSaving(true);
    const { error } = await supabase.rpc("register_sale", {
      payload: {
        storeId,
        storeName,
        clientName,
        pedidoNumber,
        itemsText: "",
        total: totalNum,
        deposit: Number(deposit) || 0,
        method,
        status,
        sellerName,
        lines,
      },
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
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">Registrar venta</h2>
          <button onClick={onClose} className="text-ink-soft">
            ✕
          </button>
        </div>

        <div className="field mb-3">
          <label>Cliente</label>
          <input value={clientName} onChange={(e) => setClientName(e.target.value)} />
        </div>
        <div className="field mb-3">
          <label>Nº de pedido (opcional)</label>
          <input value={pedidoNumber} onChange={(e) => setPedidoNumber(e.target.value)} />
        </div>

        <div className="field mb-2">
          <label>Líneas de producto</label>
          <div className="flex gap-2 flex-wrap">
            <select className="flex-[2] min-w-[140px]" value={selItem} onChange={(e) => setSelItem(e.target.value)}>
              <option value="">— artículo —</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} {i.sku ? `(${i.sku})` : ""}
                </option>
              ))}
              <option value="__custom__">+ Producto nuevo (no está en el catálogo)</option>
            </select>
            <input
              type="number"
              min={1}
              className="w-16"
              value={selQty}
              onChange={(e) => setSelQty(Math.max(1, Number(e.target.value) || 1))}
            />
            {!isCustom && (
              <select className="w-28" value={selType} onChange={(e) => setSelType(e.target.value as any)}>
                <option value="stock">De stock</option>
                <option value="pedido">De pedido</option>
              </select>
            )}
            <button type="button" className="btn btn-primary" onClick={addLine}>
              +
            </button>
          </div>
          {isCustom && (
            <div className="flex gap-2 flex-wrap mt-2">
              <select className="flex-1 min-w-[140px]" value={selSupplier} onChange={(e) => setSelSupplier(e.target.value)}>
                <option value="">— fabricante —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input
                className="flex-[2] min-w-[160px] rounded-lg border border-border px-3 py-2 text-sm"
                placeholder="Nombre del producto a pedir"
                value={selCustomName}
                onChange={(e) => setSelCustomName(e.target.value)}
              />
            </div>
          )}
          <input
            className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm"
            placeholder="Nota para el pedido (color, tela, medida…) — opcional"
            value={selNote}
            onChange={(e) => setSelNote(e.target.value)}
          />
          <p className="text-xs text-ink-soft mt-2">
            &quot;De stock&quot; descuenta del almacén si hay unidades. &quot;De pedido&quot; nunca descuenta
            stock. Si el producto no está en tu catálogo, elige &quot;+ Producto nuevo&quot;.
          </p>
          {lines.length > 0 && (
            <ul className="mt-2 border-t border-border pt-2 space-y-1 text-sm">
              {lines.map((l, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span>{l.orderType === "pedido" ? "📋" : "✓"}</span>
                  <span>
                    {l.itemName} x{l.qty}
                  </span>
                  {l.supplierName && <span className="text-ink-soft">· {l.supplierName}</span>}
                  <button
                    className="ml-auto text-ink-soft"
                    onClick={() => setLines((ls) => ls.filter((_, i) => i !== idx))}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="field mb-3">
          <label>Total (€)</label>
          <input type="number" min={0} value={total} onChange={(e) => setTotal(e.target.value)} />
        </div>
        <div className="field mb-3">
          <label>Seña / pagado ahora (€, opcional)</label>
          <input type="number" min={0} value={deposit} onChange={(e) => setDeposit(e.target.value)} />
        </div>
        <div className="field mb-3">
          <label>Método de pago</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option>Efectivo</option>
            <option>Tarjeta</option>
            <option>Transferencia</option>
          </select>
        </div>
        <div className="field mb-4">
          <label>Estado</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="cobrada">Cobrada</option>
            <option value="pendiente">Pendiente</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={saving} onClick={save}>
            {saving ? "Guardando…" : "Guardar venta"}
          </button>
        </div>
      </div>
    </div>
  );
}
