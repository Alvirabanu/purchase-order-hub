import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Product, PurchaseOrder, Vendor, POItem, POStatus } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Extended PO type with additional tracking fields
export interface ExtendedPurchaseOrder extends Omit<PurchaseOrder, 'status'> {
  status: POStatus;
  vendorName?: string;
  createdByRole?: string;
  canDownloadPdf?: boolean;
  canSendMail?: boolean;
}

interface DataStoreContextType {
  // Products
  products: Product[];
  productsLoading: boolean;
  refreshProducts: () => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  deleteProducts: (ids: string[]) => Promise<void>;
  
  // Purchase Orders
  purchaseOrders: ExtendedPurchaseOrder[];
  posLoading: boolean;
  refreshPurchaseOrders: () => Promise<void>;
  addPurchaseOrder: (vendorId: string, items: { productId: string; quantity: number }[]) => Promise<void>;
  approvePurchaseOrder: (id: string) => Promise<void>;
  approvePurchaseOrders: (ids: string[]) => Promise<void>;
  rejectPurchaseOrder: (id: string, reason?: string) => Promise<void>;
  
  // Vendors
  vendors: Vendor[];
  vendorsLoading: boolean;
  refreshVendors: () => Promise<void>;
  addVendor: (vendor: Omit<Vendor, 'id'>) => Promise<void>;
  updateVendor: (id: string, updates: Partial<Vendor>) => Promise<void>;
  deleteVendor: (id: string) => Promise<void>;
  
  // Lookup helpers
  getVendorById: (id: string) => Vendor | undefined;
  getProductById: (id: string) => Product | undefined;
  
  // PO Number generator
  getNextPONumber: () => Promise<string>;
}

const DataStoreContext = createContext<DataStoreContextType | undefined>(undefined);

