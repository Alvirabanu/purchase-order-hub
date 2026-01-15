import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Product, PurchaseOrder, Vendor } from '@/types';
import { mockProducts as initialProducts, mockVendors, mockPurchaseOrders as initialPOs } from '@/lib/mockData';

// Extended PO type with additional tracking fields
export interface ExtendedPurchaseOrder extends PurchaseOrder {
  vendorName?: string;
  createdByRole?: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  canDownloadPdf?: boolean;
  canSendMail?: boolean;
}

interface DataStoreContextType {
  // Products
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  addProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  deleteProducts: (ids: string[]) => void;
  
  // Purchase Orders
  purchaseOrders: ExtendedPurchaseOrder[];
  setPurchaseOrders: React.Dispatch<React.SetStateAction<ExtendedPurchaseOrder[]>>;
  addPurchaseOrder: (po: ExtendedPurchaseOrder) => void;
  addPurchaseOrders: (pos: ExtendedPurchaseOrder[]) => void;
  approvePurchaseOrder: (id: string, approvedBy: string) => void;
  approvePurchaseOrders: (ids: string[], approvedBy: string) => void;
  
  // Vendors (read-only for now, can be extended)
  vendors: Vendor[];
  getVendorById: (id: string) => Vendor | undefined;
  getProductById: (id: string) => Product | undefined;
  
  // PO Number generator
  getNextPONumber: () => string;
}

const DataStoreContext = createContext<DataStoreContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PRODUCTS: 'po_manager_products',
  PURCHASE_ORDERS: 'po_manager_purchase_orders',
  PO_COUNTER: 'po_manager_po_counter',
};

export const DataStoreProvider = ({ children }: { children: ReactNode }) => {
  // Initialize from localStorage or use initial data
  const [products, setProducts] = useState<Product[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return stored ? JSON.parse(stored) : initialProducts;
  });
  
  const [purchaseOrders, setPurchaseOrders] = useState<ExtendedPurchaseOrder[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.PURCHASE_ORDERS);
    if (stored) {
      return JSON.parse(stored);
    }
    // Convert initial POs to extended format
    return initialPOs.map(po => ({
      ...po,
      vendorName: mockVendors.find(v => v.id === po.vendor_id)?.name,
      createdByRole: 'main_admin',
      approvedBy: po.status === 'approved' ? 'System' : null,
      approvedAt: po.status === 'approved' ? po.date : null,
      canDownloadPdf: po.status === 'approved',
      canSendMail: po.status === 'approved',
    }));
  });
  
  const [poCounter, setPOCounter] = useState<number>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.PO_COUNTER);
    return stored ? parseInt(stored, 10) : 4; // Start after existing mock data
  });
  
  const vendors = mockVendors;

  // Persist to localStorage on changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }, [products]);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PURCHASE_ORDERS, JSON.stringify(purchaseOrders));
  }, [purchaseOrders]);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PO_COUNTER, poCounter.toString());
  }, [poCounter]);

  // Product operations
  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);
  
  const addProduct = useCallback((product: Product) => {
    setProducts(prev => [...prev, product]);
  }, []);
  
  const deleteProduct = useCallback((id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  }, []);
  
  const deleteProducts = useCallback((ids: string[]) => {
    setProducts(prev => prev.filter(p => !ids.includes(p.id)));
  }, []);

  // Purchase Order operations
  const getNextPONumber = useCallback(() => {
    const num = poCounter;
    setPOCounter(prev => prev + 1);
    return `PO-${String(num).padStart(4, '0')}`;
  }, [poCounter]);
  
  const addPurchaseOrder = useCallback((po: ExtendedPurchaseOrder) => {
    setPurchaseOrders(prev => [...prev, po]);
  }, []);
  
  const addPurchaseOrders = useCallback((pos: ExtendedPurchaseOrder[]) => {
    setPurchaseOrders(prev => [...prev, ...pos]);
  }, []);
  
  const approvePurchaseOrder = useCallback((id: string, approvedBy: string) => {
    setPurchaseOrders(prev => prev.map(po => 
      po.id === id ? {
        ...po,
        status: 'approved' as const,
        approvedBy,
        approvedAt: new Date().toISOString(),
        canDownloadPdf: true,
        canSendMail: true,
      } : po
    ));
  }, []);
  
  const approvePurchaseOrders = useCallback((ids: string[], approvedBy: string) => {
    setPurchaseOrders(prev => prev.map(po => 
      ids.includes(po.id) ? {
        ...po,
        status: 'approved' as const,
        approvedBy,
        approvedAt: new Date().toISOString(),
        canDownloadPdf: true,
        canSendMail: true,
      } : po
    ));
  }, []);

  // Lookup helpers
  const getVendorById = useCallback((id: string) => {
    return vendors.find(v => v.id === id);
  }, [vendors]);
  
  const getProductById = useCallback((id: string) => {
    return products.find(p => p.id === id);
  }, [products]);

  return (
    <DataStoreContext.Provider value={{
      products,
      setProducts,
      updateProduct,
      addProduct,
      deleteProduct,
      deleteProducts,
      purchaseOrders,
      setPurchaseOrders,
      addPurchaseOrder,
      addPurchaseOrders,
      approvePurchaseOrder,
      approvePurchaseOrders,
      vendors,
      getVendorById,
      getProductById,
      getNextPONumber,
    }}>
      {children}
    </DataStoreContext.Provider>
  );
};

export const useDataStore = () => {
  const context = useContext(DataStoreContext);
  if (!context) {
    throw new Error('useDataStore must be used within a DataStoreProvider');
  }
  return context;
};
