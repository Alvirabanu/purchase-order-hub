import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Product, PurchaseOrder, Vendor, POItem, POStatus, POQueueItem, UserRole } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

// App User type for credential storage
export interface AppUser {
  id: string;
  name: string;
  username: string;
  password: string;
  role: UserRole;
  created_at: string;
}

// Storage keys
const STORAGE_KEYS = {
  PRODUCTS: 'po_manager_products',
  VENDORS: 'po_manager_vendors',
  PURCHASE_ORDERS: 'po_manager_pos',
  DOWNLOAD_LOGS: 'po_manager_download_logs',
  PO_QUEUE: 'po_manager_po_queue',
  APP_USERS: 'po_manager_app_users',
  VENDOR_COUNTER: 'po_manager_vendor_counter',
};

// Extended PO type with additional tracking fields
export interface ExtendedPurchaseOrder extends Omit<PurchaseOrder, 'status'> {
  status: POStatus;
  vendorName?: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_reason?: string;
}

export interface DownloadLog {
  id: string;
  po_id: string;
  location: string;
  downloaded_at: string;
  downloaded_by: string;
}

interface DataStoreContextType {
  // Products
  products: Product[];
  productsLoading: boolean;
  refreshProducts: () => void;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  addProductsBatch: (productsData: Omit<Product, 'id'>[]) => Promise<number>;
  deleteProduct: (id: string) => Promise<void>;
  deleteProducts: (ids: string[]) => Promise<void>;
  
  // PO Queue
  poQueue: POQueueItem[];
  addToPoQueue: (productId: string, quantity: number) => void;
  removeFromPoQueue: (productId: string) => void;
  clearPoQueue: () => void;
  
  // Purchase Orders
  purchaseOrders: ExtendedPurchaseOrder[];
  posLoading: boolean;
  refreshPurchaseOrders: () => void;
  addPurchaseOrder: (vendorId: string, items: { productId: string; quantity: number }[]) => Promise<void>;
  generatePOFromQueue: (selectedProductIds?: string[]) => Promise<void>;
  approvePurchaseOrder: (id: string) => Promise<void>;
  approvePurchaseOrders: (ids: string[]) => Promise<void>;
  rejectPurchaseOrder: (id: string, reason?: string) => Promise<void>;
  
  // Vendors
  vendors: Vendor[];
  vendorsLoading: boolean;
  refreshVendors: () => void;
  addVendor: (vendor: Omit<Vendor, 'id'>) => Promise<void>;
  addVendorsBatch: (vendorsData: Omit<Vendor, 'id'>[]) => Promise<{ added: number; duplicates: string[] }>;
  updateVendor: (id: string, updates: Partial<Vendor>) => Promise<void>;
  deleteVendor: (id: string) => Promise<void>;
  deleteVendors: (ids: string[]) => Promise<void>;
  
  // Lookup helpers
  getVendorById: (id: string) => Vendor | undefined;
  getProductById: (id: string) => Product | undefined;
  
  // PO Number generator
  getNextPONumber: () => string;
  
  // Download logs
  addDownloadLog: (poId: string, location: string) => void;
  
  // App Users (credentials management)
  appUsers: AppUser[];
  addAppUser: (user: Omit<AppUser, 'id' | 'created_at'>) => void;
  deleteAppUser: (id: string) => void;
  validateCredentials: (username: string, password: string, role: UserRole) => AppUser | null;
}

const DataStoreContext = createContext<DataStoreContextType | undefined>(undefined);

// Initial sample data
const initialVendors: Vendor[] = [
  {
    id: 'V001',
    name: 'Tech Components Ltd',
    gst: '27AABCT1234C1ZV',
    address: '123 Industrial Area, Mumbai, MH 400001',
    phone: '+91 98765 43210',
    contact_person_name: 'Rahul Sharma',
    contact_person_email: 'rahul@techcomponents.com'
  },
  {
    id: 'V002',
    name: 'Global Electronics Inc',
    gst: '29AADCG5678D1ZP',
    address: '456 Tech Park, Bangalore, KA 560001',
    phone: '+91 98765 12345',
    contact_person_name: 'Priya Patel',
    contact_person_email: 'priya@globalelectronics.com'
  },
];

