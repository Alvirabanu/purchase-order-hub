import { Vendor, Product, PurchaseOrder } from "@/types";

export const mockVendors: Vendor[] = [
  {
    id: "V001",
    name: "Tech Components Ltd",
    gst: "27AABCT1234C1ZV",
    address: "123 Industrial Area, Mumbai, MH 400001",
    phone: "+91 98765 43210",
    contact_person_name: "Rahul Sharma",
    contact_person_email: "rahul@techcomponents.com",
  },
  {
    id: "V002",
    name: "Global Electronics Inc",
    gst: "29AADCG5678D1ZP",
    address: "456 Tech Park, Bangalore, KA 560001",
    phone: "+91 98765 12345",
    contact_person_name: "Priya Patel",
    contact_person_email: "priya@globalelectronics.com",
  },
  {
    id: "V004",
    name: "Industrial Supplies Hub",
    gst: "24AADCI3456F1ZR",
    address: "321 Factory Road, Ahmedabad, GJ 380001",
    phone: "+91 98765 11111",
    contact_person_name: "Amit Singh",
    contact_person_email: "amit@industrialsupplies.com",
  },
];

export const mockProducts: Product[] = [
  {
    id: "1",
    name: "Copper Wire 2.5mm",
    brand: "Finolex",
    category: "Electrical",
    vendor_id: "V001",
    current_stock: 150,
    reorder_level: 50,
    unit: "pcs",
    po_quantity: 100,
    include_in_create_po: true,
    added_to_po_queue: false,
    po_status: "available",
  },
  {
    id: "2",
    name: "LED Panel 40W",
    brand: "Philips",
    category: "Lighting",
    vendor_id: "V002",
    current_stock: 25,
    reorder_level: 30,
    unit: "pcs",
    po_quantity: 50,
    include_in_create_po: true,
    added_to_po_queue: false,
    po_status: "available",
  },
  {
    id: "3",
    name: "Circuit Breaker 32A",
    brand: "Havells",
    category: "Electrical",
    vendor_id: "V001",
    current_stock: 80,
    reorder_level: 40,
    unit: "pcs",
    po_quantity: 30,
    include_in_create_po: true,
    added_to_po_queue: false,
    po_status: "available",
  },
  {
    id: "4",
    name: "Steel Pipe 2inch",
    brand: "TATA",
    category: "Plumbing",
    vendor_id: "V003",
    current_stock: 200,
    reorder_level: 100,
    unit: "pcs",
    po_quantity: 150,
    include_in_create_po: true,
    added_to_po_queue: false,
    po_status: "available",
  },
  {
    id: "5",
    name: "PVC Conduit 25mm",
    brand: "Supreme",
    category: "Electrical",
    vendor_id: "V004",
    current_stock: 300,
    reorder_level: 150,
    unit: "boxes",
    po_quantity: 100,
    include_in_create_po: false,
    added_to_po_queue: false,
    po_status: "available",
  },
  {
    id: "6",
    name: "Motor 5HP",
    brand: "Crompton",
    category: "Machinery",
    vendor_id: "V002",
    current_stock: 8,
    reorder_level: 10,
    unit: "pcs",
    po_quantity: 5,
    include_in_create_po: true,
    added_to_po_queue: false,
    po_status: "available",
  },
];

export const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: "1",
    po_number: "PO-2024-001",
    vendor_id: "V001",
    date: "2024-01-15",
    total_items: 3,
    status: "approved",
    items: [
      { id: "1", po_id: "1", product_id: "1", quantity: 100 },
      { id: "2", po_id: "1", product_id: "3", quantity: 50 },
    ],
  },
  {
    id: "2",
    po_number: "PO-2024-002",
    vendor_id: "V002",
    date: "2024-01-18",
    total_items: 2,
    status: "approved",
    items: [
      { id: "3", po_id: "2", product_id: "2", quantity: 30 },
      { id: "4", po_id: "2", product_id: "6", quantity: 5 },
    ],
  },
  {
    id: "3",
    po_number: "PO-2024-003",
    vendor_id: "V003",
    date: "2024-01-20",
    total_items: 1,
    status: "created",
    items: [{ id: "5", po_id: "3", product_id: "4", quantity: 150 }],
  },
];

export const getVendorById = (id: string): Vendor | undefined => {
  return mockVendors.find((v) => v.id === id);
};

export const getProductById = (id: string): Product | undefined => {
  return mockProducts.find((p) => p.id === id);
};

export const getPOById = (id: string): PurchaseOrder | undefined => {
  return mockPurchaseOrders.find((po) => po.id === id);
};

// Legacy aliases for backward compatibility during migration
export const mockSuppliers = mockVendors;
export const getSupplierById = getVendorById;
