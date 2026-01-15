export interface Supplier {
  id: string;
  name: string;
  gst: string;
  payment_terms: string;
  address: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  supplier_id: string;
  current_stock: number;
  reorder_level: number;
}

export interface POItem {
  id: string;
  po_id: string;
  product_id: string;
  quantity: number;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  date: string;
  total_items: number;
  status: 'draft' | 'pending' | 'approved' | 'completed';
  items: POItem[];
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface DashboardStats {
  totalProducts: number;
  totalSuppliers: number;
  posThisMonth: number;
}
