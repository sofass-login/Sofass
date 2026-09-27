export type Profile = {
  id: string;
  name: string;
  role: "admin" | "vendedor";
  store_id: string | null;
};

export type Store = { id: string; name: string; address: string };
export type Warehouse = { id: string; name: string; location: string };
export type Supplier = { id: string; name: string };

export type Item = {
  id: string;
  name: string;
  sku: string;
  price: number;
  supplier_id: string | null;
};

export type SaleLine = {
  id: string;
  itemId: string | null;
  itemName: string;
  sku: string;
  qty: number;
  orderType: "stock" | "pedido";
  note?: string;
  delivered?: boolean;
  sourceWarehouses?: { warehouseId: string; warehouseName: string; qty: number }[];
  handedOver?: boolean;
  supplierId?: string;
  supplierName?: string;
};

export type Sale = {
  id: string;
  client_name: string;
  pedido_number: string;
  store_id: string;
  store_name: string;
  seller_name: string;
  total: number;
  deposit: number;
  method: string;
  status: "cobrada" | "pendiente";
  items: SaleLine[];
  created_at: string;
};

export type CashEntry = {
  id: string;
  store_id: string;
  store_name: string;
  type: "apertura" | "retirada";
  amount: number;
  note: string;
  created_at: string;
};
