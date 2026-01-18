import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Product, PurchaseOrder, Vendor, POItem, POStatus, POQueueItem, UserRole } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

// App User type for credential storage
export interface AppUser {
  id: string;
  name: string;
  username: string;
  password: string;
  role: UserRole;
  created_at: string;
}

// Storage keys for local-only data
const STORAGE_KEYS = {
  PO_QUEUE: 'po_manager_po_queue',
  APP_USERS: 'po_manager_app_users',
  APP_SETTINGS: 'po_manager_app_settings',
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

// App Settings type
export interface AppSettings {
  fromEmail: string;
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
  addToPoQueue: (productId: string, quantity: number) => Promise<void>;
  addToPoQueueBatch: (items: { productId: string; quantity: number }[]) => Promise<{ added: number; skipped: number }>;
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
  deletePurchaseOrder: (id: string) => Promise<void>;
  
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
  
  // App Settings
  appSettings: AppSettings;
  updateAppSettings: (settings: Partial<AppSettings>) => void;
}

const DataStoreContext = createContext<DataStoreContextType | undefined>(undefined);

// Helper to map Supabase product to local Product type
const mapSupabaseProduct = (p: any): Product => ({
  id: p.id,
  name: p.product_name,
  brand: p.brand || '',
  category: p.category || '',
  vendor_id: p.vendor_id || '',
  current_stock: p.current_stock ?? 0,
  reorder_level: p.reorder_level ?? 0,
  unit: (p.unit as 'pcs' | 'boxes') || 'pcs',
  po_quantity: p.default_po_quantity ?? 1,
  include_in_create_po: p.include_in_po ?? true,
  added_to_po_queue: p.po_status === 'queued',
  po_status: (p.po_status as 'available' | 'queued' | 'po_created') || 'available',
});

// Helper to map Supabase vendor to local Vendor type
const mapSupabaseVendor = (v: any): Vendor => ({
  id: v.display_id || v.id, // Use display_id (V001, V002) for display, fallback to uuid
  name: v.vendor_name,
  gst: v.gst_number || '',
  address: v.address || '',
  phone: v.phone || '',
  contact_person_name: v.contact_person_name || '',
  contact_person_email: v.contact_person_email || '',
  _uuid: v.id, // Store the actual UUID for database operations
});

// Helper to map Supabase PO to local ExtendedPurchaseOrder type
const mapSupabasePO = (po: any, items: any[], vendors: Vendor[]): ExtendedPurchaseOrder => {
  // Look up vendor by UUID (_uuid) or display_id (id)
  const vendor = vendors.find(v => v._uuid === po.vendor_id || v.id === po.vendor_id);
  return {
    id: po.id,
    po_number: po.po_number,
    vendor_id: po.vendor_id || '',
    date: po.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    total_items: items.length,
    status: (po.status as POStatus) || 'created',
    items: items.map(item => ({
      id: item.id,
      po_id: item.po_id,
      product_id: item.product_id || '',
      quantity: item.quantity,
    })),
    created_by: po.created_by || '',
    vendorName: vendor?.name,
    approved_by: po.approved_by || undefined,
    approved_at: po.approved_at || undefined,
    rejected_by: po.rejected_by || undefined,
    rejected_at: po.rejected_at || undefined,
    rejection_reason: po.rejection_reason || undefined,
  };
};

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
  const [appSettings, setAppSettings] = useState<AppSettings>({ fromEmail: '' });

  // Load local-only data from localStorage
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

  // Save local-only data to localStorage
  const saveToStorage = useCallback(<T,>(key: string, data: T) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  }, []);

  // Fetch vendors from Supabase
  const fetchVendors = useCallback(async () => {
    setVendorsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      const mappedVendors = (data || []).map(mapSupabaseVendor);
      setVendors(mappedVendors);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setVendorsLoading(false);
    }
  }, []);

  // Fetch products from Supabase
  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      const mappedProducts = (data || []).map(p => mapSupabaseProduct(p));
      setProducts(mappedProducts);
      
      // Sync queue from DB po_status (products with status 'queued')
      const queuedProducts = mappedProducts.filter(p => p.po_status === 'queued');
      const storedQueue = loadFromStorage<POQueueItem[]>(STORAGE_KEYS.PO_QUEUE, []);
      
      // Merge: keep queue items that exist in DB as queued
      const validQueueIds = new Set(queuedProducts.map(p => p.id));
      const syncedQueue = storedQueue.filter(item => validQueueIds.has(item.productId));
      
      // Add any queued products not in local storage
      queuedProducts.forEach(p => {
        if (!syncedQueue.some(q => q.productId === p.id)) {
          syncedQueue.push({ productId: p.id, quantity: p.po_quantity, addedAt: new Date().toISOString() });
        }
      });
      
      setPoQueue(syncedQueue);
      saveToStorage(STORAGE_KEYS.PO_QUEUE, syncedQueue);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setProductsLoading(false);
    }
  }, [loadFromStorage, saveToStorage]);

  // Fetch purchase orders from Supabase
  const fetchPurchaseOrders = useCallback(async () => {
    setPosLoading(true);
    try {
      // First get vendors for name lookup
      const { data: vendorData } = await supabase.from('vendors').select('*');
      const vendorList = (vendorData || []).map(mapSupabaseVendor);

      // Then get POs
      const { data: poData, error: poError } = await supabase
        .from('purchase_orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (poError) throw poError;

      // Get all PO items
      const { data: itemsData, error: itemsError } = await supabase
        .from('purchase_order_items')
        .select('*');
      
      if (itemsError) throw itemsError;

      // Map items to their POs
      const itemsByPO: Record<string, any[]> = {};
      (itemsData || []).forEach(item => {
        if (!itemsByPO[item.po_id]) {
          itemsByPO[item.po_id] = [];
        }
        itemsByPO[item.po_id].push(item);
      });

      const mappedPOs = (poData || []).map(po => 
        mapSupabasePO(po, itemsByPO[po.id] || [], vendorList)
      );
      
      setPurchaseOrders(mappedPOs);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
    } finally {
      setPosLoading(false);
    }
  }, []);

  // Initialize data and set up realtime subscriptions
  useEffect(() => {
    // Load local-only data
    const storedQueue = loadFromStorage<POQueueItem[]>(STORAGE_KEYS.PO_QUEUE, []);
    const storedAppUsers = loadFromStorage<AppUser[]>(STORAGE_KEYS.APP_USERS, []);
    const storedSettings = loadFromStorage<AppSettings>(STORAGE_KEYS.APP_SETTINGS, { fromEmail: '' });
    setPoQueue(storedQueue);
    setAppUsers(storedAppUsers);
    setAppSettings(storedSettings);

    // Fetch data from Supabase
    fetchVendors();
    fetchProducts();
    fetchPurchaseOrders();

    // Set up realtime subscriptions with proper status handling
    const channels: RealtimeChannel[] = [];

    // Vendors realtime
    const vendorsChannel = supabase
      .channel('vendors-realtime-' + Date.now())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendors' }, (payload) => {
        console.log('[Realtime] Vendors changed:', payload.eventType);
        fetchVendors();
      })
      .subscribe((status, err) => {
        console.log('[Realtime] Vendors subscription status:', status);
        if (err) console.error('[Realtime] Vendors error:', err);
      });
    channels.push(vendorsChannel);

    // Products realtime
    const productsChannel = supabase
      .channel('products-realtime-' + Date.now())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
        console.log('[Realtime] Products changed:', payload.eventType);
        fetchProducts();
      })
      .subscribe((status, err) => {
        console.log('[Realtime] Products subscription status:', status);
        if (err) console.error('[Realtime] Products error:', err);
      });
    channels.push(productsChannel);

    // Purchase orders realtime
    const posChannel = supabase
      .channel('purchase-orders-realtime-' + Date.now())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_orders' }, (payload) => {
        console.log('[Realtime] Purchase orders changed:', payload.eventType);
        fetchPurchaseOrders();
      })
      .subscribe((status, err) => {
        console.log('[Realtime] Purchase orders subscription status:', status);
        if (err) console.error('[Realtime] Purchase orders error:', err);
      });
    channels.push(posChannel);

    // PO items realtime
    const poItemsChannel = supabase
      .channel('po-items-realtime-' + Date.now())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_order_items' }, (payload) => {
        console.log('[Realtime] PO items changed:', payload.eventType);
        fetchPurchaseOrders();
      })
      .subscribe((status, err) => {
        console.log('[Realtime] PO items subscription status:', status);
        if (err) console.error('[Realtime] PO items error:', err);
      });
    channels.push(poItemsChannel);

    // Cleanup subscriptions on unmount
    return () => {
      console.log('[Realtime] Cleaning up channels...');
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [loadFromStorage, fetchVendors, fetchProducts, fetchPurchaseOrders]);

  // Refresh functions
  const refreshVendors = useCallback(() => {
    fetchVendors();
  }, [fetchVendors]);

  const refreshProducts = useCallback(() => {
    fetchProducts();
  }, [fetchProducts]);

  const refreshPurchaseOrders = useCallback(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  // Product operations
  const addProduct = useCallback(async (product: Omit<Product, 'id'>) => {
    // Convert vendor display_id to UUID if needed
    let vendorUuid = product.vendor_id || null;
    if (vendorUuid) {
      const vendor = vendors.find(v => v.id === vendorUuid);
      vendorUuid = vendor?._uuid || vendorUuid;
    }
    
    const { error } = await supabase.from('products').insert({
      product_name: product.name,
      brand: product.brand || null,
      category: product.category || null,
      vendor_id: vendorUuid,
      current_stock: product.current_stock ?? 0,
      reorder_level: product.reorder_level ?? 0,
      unit: product.unit || 'pcs',
      default_po_quantity: product.po_quantity ?? 1,
      include_in_po: product.include_in_create_po ?? true,
    });
    
    if (error) {
      console.error('Error adding product:', error);
      throw error;
    }
    // Immediately refresh products for instant UI update
    await fetchProducts();
  }, [vendors, fetchProducts]);

  const addProductsBatch = useCallback(async (productsData: Omit<Product, 'id'>[]) => {
    const insertData = productsData.map(product => {
      // Convert vendor display_id to UUID if needed
      let vendorUuid = product.vendor_id || null;
      if (vendorUuid) {
        const vendor = vendors.find(v => v.id === vendorUuid);
        vendorUuid = vendor?._uuid || vendorUuid;
      }
      
      return {
        product_name: product.name,
        brand: product.brand || null,
        category: product.category || null,
        vendor_id: vendorUuid,
        current_stock: product.current_stock ?? 0,
        reorder_level: product.reorder_level ?? 0,
        unit: product.unit || 'pcs',
        default_po_quantity: product.po_quantity ?? 1,
        include_in_po: product.include_in_create_po ?? true,
      };
    });

    const { error } = await supabase.from('products').insert(insertData);
    
    if (error) {
      console.error('Error batch adding products:', error);
      throw error;
    }
    
    // Immediately refresh products for instant UI update
    await fetchProducts();
    return productsData.length;
  }, [vendors, fetchProducts]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    const supabaseUpdates: any = {};
    if (updates.name !== undefined) supabaseUpdates.product_name = updates.name;
    if (updates.brand !== undefined) supabaseUpdates.brand = updates.brand;
    if (updates.category !== undefined) supabaseUpdates.category = updates.category;
    if (updates.vendor_id !== undefined) {
      // Convert vendor display_id to UUID if needed
      let vendorUuid = updates.vendor_id;
      if (vendorUuid) {
        const vendor = vendors.find(v => v.id === vendorUuid);
        vendorUuid = vendor?._uuid || vendorUuid;
      }
      supabaseUpdates.vendor_id = vendorUuid;
    }
    if (updates.current_stock !== undefined) supabaseUpdates.current_stock = updates.current_stock;
    if (updates.reorder_level !== undefined) supabaseUpdates.reorder_level = updates.reorder_level;
    if (updates.unit !== undefined) supabaseUpdates.unit = updates.unit;
    if (updates.po_quantity !== undefined) supabaseUpdates.default_po_quantity = updates.po_quantity;
    if (updates.include_in_create_po !== undefined) supabaseUpdates.include_in_po = updates.include_in_create_po;

    if (Object.keys(supabaseUpdates).length > 0) {
      const { error } = await supabase
        .from('products')
        .update(supabaseUpdates)
        .eq('id', id);
      
      if (error) {
        console.error('Error updating product:', error);
        throw error;
      }
      // Immediately refresh products for instant UI update
      await fetchProducts();
    }

    // Also update local state for queue-related fields
    if (updates.added_to_po_queue !== undefined || updates.po_status !== undefined) {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    }
  }, [vendors, fetchProducts]);

  const deleteProduct = useCallback(async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    
    if (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
    // Immediately refresh products for instant UI update
    await fetchProducts();
  }, [fetchProducts]);

  const deleteProducts = useCallback(async (ids: string[]) => {
    const { error } = await supabase.from('products').delete().in('id', ids);
    
    if (error) {
      console.error('Error deleting products:', error);
      throw error;
    }
    // Immediately refresh products for instant UI update
    await fetchProducts();
  }, [fetchProducts]);

  // PO Queue operations - persisted to DB via po_status
  const addToPoQueue = useCallback(async (productId: string, quantity: number) => {
    if (poQueue.some(item => item.productId === productId)) {
      return;
    }
    
    // Update po_status in database
    const { error } = await supabase
      .from('products')
      .update({ po_status: 'queued', default_po_quantity: quantity, include_in_po: false })
      .eq('id', productId);
    
    if (error) {
      console.error('Error adding to queue:', error);
      throw error;
    }
    
    const newQueue = [...poQueue, { productId, quantity, addedAt: new Date().toISOString() }];
    setPoQueue(newQueue);
    saveToStorage(STORAGE_KEYS.PO_QUEUE, newQueue);
    
    // Update local product state
    setProducts(prev => prev.map(p => 
      p.id === productId 
        ? { ...p, added_to_po_queue: true, include_in_create_po: false, po_quantity: quantity, po_status: 'queued' as const } 
        : p
    ));
  }, [poQueue, saveToStorage]);

  // Batch add to PO queue - handles all products in a single operation to avoid stale state
  const addToPoQueueBatch = useCallback(async (items: { productId: string; quantity: number }[]): Promise<{ added: number; skipped: number }> => {
    // Filter out products already in queue
    const existingIds = new Set(poQueue.map(item => item.productId));
    const newItems = items.filter(item => !existingIds.has(item.productId));
    const skipped = items.length - newItems.length;
    
    if (newItems.length === 0) {
      return { added: 0, skipped };
    }
    
    // Update all products in a single batch operation
    const productIds = newItems.map(item => item.productId);
    
    // Update po_status in database for all items at once
    const { error } = await supabase
      .from('products')
      .update({ po_status: 'queued', include_in_po: false })
      .in('id', productIds);
    
    if (error) {
      console.error('Error batch adding to queue:', error);
      throw error;
    }
    
    // Update individual quantities
    for (const item of newItems) {
      await supabase
        .from('products')
        .update({ default_po_quantity: item.quantity })
        .eq('id', item.productId);
    }
    
    // Update local queue state in a single operation
    const newQueueItems = newItems.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      addedAt: new Date().toISOString(),
    }));
    
    setPoQueue(prev => {
      const updatedQueue = [...prev, ...newQueueItems];
      saveToStorage(STORAGE_KEYS.PO_QUEUE, updatedQueue);
      return updatedQueue;
    });
    
    // Update local product state in a single operation
    const productIdSet = new Set(productIds);
    const quantityMap = new Map(newItems.map(item => [item.productId, item.quantity]));
    
    setProducts(prev => prev.map(p => 
      productIdSet.has(p.id)
        ? { ...p, added_to_po_queue: true, include_in_create_po: false, po_quantity: quantityMap.get(p.id) || p.po_quantity, po_status: 'queued' as const } 
        : p
    ));
    
    return { added: newItems.length, skipped };
  }, [poQueue, saveToStorage]);

  const removeFromPoQueue = useCallback(async (productId: string) => {
    // Update po_status in database back to available
    const { error } = await supabase
      .from('products')
      .update({ po_status: 'available', include_in_po: true })
      .eq('id', productId);
    
    if (error) {
      console.error('Error removing from queue:', error);
      throw error;
    }
    
    const newQueue = poQueue.filter(item => item.productId !== productId);
    setPoQueue(newQueue);
    saveToStorage(STORAGE_KEYS.PO_QUEUE, newQueue);
    
    setProducts(prev => prev.map(p => 
      p.id === productId 
        ? { ...p, added_to_po_queue: false, include_in_create_po: true, po_status: 'available' as const } 
        : p
    ));
  }, [poQueue, saveToStorage]);

  const clearPoQueue = useCallback(async () => {
    const queuedIds = poQueue.map(item => item.productId);
    
    if (queuedIds.length > 0) {
      // Update po_status in database back to available
      const { error } = await supabase
        .from('products')
        .update({ po_status: 'available', include_in_po: true })
        .in('id', queuedIds);
      
      if (error) {
        console.error('Error clearing queue:', error);
        throw error;
      }
    }
    
    setPoQueue([]);
    saveToStorage(STORAGE_KEYS.PO_QUEUE, []);
    
    setProducts(prev => prev.map(p => 
      queuedIds.includes(p.id)
        ? { ...p, added_to_po_queue: false, include_in_create_po: true, po_status: 'available' as const }
        : p
    ));
  }, [poQueue, saveToStorage]);

  // Vendor operations
  const addVendor = useCallback(async (vendor: Omit<Vendor, 'id'>) => {
    // Check for duplicate
    const normalizedName = vendor.name.trim().toLowerCase();
    const isDuplicate = vendors.some(v => v.name.trim().toLowerCase() === normalizedName);
    
    if (isDuplicate) {
      throw new Error('A vendor with the same name already exists.');
    }

    const { error } = await supabase.from('vendors').insert({
      vendor_name: vendor.name,
      gst_number: vendor.gst || null,
      address: vendor.address || null,
      phone: vendor.phone || null,
      contact_person_name: vendor.contact_person_name || null,
      contact_person_email: vendor.contact_person_email || null,
    });
    
    if (error) {
      console.error('Error adding vendor:', error);
      throw error;
    }
    // Immediately refresh vendors for instant UI update
    await fetchVendors();
  }, [vendors, fetchVendors]);

  const addVendorsBatch = useCallback(async (vendorsData: Omit<Vendor, 'id'>[]) => {
    const existingNames = new Set(vendors.map(v => v.name.trim().toLowerCase()));
    
    const validVendors: Omit<Vendor, 'id'>[] = [];
    const duplicates: string[] = [];
    const processedNames = new Set<string>();
    
    for (const vendor of vendorsData) {
      const normalizedName = vendor.name.trim().toLowerCase();
      
      if (existingNames.has(normalizedName) || processedNames.has(normalizedName)) {
        duplicates.push(vendor.name);
        continue;
      }
      
      validVendors.push(vendor);
      processedNames.add(normalizedName);
    }
    
    if (validVendors.length > 0) {
      const insertData = validVendors.map(vendor => ({
        vendor_name: vendor.name,
        gst_number: vendor.gst || null,
        address: vendor.address || null,
        phone: vendor.phone || null,
        contact_person_name: vendor.contact_person_name || null,
        contact_person_email: vendor.contact_person_email || null,
      }));

      const { error } = await supabase.from('vendors').insert(insertData);
      
      if (error) {
        console.error('Error batch adding vendors:', error);
        throw error;
      }
      // Immediately refresh vendors for instant UI update
      await fetchVendors();
    }
    
    return { added: validVendors.length, duplicates };
  }, [vendors, fetchVendors]);

  const updateVendor = useCallback(async (id: string, updates: Partial<Vendor>) => {
    // Find the actual UUID from the vendor with this display_id
    const vendor = vendors.find(v => v.id === id);
    const uuid = vendor?._uuid || id;
    
    const supabaseUpdates: any = {};
    if (updates.name !== undefined) supabaseUpdates.vendor_name = updates.name;
    if (updates.gst !== undefined) supabaseUpdates.gst_number = updates.gst;
    if (updates.address !== undefined) supabaseUpdates.address = updates.address;
    if (updates.phone !== undefined) supabaseUpdates.phone = updates.phone;
    if (updates.contact_person_name !== undefined) supabaseUpdates.contact_person_name = updates.contact_person_name;
    if (updates.contact_person_email !== undefined) supabaseUpdates.contact_person_email = updates.contact_person_email;

    const { error } = await supabase.from('vendors').update(supabaseUpdates).eq('id', uuid);
    
    if (error) {
      console.error('Error updating vendor:', error);
      throw error;
    }
    // Immediately refresh vendors for instant UI update
    await fetchVendors();
  }, [vendors, fetchVendors]);

  const deleteVendor = useCallback(async (id: string) => {
    // Find the actual UUID from the vendor with this display_id
    const vendor = vendors.find(v => v.id === id);
    const uuid = vendor?._uuid || id;
    
    const { error } = await supabase.from('vendors').delete().eq('id', uuid);
    
    if (error) {
      console.error('Error deleting vendor:', error);
      throw error;
    }
    // Immediately refresh vendors for instant UI update
    await fetchVendors();
  }, [vendors, fetchVendors]);

  const deleteVendors = useCallback(async (ids: string[]) => {
    // Convert display_ids to UUIDs
    const uuids = ids.map(id => {
      const vendor = vendors.find(v => v.id === id);
      return vendor?._uuid || id;
    });
    
    const { error } = await supabase.from('vendors').delete().in('id', uuids);
    
    if (error) {
      console.error('Error deleting vendors:', error);
      throw error;
    }
    // Immediately refresh vendors for instant UI update
    await fetchVendors();
  }, [vendors, fetchVendors]);

  // Delete PO operation
  const deletePurchaseOrder = useCallback(async (id: string) => {
    // First delete PO items
    const { error: itemsError } = await supabase
      .from('purchase_order_items')
      .delete()
      .eq('po_id', id);
    
    if (itemsError) {
      console.error('Error deleting PO items:', itemsError);
      throw itemsError;
    }

    // Then delete the PO
    const { error } = await supabase
      .from('purchase_orders')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting PO:', error);
      throw error;
    }
    
    // Immediately refresh POs for instant UI update
    await fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

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

    // vendorId might be a display_id, convert to UUID
    const vendor = vendors.find(v => v.id === vendorId || v._uuid === vendorId);
    const vendorUuid = vendor?._uuid || vendorId;
    
    const poNumber = getNextPONumber();

    // Create PO - created_by is text, stores user name
    const { data: poData, error: poError } = await supabase
      .from('purchase_orders')
      .insert({
        po_number: poNumber,
        vendor_id: vendorUuid,
        status: 'created',
        created_by: user.name,
      })
      .select()
      .single();
    
    if (poError) {
      console.error('Error creating PO:', poError);
      throw poError;
    }

    // Create PO items
    const itemsToInsert = items.map(item => ({
      po_id: poData.id,
      product_id: item.productId,
      quantity: item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from('purchase_order_items')
      .insert(itemsToInsert);
    
    if (itemsError) {
      console.error('Error creating PO items:', itemsError);
      throw itemsError;
    }

    // Mark products as included in PO (hide from products list)
    const productIds = items.map(item => item.productId);
    await supabase
      .from('products')
      .update({ include_in_po: false })
      .in('id', productIds);

    // Immediately refresh POs and products for instant UI update
    await fetchPurchaseOrders();
    await fetchProducts();
  }, [user, vendors, getNextPONumber, fetchPurchaseOrders, fetchProducts]);

  const generatePOFromQueue = useCallback(async (selectedProductIds?: string[]) => {
    if (!user) throw new Error('Must be logged in to create PO');
    if (poQueue.length === 0) throw new Error('No items in queue');

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

    // Get current max PO number from database to avoid duplicates
    const { data: existingPOs } = await supabase
      .from('purchase_orders')
      .select('po_number')
      .order('created_at', { ascending: false });
    
    let maxPONum = 0;
    (existingPOs || []).forEach(po => {
      const match = po.po_number.match(/PO-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxPONum) maxPONum = num;
      }
    });

    // Create PO for each vendor with incrementing PO numbers
    const vendorEntries = Object.entries(groupedByVendor);
    for (let i = 0; i < vendorEntries.length; i++) {
      const [vendorId, items] = vendorEntries[i];
      const poNumber = `PO-${String(maxPONum + i + 1).padStart(4, '0')}`;
      
      // Convert vendor display_id to UUID if needed
      const vendor = vendors.find(v => v.id === vendorId || v._uuid === vendorId);
      const vendorUuid = vendor?._uuid || vendorId;

      // Create PO with unique number
      const { data: poData, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
          po_number: poNumber,
          vendor_id: vendorUuid,
          status: 'created',
          created_by: user.name,
        })
        .select()
        .single();
      
      if (poError) {
        console.error('Error creating PO:', poError);
        throw poError;
      }

      // Create PO items
      const itemsToInsert = items.map(item => ({
        po_id: poData.id,
        product_id: item.productId,
        quantity: item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(itemsToInsert);
      
      if (itemsError) {
        console.error('Error creating PO items:', itemsError);
        throw itemsError;
      }

      // Mark products as 'po_created' - they will NOT return to Products
      const productIds = items.map(item => item.productId);
      await supabase
        .from('products')
        .update({ include_in_po: false, po_status: 'po_created' })
        .in('id', productIds);
    }
    // Refresh data
    await fetchPurchaseOrders();
    await fetchProducts();

    // Remove processed items from queue
    if (selectedProductIds) {
      const newQueue = poQueue.filter(item => !selectedProductIds.includes(item.productId));
      setPoQueue(newQueue);
      saveToStorage(STORAGE_KEYS.PO_QUEUE, newQueue);
    } else {
      setPoQueue([]);
      saveToStorage(STORAGE_KEYS.PO_QUEUE, []);
    }
  }, [user, poQueue, products, vendors, fetchPurchaseOrders, fetchProducts, saveToStorage]);

  const approvePurchaseOrder = useCallback(async (id: string) => {
    if (!user) throw new Error('Must be logged in to approve PO');

    const { error } = await supabase
      .from('purchase_orders')
      .update({
        status: 'approved',
        approved_by: user.name,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id);
    
    if (error) {
      console.error('Error approving PO:', error);
      throw error;
    }
    // Immediately refresh POs for instant UI update
    await fetchPurchaseOrders();
  }, [user, fetchPurchaseOrders]);

  const approvePurchaseOrders = useCallback(async (ids: string[]) => {
    if (!user) throw new Error('Must be logged in to approve POs');

    const { error } = await supabase
      .from('purchase_orders')
      .update({
        status: 'approved',
        approved_by: user.name,
        approved_at: new Date().toISOString(),
      })
      .in('id', ids);
    
    if (error) {
      console.error('Error bulk approving POs:', error);
      throw error;
    }
    // Immediately refresh POs for instant UI update
    await fetchPurchaseOrders();
  }, [user, fetchPurchaseOrders]);

  const rejectPurchaseOrder = useCallback(async (id: string, reason?: string) => {
    if (!user) throw new Error('Must be logged in to reject PO');

    const { error } = await supabase
      .from('purchase_orders')
      .update({
        status: 'rejected',
        rejected_by: user.name,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason || '',
      })
      .eq('id', id);
    
    if (error) {
      console.error('Error rejecting PO:', error);
      throw error;
    }
    // Immediately refresh POs for instant UI update
    await fetchPurchaseOrders();
  }, [user, fetchPurchaseOrders]);

  // Lookup helpers - find vendor by display_id or UUID
  const getVendorById = useCallback((id: string) => {
    return vendors.find(v => v.id === id || v._uuid === id);
  }, [vendors]);

  const getProductById = useCallback((id: string) => {
    return products.find(p => p.id === id);
  }, [products]);

  // Download log
  const addDownloadLog = useCallback(async (poId: string, location: string) => {
    if (!user) return;
    
    await supabase.from('po_download_logs').insert({
      po_id: poId,
      location,
      downloaded_at: new Date().toISOString(),
      downloaded_by: user.name,
    });
  }, [user]);

  // App User management (local only for now)
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

  // App Settings management
  const updateAppSettings = useCallback((updates: Partial<AppSettings>) => {
    setAppSettings(prev => {
      const updated = { ...prev, ...updates };
      saveToStorage(STORAGE_KEYS.APP_SETTINGS, updated);
      return updated;
    });
  }, [saveToStorage]);

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
      addToPoQueueBatch,
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
      deletePurchaseOrder,
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
      appSettings,
      updateAppSettings,
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