export const DataStoreProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [purchaseOrders, setPurchaseOrders] = useState<ExtendedPurchaseOrder[]>([]);
  const [posLoading, setPosLoading] = useState(true);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);

  // Fetch vendors
  const refreshVendors = useCallback(async () => {
    setVendorsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('name');

      if (error) throw error;

      setVendors(data?.map(v => ({
        id: v.id,
        name: v.vendor_name,
        gst: v.gst_number || '',
        address: v.address || '',
        contact_person_name: v.contact_person_name || '',
        contact_person_email: v.contact_person_email || '',
      })) || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setVendorsLoading(false);
    }
  }, []);

  // Fetch products
  const refreshProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('product_name');

      if (error) throw error;

      setProducts(data?.map(p => ({
        id: p.id,
        name: p.product_name,
        brand: p.brand || '',
        category: p.category || '',
        vendor_id: p.vendor_id || '',
        current_stock: p.current_stock || 0,
        reorder_level: p.reorder_level || 0,
        unit: p.unit || 'pcs',
        default_po_quantity: p.default_po_quantity || 1,
        include_in_create_po: p.include_in_po || false,
      })) || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  // Fetch purchase orders
  const refreshPurchaseOrders = useCallback(async () => {
    setPosLoading(true);
    try {
      const { data: posData, error: posError } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          purchase_order_items (*)
        `)
        .order('created_at', { ascending: false });

      if (posError) throw posError;

      const mappedPOs: ExtendedPurchaseOrder[] = (posData || []).map(po => {
        const vendor = vendors.find(v => v.id === po.vendor_id);
        return {
          id: po.id,
          po_number: po.po_number,
          vendor_id: po.vendor_id,
          date: po.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          total_items: po.purchase_order_items?.length || 0,
          status: po.status as POStatus,
          items: (po.purchase_order_items || []).map((item: any) => ({
            id: item.id,
            po_id: item.po_id,
            product_id: item.product_id,
            quantity: item.quantity,
          })),
          created_by: po.created_by,
          approved_by: po.approved_by,
          approved_at: po.approved_at,
          rejected_by: po.rejected_by,
          rejected_at: po.rejected_at,
          rejection_reason: po.rejection_reason,
          vendorName: vendor?.name,
          canDownloadPdf: po.status === 'approved',
          canSendMail: po.status === 'approved',
        };
      });

      setPurchaseOrders(mappedPOs);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
    } finally {
      setPosLoading(false);
    }
  }, [vendors]);

  // Initial load
  useEffect(() => {
    refreshVendors();
    refreshProducts();
  }, [refreshVendors, refreshProducts]);

  // Load POs after vendors are loaded
  useEffect(() => {
    if (!vendorsLoading) {
      refreshPurchaseOrders();
    }
  }, [vendorsLoading, refreshPurchaseOrders]);

  // Product operations
  const addProduct = useCallback(async (product: Omit<Product, 'id'>) => {
    const { error } = await supabase
      .from('products')
      .insert({
        product_name: product.name,
        brand: product.brand,
        category: product.category,
        vendor_id: product.vendor_id || null,
        current_stock: product.current_stock,
        reorder_level: product.reorder_level,
        unit: product.unit,
        default_po_quantity: product.default_po_quantity,
        include_in_po: product.include_in_create_po,
      });

    if (error) throw error;
    await refreshProducts();
  }, [refreshProducts]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.product_name = updates.name;
    if (updates.brand !== undefined) updateData.brand = updates.brand;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.vendor_id !== undefined) updateData.vendor_id = updates.vendor_id;
    if (updates.current_stock !== undefined) updateData.current_stock = updates.current_stock;
    if (updates.reorder_level !== undefined) updateData.reorder_level = updates.reorder_level;
    if (updates.unit !== undefined) updateData.unit = updates.unit;
    if (updates.default_po_quantity !== undefined) updateData.default_po_quantity = updates.default_po_quantity;
    if (updates.include_in_create_po !== undefined) updateData.include_in_po = updates.include_in_create_po;

    const { error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
    await refreshProducts();
  }, [refreshProducts]);

  const deleteProduct = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await refreshProducts();
  }, [refreshProducts]);

  const deleteProducts = useCallback(async (ids: string[]) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .in('id', ids);

    if (error) throw error;
    await refreshProducts();
  }, [refreshProducts]);

  // Vendor operations
  const addVendor = useCallback(async (vendor: Omit<Vendor, 'id'>) => {
    const { error } = await supabase
      .from('vendors')
      .insert({
        vendor_name: vendor.name,
        address: vendor.address,
        gst_number: vendor.gst,
        contact_person_name: vendor.contact_person_name,
        contact_person_email: vendor.contact_person_email,
      });

    if (error) throw error;
    await refreshVendors();
  }, [refreshVendors]);

  const updateVendor = useCallback(async (id: string, updates: Partial<Vendor>) => {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.vendor_name = updates.name;
    if (updates.address !== undefined) updateData.address = updates.address;
    if (updates.gst !== undefined) updateData.gst_number = updates.gst;
    if (updates.contact_person_name !== undefined) updateData.contact_person_name = updates.contact_person_name;
    if (updates.contact_person_email !== undefined) updateData.contact_person_email = updates.contact_person_email;

    const { error } = await supabase
      .from('vendors')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
    await refreshVendors();
  }, [refreshVendors]);

  const deleteVendor = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await refreshVendors();
  }, [refreshVendors]);

  // Purchase Order operations
  const getNextPONumber = useCallback(async () => {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('po_number')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (data && data.length > 0) {
      const lastNumber = data[0].po_number;
      const match = lastNumber.match(/PO-(\d+)/);
      if (match) {
        const nextNum = parseInt(match[1], 10) + 1;
        return `PO-${String(nextNum).padStart(4, '0')}`;
      }
    }
    return 'PO-0001';
  }, []);

  const addPurchaseOrder = useCallback(async (vendorId: string, items: { productId: string; quantity: number }[]) => {
    if (!user) throw new Error('Must be logged in to create PO');

    const poNumber = await getNextPONumber();

    // Insert PO
    const { data: poData, error: poError } = await supabase
      .from('purchase_orders')
      .insert({
        po_number: poNumber,
        vendor_id: vendorId,
        status: 'created',
        created_by: user.id,
      })
      .select()
      .single();

    if (poError) throw poError;

    // Insert PO items
    const poItems = items.map(item => ({
      po_id: poData.id,
      product_id: item.productId,
      quantity: item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from('purchase_order_items')
      .insert(poItems);

    if (itemsError) throw itemsError;

    // Update products to remove from PO creation list
    for (const item of items) {
      await supabase
        .from('products')
        .update({ include_in_po: false })
        .eq('id', item.productId);
    }

    await refreshProducts();
    await refreshPurchaseOrders();
  }, [user, getNextPONumber, refreshProducts, refreshPurchaseOrders]);

  const approvePurchaseOrder = useCallback(async (id: string) => {
    if (!user) throw new Error('Must be logged in to approve PO');

    const { error } = await supabase
      .from('purchase_orders')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
    await refreshPurchaseOrders();
  }, [user, refreshPurchaseOrders]);

  const approvePurchaseOrders = useCallback(async (ids: string[]) => {
    if (!user) throw new Error('Must be logged in to approve POs');

    const { error } = await supabase
      .from('purchase_orders')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .in('id', ids);

    if (error) throw error;
    await refreshPurchaseOrders();
  }, [user, refreshPurchaseOrders]);

  const rejectPurchaseOrder = useCallback(async (id: string, reason?: string) => {
    if (!user) throw new Error('Must be logged in to reject PO');

    const { error } = await supabase
      .from('purchase_orders')
      .update({
        status: 'rejected',
        rejected_by: user.id,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason || null,
      })
      .eq('id', id);

    if (error) throw error;
    await refreshPurchaseOrders();
  }, [user, refreshPurchaseOrders]);

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
      productsLoading,
      refreshProducts,
      updateProduct,
      addProduct,
      deleteProduct,
      deleteProducts,
      purchaseOrders,
      posLoading,
      refreshPurchaseOrders,
      addPurchaseOrder,
      approvePurchaseOrder,
      approvePurchaseOrders,
      rejectPurchaseOrder,
      vendors,
      vendorsLoading,
      refreshVendors,
      addVendor,
      updateVendor,
      deleteVendor,
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
