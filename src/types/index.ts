export type UserRole = 'main_admin' | 'po_creator' | 'approval_admin';

export interface Vendor {
  id: string;
  name: string;
  gst: string;
  address: string;
  contact_person_name: string;
  contact_person_email: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  vendor_id: string;
  current_stock: number;
  reorder_level: number;
  unit: 'pcs' | 'boxes';
  default_po_quantity: number;
  include_in_create_po: boolean;
}

export interface POItem {
  id: string;
  po_id: string;
  product_id: string;
  quantity: number;
  product?: Product;
}

export type POStatus = 'created' | 'approved' | 'rejected';

export interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string;
  date: string;
  total_items: number;
  status: POStatus;
  items: POItem[];
  created_by?: string;
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface Profile {
  id: string;
  name: string;
  created_at?: string;
}

export interface DashboardStats {
  totalProducts: number;
  totalVendors: number;
  posThisMonth: number;
}

export interface PODownloadLog {
  id: string;
  po_id: string;
  downloaded_by: string;
  downloaded_at: string;
  location: string;
}
