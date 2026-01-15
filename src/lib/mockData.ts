import { Supplier, Product, PurchaseOrder } from '@/types';

export const mockSuppliers: Supplier[] = [
  {
    id: '1',
    name: 'Tech Components Ltd',
    gst: '27AABCT1234C1ZV',
    payment_terms: 'Net 30',
    address: '123 Industrial Area, Mumbai, MH 400001'
  },
  {
    id: '2',
    name: 'Global Electronics Inc',
    gst: '29AADCG5678D1ZP',
    payment_terms: 'Net 45',
    address: '456 Tech Park, Bangalore, KA 560001'
  },
  {
    id: '3',
    name: 'Prime Materials Co',
    gst: '33AABCP9012E1ZQ',
    payment_terms: 'Net 15',
    address: '789 Commerce Street, Chennai, TN 600001'
  },
  {
    id: '4',
    name: 'Industrial Supplies Hub',
    gst: '24AADCI3456F1ZR',
    payment_terms: 'Net 30',
    address: '321 Factory Road, Ahmedabad, GJ 380001'
  }
];

export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Copper Wire 2.5mm',
    category: 'Electrical',
    supplier_id: '1',
    current_stock: 150,
    reorder_level: 50
  },
  {
    id: '2',
    name: 'LED Panel 40W',
    category: 'Lighting',
    supplier_id: '2',
    current_stock: 25,
    reorder_level: 30
  },
  {
    id: '3',
    name: 'Circuit Breaker 32A',
    category: 'Electrical',
    supplier_id: '1',
    current_stock: 80,
    reorder_level: 40
  },
  {
    id: '4',
    name: 'Steel Pipe 2inch',
    category: 'Plumbing',
    supplier_id: '3',
    current_stock: 200,
    reorder_level: 100
  },
  {
    id: '5',
    name: 'PVC Conduit 25mm',
    category: 'Electrical',
    supplier_id: '4',
    current_stock: 300,
    reorder_level: 150
  },
  {
    id: '6',
    name: 'Motor 5HP',
    category: 'Machinery',
    supplier_id: '2',
    current_stock: 8,
    reorder_level: 10
  }
];

export const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: '1',
    po_number: 'PO-2024-001',
    supplier_id: '1',
    date: '2024-01-15',
    total_items: 3,
    status: 'completed',
    items: [
      { id: '1', po_id: '1', product_id: '1', quantity: 100 },
      { id: '2', po_id: '1', product_id: '3', quantity: 50 }
    ]
  },
  {
    id: '2',
    po_number: 'PO-2024-002',
    supplier_id: '2',
    date: '2024-01-18',
    total_items: 2,
    status: 'approved',
    items: [
      { id: '3', po_id: '2', product_id: '2', quantity: 30 },
      { id: '4', po_id: '2', product_id: '6', quantity: 5 }
    ]
  },
  {
    id: '3',
    po_number: 'PO-2024-003',
    supplier_id: '3',
    date: '2024-01-20',
    total_items: 1,
    status: 'pending',
    items: [
      { id: '5', po_id: '3', product_id: '4', quantity: 150 }
    ]
  }
];

export const getSupplierById = (id: string): Supplier | undefined => {
  return mockSuppliers.find(s => s.id === id);
};

export const getProductById = (id: string): Product | undefined => {
  return mockProducts.find(p => p.id === id);
};

export const getPOById = (id: string): PurchaseOrder | undefined => {
  return mockPurchaseOrders.find(po => po.id === id);
};