const initialProducts: Product[] = [
  {
    id: '1',
    name: 'Copper Wire 2.5mm',
    brand: 'Finolex',
    category: 'Electrical',
    vendor_id: 'V001',
    current_stock: 150,
    reorder_level: 50,
    unit: 'pcs',
    po_quantity: 1,
    include_in_create_po: true,
    added_to_po_queue: false,
    po_status: 'available'
  },
  {
    id: '2',
    name: 'LED Panel 40W',
    brand: 'Philips',
    category: 'Lighting',
    vendor_id: 'V002',
    current_stock: 25,
    reorder_level: 30,
    unit: 'pcs',
    po_quantity: 1,
    include_in_create_po: true,
    added_to_po_queue: false,
    po_status: 'available'
  },
];

export const DataStoreProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [purchaseOrders, setPurchaseOrders] = useState<ExtendedPurchaseOrder[]>([]);
  const [posLoading, setPosLoading] = useState(true);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [poQueue, setPoQueue] = useState<POQueueItem[]>([]);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);

  // Load data from localStorage
  const loadFromStorage = useCallback(<T,>(key: string, defaultValue: T): T => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
    }
    return defaultValue;
  }, []);

  // Save data to localStorage
  const saveToStorage = useCallback(<T,>(key: string, data: T) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  }, []);

  // Initialize data on mount
  useEffect(() => {
    const storedVendors = loadFromStorage<Vendor[]>(STORAGE_KEYS.VENDORS, []);
    const storedProducts = loadFromStorage<Product[]>(STORAGE_KEYS.PRODUCTS, []);
    const storedPOs = loadFromStorage<ExtendedPurchaseOrder[]>(STORAGE_KEYS.PURCHASE_ORDERS, []);
    const storedQueue = loadFromStorage<POQueueItem[]>(STORAGE_KEYS.PO_QUEUE, []);
    const storedAppUsers = loadFromStorage<AppUser[]>(STORAGE_KEYS.APP_USERS, []);
    const storedVendorCounter = loadFromStorage<number>(STORAGE_KEYS.VENDOR_COUNTER, 0);

    // Use stored data or initialize with defaults
    setVendors(storedVendors.length > 0 ? storedVendors : initialVendors);
    setProducts(storedProducts.length > 0 ? storedProducts : initialProducts);
    setPurchaseOrders(storedPOs);
    setPoQueue(storedQueue);
    setAppUsers(storedAppUsers);

    // Save initial data if empty
    if (storedVendors.length === 0) {
      saveToStorage(STORAGE_KEYS.VENDORS, initialVendors);
      // Initialize vendor counter based on initial vendors (V001, V002 = counter 2)
      saveToStorage(STORAGE_KEYS.VENDOR_COUNTER, 2);
    } else if (storedVendorCounter === 0) {
      // If vendors exist but counter is 0, calculate counter from existing vendor IDs
      const maxId = storedVendors.reduce((max, v) => {
        const match = v.id.match(/V(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          return num > max ? num : max;
        }
        return max;
      }, 0);
      saveToStorage(STORAGE_KEYS.VENDOR_COUNTER, maxId);
    }
    
    if (storedProducts.length === 0) {
      saveToStorage(STORAGE_KEYS.PRODUCTS, initialProducts);
    }

    setVendorsLoading(false);
    setProductsLoading(false);
    setPosLoading(false);
  }, [loadFromStorage, saveToStorage]);

  // Refresh functions
  const refreshVendors = useCallback(() => {
    const data = loadFromStorage<Vendor[]>(STORAGE_KEYS.VENDORS, []);
    setVendors(data);
  }, [loadFromStorage]);

  const refreshProducts = useCallback(() => {
    const data = loadFromStorage<Product[]>(STORAGE_KEYS.PRODUCTS, []);
    setProducts(data);
  }, [loadFromStorage]);

  const refreshPurchaseOrders = useCallback(() => {
    const data = loadFromStorage<ExtendedPurchaseOrder[]>(STORAGE_KEYS.PURCHASE_ORDERS, []);
    setPurchaseOrders(data);
  }, [loadFromStorage]);

  // Product operations
  // Helper for duplicate detection
  const isDuplicateProduct = useCallback((name: string, brand: string, vendorId: string, excludeId?: string): boolean => {
    const normalizedName = name.trim().toLowerCase();
    const normalizedBrand = (brand || '').trim().toLowerCase();
    return products.some(p => {
      if (excludeId && p.id === excludeId) return false;
      const pName = p.name.trim().toLowerCase();
      const pBrand = (p.brand || '').trim().toLowerCase();
      return pName === normalizedName && pBrand === normalizedBrand && p.vendor_id === vendorId;
    });
  }, [products]);

  const isDuplicateVendor = useCallback((name: string, excludeId?: string): boolean => {
    const normalizedName = name.trim().toLowerCase();
    return vendors.some(v => {
      if (excludeId && v.id === excludeId) return false;
      return v.name.trim().toLowerCase() === normalizedName;
    });
  }, [vendors]);

  const addProduct = useCallback(async (product: Omit<Product, 'id'>) => {
    // Duplicates are now allowed for Products (no blocking)
    const newProduct: Product = {
      ...product,
      id: 'P' + Date.now() + Math.random().toString(36).substr(2, 9),
      po_quantity: product.po_quantity || 1,
      include_in_create_po: product.include_in_create_po ?? true,
      added_to_po_queue: product.added_to_po_queue ?? false,
      po_status: product.po_status ?? 'available',
    };
    // Use functional update to prevent race conditions
    setProducts(prev => {
      const updated = [...prev, newProduct];
      saveToStorage(STORAGE_KEYS.PRODUCTS, updated);
      return updated;
    });
  }, [saveToStorage]);

  // Batch add products for bulk import
  const addProductsBatch = useCallback(async (productsData: Omit<Product, 'id'>[]) => {
    const newProducts: Product[] = productsData.map((product, idx) => ({
      ...product,
      id: 'P' + Date.now() + idx + Math.random().toString(36).substr(2, 9),
      po_quantity: product.po_quantity || 1,
      include_in_create_po: product.include_in_create_po ?? true,
      added_to_po_queue: product.added_to_po_queue ?? false,
      po_status: product.po_status ?? 'available',
    }));
    
    setProducts(prev => {
      const updated = [...prev, ...newProducts];
      saveToStorage(STORAGE_KEYS.PRODUCTS, updated);
      return updated;
    });
    
    return newProducts.length;
  }, [saveToStorage]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    const updated = products.map(p => p.id === id ? { ...p, ...updates } : p);
    setProducts(updated);
    saveToStorage(STORAGE_KEYS.PRODUCTS, updated);
  }, [products, saveToStorage]);

  const deleteProduct = useCallback(async (id: string) => {
    const updated = products.filter(p => p.id !== id);
    setProducts(updated);
    saveToStorage(STORAGE_KEYS.PRODUCTS, updated);
  }, [products, saveToStorage]);

  const deleteProducts = useCallback(async (ids: string[]) => {
    const updated = products.filter(p => !ids.includes(p.id));
    setProducts(updated);
    saveToStorage(STORAGE_KEYS.PRODUCTS, updated);
  }, [products, saveToStorage]);

  // PO Queue operations
  const addToPoQueue = useCallback((productId: string, quantity: number) => {
    // Check if already in queue
    if (poQueue.some(item => item.productId === productId)) {
      return; // Already in queue, don't add again
    }
    
    // Add to queue
    const newQueue = [...poQueue, { productId, quantity, addedAt: new Date().toISOString() }];
    setPoQueue(newQueue);
    saveToStorage(STORAGE_KEYS.PO_QUEUE, newQueue);
    
    // Mark product as queued
    const updatedProducts = products.map(p => 
      p.id === productId 
        ? { ...p, added_to_po_queue: true, include_in_create_po: false, po_quantity: quantity, po_status: 'queued' as const } 
        : p
    );
    setProducts(updatedProducts);
    saveToStorage(STORAGE_KEYS.PRODUCTS, updatedProducts);
  }, [poQueue, products, saveToStorage]);

  const removeFromPoQueue = useCallback((productId: string) => {
    const newQueue = poQueue.filter(item => item.productId !== productId);
    setPoQueue(newQueue);
    saveToStorage(STORAGE_KEYS.PO_QUEUE, newQueue);
    
    // Restore product to available status
    const updatedProducts = products.map(p => 
      p.id === productId 
        ? { ...p, added_to_po_queue: false, include_in_create_po: true, po_status: 'available' as const } 
        : p
    );
    setProducts(updatedProducts);
    saveToStorage(STORAGE_KEYS.PRODUCTS, updatedProducts);
  }, [poQueue, products, saveToStorage]);

  const clearPoQueue = useCallback(() => {
    setPoQueue([]);
    saveToStorage(STORAGE_KEYS.PO_QUEUE, []);
  }, [saveToStorage]);

  // Get next sequential vendor ID
  const getNextVendorId = useCallback((): string => {
    const currentCounter = loadFromStorage<number>(STORAGE_KEYS.VENDOR_COUNTER, 0);
    const nextCounter = currentCounter + 1;
    saveToStorage(STORAGE_KEYS.VENDOR_COUNTER, nextCounter);
    return `V${String(nextCounter).padStart(3, '0')}`;
  }, [loadFromStorage, saveToStorage]);

  // Vendor operations
  const addVendor = useCallback(async (vendor: Omit<Vendor, 'id'>) => {
    // Check for duplicate - need to read current state
    const currentVendors = loadFromStorage<Vendor[]>(STORAGE_KEYS.VENDORS, []);
    const normalizedName = vendor.name.trim().toLowerCase();
    const isDuplicate = currentVendors.some(v => v.name.trim().toLowerCase() === normalizedName);
    
    if (isDuplicate) {
      throw new Error('A vendor with the same name already exists.');
    }

    const newVendor: Vendor = {
      ...vendor,
      id: getNextVendorId(),
    };
    
    // Use functional update to prevent race conditions
    setVendors(prev => {
      const updated = [...prev, newVendor];
      saveToStorage(STORAGE_KEYS.VENDORS, updated);
      return updated;
    });
  }, [saveToStorage, loadFromStorage, getNextVendorId]);

  // Batch add vendors for bulk import (with duplicate checking)
  const addVendorsBatch = useCallback(async (vendorsData: Omit<Vendor, 'id'>[]) => {
    // Get current vendors from storage to check duplicates
    const currentVendors = loadFromStorage<Vendor[]>(STORAGE_KEYS.VENDORS, []);
    const existingNames = new Set(currentVendors.map(v => v.name.trim().toLowerCase()));
    
    const validVendors: Omit<Vendor, 'id'>[] = [];
    const duplicates: string[] = [];
    const processedNames = new Set<string>();
    
    for (const vendor of vendorsData) {
      const normalizedName = vendor.name.trim().toLowerCase();
      
      // Skip if already exists in DB or in this batch
      if (existingNames.has(normalizedName) || processedNames.has(normalizedName)) {
        duplicates.push(vendor.name);
        continue;
      }
      
      validVendors.push(vendor);
      processedNames.add(normalizedName);
    }
    
    // Get current counter and generate sequential IDs
    let currentCounter = loadFromStorage<number>(STORAGE_KEYS.VENDOR_COUNTER, 0);
    
    const newVendors: Vendor[] = validVendors.map((vendor) => {
      currentCounter++;
      return {
        ...vendor,
        id: `V${String(currentCounter).padStart(3, '0')}`,
      };
    });
    
    // Save the updated counter
    if (newVendors.length > 0) {
      saveToStorage(STORAGE_KEYS.VENDOR_COUNTER, currentCounter);
      
      setVendors(prev => {
        const updated = [...prev, ...newVendors];
        saveToStorage(STORAGE_KEYS.VENDORS, updated);
        return updated;
      });
    }
    
    return { added: newVendors.length, duplicates };
  }, [saveToStorage, loadFromStorage]);

  const updateVendor = useCallback(async (id: string, updates: Partial<Vendor>) => {
    const updated = vendors.map(v => v.id === id ? { ...v, ...updates } : v);
    setVendors(updated);
    saveToStorage(STORAGE_KEYS.VENDORS, updated);
  }, [vendors, saveToStorage]);

  const deleteVendor = useCallback(async (id: string) => {
    const updated = vendors.filter(v => v.id !== id);
    setVendors(updated);
    saveToStorage(STORAGE_KEYS.VENDORS, updated);
  }, [vendors, saveToStorage]);

  const deleteVendors = useCallback(async (ids: string[]) => {
    const updated = vendors.filter(v => !ids.includes(v.id));
    setVendors(updated);
    saveToStorage(STORAGE_KEYS.VENDORS, updated);
  }, [vendors, saveToStorage]);

  // Purchase Order operations
  const getNextPONumber = useCallback(() => {
    if (purchaseOrders.length === 0) {
      return 'PO-0001';
    }
    const lastPO = purchaseOrders.reduce((max, po) => {
      const match = po.po_number.match(/PO-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    return `PO-${String(lastPO + 1).padStart(4, '0')}`;
  }, [purchaseOrders]);

  const addPurchaseOrder = useCallback(async (vendorId: string, items: { productId: string; quantity: number }[]) => {
    if (!user) throw new Error('Must be logged in to create PO');

    const poNumber = getNextPONumber();
    const vendor = vendors.find(v => v.id === vendorId);

    const newPO: ExtendedPurchaseOrder = {
      id: 'PO' + Date.now(),
      po_number: poNumber,
      vendor_id: vendorId,
      date: new Date().toISOString().split('T')[0],
      total_items: items.length,
      status: 'created',
      items: items.map((item, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        po_id: '',
        product_id: item.productId,
        quantity: item.quantity,
      })),
      created_by: user.name,
      vendorName: vendor?.name,
    };

    // Update items with correct PO ID
    newPO.items = newPO.items.map(item => ({ ...item, po_id: newPO.id }));

    const updatedPOs = [...purchaseOrders, newPO];
    setPurchaseOrders(updatedPOs);
    saveToStorage(STORAGE_KEYS.PURCHASE_ORDERS, updatedPOs);

    // Mark products as po_created (they should NOT return to Products list)
    const updatedProducts = products.map(p => {
      if (items.some(item => item.productId === p.id)) {
        return { ...p, include_in_create_po: false, added_to_po_queue: false, po_status: 'po_created' as const };
      }
      return p;
    });
    setProducts(updatedProducts);
    saveToStorage(STORAGE_KEYS.PRODUCTS, updatedProducts);
  }, [user, getNextPONumber, vendors, purchaseOrders, products, saveToStorage]);

  const generatePOFromQueue = useCallback(async (selectedProductIds?: string[]) => {
    if (!user) throw new Error('Must be logged in to create PO');
    if (poQueue.length === 0) throw new Error('No items in queue');

    // If specific items selected, only process those
    const itemsToProcess = selectedProductIds 
      ? poQueue.filter(item => selectedProductIds.includes(item.productId))
      : poQueue;

    if (itemsToProcess.length === 0) throw new Error('No items selected');

    // Group queue items by vendor
    const groupedByVendor: Record<string, { productId: string; quantity: number }[]> = {};
    
    for (const item of itemsToProcess) {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        const vendorId = product.vendor_id;
        if (!groupedByVendor[vendorId]) {
          groupedByVendor[vendorId] = [];
        }
        groupedByVendor[vendorId].push({
          productId: item.productId,
          quantity: item.quantity,
        });
      }
    }

    // Create PO for each vendor
    for (const [vendorId, items] of Object.entries(groupedByVendor)) {
      await addPurchaseOrder(vendorId, items);
    }

    // Remove only processed items from queue (not all)
    if (selectedProductIds) {
      const newQueue = poQueue.filter(item => !selectedProductIds.includes(item.productId));
      setPoQueue(newQueue);
      saveToStorage(STORAGE_KEYS.PO_QUEUE, newQueue);
    } else {
      // Clear the entire queue if no specific selection
      clearPoQueue();
    }
  }, [user, poQueue, products, addPurchaseOrder, clearPoQueue, saveToStorage]);

  const approvePurchaseOrder = useCallback(async (id: string) => {
    if (!user) throw new Error('Must be logged in to approve PO');

    const updated = purchaseOrders.map(po => 
      po.id === id 
        ? { 
            ...po, 
            status: 'approved' as POStatus, 
            approved_by: user.name,
            approved_at: new Date().toISOString(),
          } 
        : po
    );
    setPurchaseOrders(updated);
    saveToStorage(STORAGE_KEYS.PURCHASE_ORDERS, updated);
  }, [user, purchaseOrders, saveToStorage]);

  const approvePurchaseOrders = useCallback(async (ids: string[]) => {
    if (!user) throw new Error('Must be logged in to approve POs');

    const updated = purchaseOrders.map(po => 
      ids.includes(po.id)
        ? { 
            ...po, 
            status: 'approved' as POStatus, 
            approved_by: user.name,
            approved_at: new Date().toISOString(),
          } 
        : po
    );
    setPurchaseOrders(updated);
    saveToStorage(STORAGE_KEYS.PURCHASE_ORDERS, updated);
  }, [user, purchaseOrders, saveToStorage]);

  const rejectPurchaseOrder = useCallback(async (id: string, reason?: string) => {
    if (!user) throw new Error('Must be logged in to reject PO');

    const updated = purchaseOrders.map(po => 
      po.id === id 
        ? { 
            ...po, 
            status: 'rejected' as POStatus, 
            rejected_by: user.name,
            rejected_at: new Date().toISOString(),
            rejection_reason: reason || '',
          } 
        : po
    );
    setPurchaseOrders(updated);
    saveToStorage(STORAGE_KEYS.PURCHASE_ORDERS, updated);
  }, [user, purchaseOrders, saveToStorage]);

  // Lookup helpers
  const getVendorById = useCallback((id: string) => {
    return vendors.find(v => v.id === id);
  }, [vendors]);

  const getProductById = useCallback((id: string) => {
    return products.find(p => p.id === id);
  }, [products]);

  // Download log
  const addDownloadLog = useCallback((poId: string, location: string) => {
    if (!user) return;
    
    const logs = loadFromStorage<DownloadLog[]>(STORAGE_KEYS.DOWNLOAD_LOGS, []);
    const newLog: DownloadLog = {
      id: 'DL' + Date.now(),
      po_id: poId,
      location,
      downloaded_at: new Date().toISOString(),
      downloaded_by: user.name,
    };
    logs.push(newLog);
    saveToStorage(STORAGE_KEYS.DOWNLOAD_LOGS, logs);
  }, [user, loadFromStorage, saveToStorage]);

  // App User management
  const addAppUser = useCallback((userData: Omit<AppUser, 'id' | 'created_at'>) => {
    const newUser: AppUser = {
      ...userData,
      id: 'U' + Date.now() + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
    };
    setAppUsers(prev => {
      const updated = [...prev, newUser];
      saveToStorage(STORAGE_KEYS.APP_USERS, updated);
      return updated;
    });
  }, [saveToStorage]);

  const deleteAppUser = useCallback((id: string) => {
    setAppUsers(prev => {
      const updated = prev.filter(u => u.id !== id);
      saveToStorage(STORAGE_KEYS.APP_USERS, updated);
      return updated;
    });
  }, [saveToStorage]);

  const validateCredentials = useCallback((username: string, password: string, role: UserRole): AppUser | null => {
    // Fixed credentials for Main Admin
    if (role === 'main_admin') {
      if (username.toLowerCase() === 'thofik' && password === 'thofik') {
        return {
          id: 'admin',
          name: 'Thofik (Admin)',
          username: 'thofik',
          password: 'thofik',
          role: 'main_admin',
          created_at: new Date().toISOString(),
        };
      }
      return null;
    }

    // For other roles, check against stored users
    const currentUsers = loadFromStorage<AppUser[]>(STORAGE_KEYS.APP_USERS, []);
    const matchedUser = currentUsers.find(
      u => u.username.toLowerCase() === username.toLowerCase() && 
           u.password === password && 
           u.role === role
    );
    return matchedUser || null;
  }, [loadFromStorage]);

  return (
    <DataStoreContext.Provider value={{
      products,
      productsLoading,
      refreshProducts,
      updateProduct,
      addProduct,
      addProductsBatch,
      deleteProduct,
      deleteProducts,
      poQueue,
      addToPoQueue,
      removeFromPoQueue,
      clearPoQueue,
      purchaseOrders,
      posLoading,
      refreshPurchaseOrders,
      addPurchaseOrder,
      generatePOFromQueue,
      approvePurchaseOrder,
      approvePurchaseOrders,
      rejectPurchaseOrder,
      vendors,
      vendorsLoading,
      refreshVendors,
      addVendor,
      addVendorsBatch,
      updateVendor,
      deleteVendor,
      deleteVendors,
      getVendorById,
      getProductById,
      getNextPONumber,
      addDownloadLog,
      appUsers,
      addAppUser,
      deleteAppUser,
      validateCredentials,
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
