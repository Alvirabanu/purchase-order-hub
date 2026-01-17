import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { useDataStore } from '@/contexts/DataStoreContext';
import { Product } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Pencil, Trash2, Package, AlertCircle, FileSpreadsheet, Upload, ShoppingCart, Loader2, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Products = () => {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const isMainAdmin = user?.role === 'main_admin';
  const isPOCreator = user?.role === 'po_creator';
  const isApprovalAdmin = user?.role === 'approval_admin';
  
  const canManageProducts = hasPermission('manage_products');
  const canBulkUpload = hasPermission('bulk_upload_products');
  const canBulkDelete = hasPermission('bulk_delete_products');
  const canAddToQueue = hasPermission('add_to_po_queue');
  const canAddSingle = hasPermission('add_single_product');
  const canEditPOQuantity = hasPermission('edit_po_quantity');

  const { 
    products, 
    vendors, 
    updateProduct, 
    addProduct, 
    deleteProduct, 
    deleteProducts, 
    getVendorById,
    addToPoQueue,
  } = useDataStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isAddingToQueue, setIsAddingToQueue] = useState<string | null>(null);
  const [missingVendors, setMissingVendors] = useState<string[]>([]);
  const [showMissingVendorsDialog, setShowMissingVendorsDialog] = useState(false);
  const [showVendorWarning, setShowVendorWarning] = useState(false);
  const [pendingVendorName, setPendingVendorName] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    brand: '',
    vendor_id: '',
    current_stock: 0,
    reorder_level: 0,
    unit: 'pcs' as 'pcs' | 'boxes',
    po_quantity: 1,
  });

  const categories = [...new Set(products.map(p => p.category))];

  // Get PO queue product IDs for filtering
  const { poQueue } = useDataStore();
  const queueProductIds = new Set(poQueue.map(item => item.productId));
  
  // For ALL roles: Filter out products that are already in the PO Queue
  // This ensures products "move" to Create PO page when added
  const availableProducts = products.filter(p => !queueProductIds.has(p.id));

  const filteredProducts = availableProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVendor = vendorFilter === 'all' || product.vendor_id === vendorFilter;
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesVendor && matchesCategory;
  });

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        category: product.category,
        brand: product.brand,
        vendor_id: product.vendor_id,
        current_stock: product.current_stock,
        reorder_level: product.reorder_level,
        unit: product.unit,
        po_quantity: product.po_quantity || 1,
      });
    } else {
      setEditingProduct(null);
      setFormData({ 
        name: '', 
        category: '', 
        brand: '',
        vendor_id: '', 
        current_stock: 0, 
        reorder_level: 0,
        unit: 'pcs',
        po_quantity: 1,
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    // Check if vendor exists
    const vendorExists = vendors.some(v => v.id === formData.vendor_id);
    if (!vendorExists && formData.vendor_id) {
      setPendingVendorName(formData.vendor_id);
      setShowVendorWarning(true);
      return;
    }

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, formData);
        toast({
          title: "Product Updated",
          description: "Product has been updated successfully.",
        });
      } else {
        await addProduct({
          ...formData,
          include_in_create_po: true,
          added_to_po_queue: false,
        });
        toast({
          title: "Product Added",
          description: "New product has been added successfully.",
        });
      }
      setIsModalOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save product",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProduct(id);
      setSelectedProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      toast({
        title: "Product Deleted",
        description: "Product has been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      await deleteProducts(Array.from(selectedProducts));
      const count = selectedProducts.size;
      setSelectedProducts(new Set());
      toast({
        title: "Products Deleted",
        description: `${count} product(s) have been removed.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete products",
        variant: "destructive",
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    } else {
      setSelectedProducts(new Set());
    }
  };

  const handleSelectProduct = (id: string, checked: boolean) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handlePOQuantityChange = async (id: string, value: number) => {
    await updateProduct(id, { po_quantity: value });
  };

  const handleAddToQueue = async (e: React.MouseEvent, product: Product) => {
    // Prevent double-firing and event bubbling
    e.stopPropagation();
    e.preventDefault();
    
    const quantity = product.po_quantity || 1;
    
    if (quantity < 1) {
      toast({
        title: "Validation Error",
        description: "PO Quantity must be at least 1",
        variant: "destructive",
      });
      return;
    }

    // Check if already in queue (prevent duplicates)
    if (queueProductIds.has(product.id)) {
      toast({
        title: "Already in Queue",
        description: `${product.name} is already in the PO Queue`,
        variant: "default",
      });
      return;
    }

    // Check if vendor exists
    const vendorExists = vendors.some(v => v.id === product.vendor_id);
    if (!vendorExists) {
      const vendor = getVendorById(product.vendor_id);
      setPendingVendorName(vendor?.name || product.vendor_id);
      setShowVendorWarning(true);
      return;
    }

    setIsAddingToQueue(product.id);
    try {
      addToPoQueue(product.id, quantity);
      
      toast({
        title: "Added to PO Queue",
        description: `${product.name} added to Create PO queue`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add to queue",
        variant: "destructive",
      });
    } finally {
      setIsAddingToQueue(null);
    }
  };

  const handleDownloadTemplate = () => {
    // Template matches Products table columns (blank headers only)
    const headers = ['Product Name', 'Brand', 'Category', 'Supplier/Vendor', 'Current Stock', 'Reorder Level', 'Unit', 'PO Quantity'];
    const csvContent = headers.join(',') + '\n';
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'products_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Template Downloaded",
      description: "Blank Excel template has been downloaded.",
    });
  };

  const handleUploadExcel = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Parse CSV/Excel file
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({
          title: "Error",
          description: "File is empty or has no data rows",
          variant: "destructive",
        });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const vendorIndex = headers.findIndex(h => h.includes('vendor') || h.includes('supplier'));
      const nameIndex = headers.findIndex(h => h.includes('product') && h.includes('name'));
      const brandIndex = headers.findIndex(h => h.includes('brand'));
      const categoryIndex = headers.findIndex(h => h.includes('category'));
      const stockIndex = headers.findIndex(h => h.includes('stock'));
      const reorderIndex = headers.findIndex(h => h.includes('reorder'));
      const unitIndex = headers.findIndex(h => h.includes('unit'));
      const poQtyIndex = headers.findIndex(h => h.includes('po') && h.includes('quantity'));
      
      if (vendorIndex === -1) {
        toast({
          title: "Error",
          description: "Vendor/Supplier column not found in file",
          variant: "destructive",
        });
        return;
      }

      // Check for missing vendors
      const uploadedVendors = new Set<string>();
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const vendorName = values[vendorIndex]?.trim();
        if (vendorName) {
          uploadedVendors.add(vendorName);
        }
      }

      const existingVendorNames = vendors.map(v => v.name.toLowerCase());
      const missing = Array.from(uploadedVendors).filter(
        v => !existingVendorNames.includes(v.toLowerCase())
      );

      if (missing.length > 0) {
        setMissingVendors(missing);
        setShowMissingVendorsDialog(true);
      } else {
        // Process and import products
        let importedCount = 0;
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const vendorName = values[vendorIndex];
          const vendor = vendors.find(v => v.name.toLowerCase() === vendorName?.toLowerCase());
          
          if (vendor) {
            const name = nameIndex >= 0 ? values[nameIndex] : '';
            const brand = brandIndex >= 0 ? values[brandIndex] : '';
            const category = categoryIndex >= 0 ? values[categoryIndex] : '';
            const currentStock = stockIndex >= 0 ? parseInt(values[stockIndex]) || 0 : 0;
            const reorderLevel = reorderIndex >= 0 ? parseInt(values[reorderIndex]) || 0 : 0;
            let unit = unitIndex >= 0 ? values[unitIndex]?.toLowerCase() : 'pcs';
            if (unit !== 'pcs' && unit !== 'boxes') unit = 'pcs';
            const poQuantity = poQtyIndex >= 0 ? parseInt(values[poQtyIndex]) || 1 : 1;
            
            if (name) {
              await addProduct({
                name,
                brand,
                category,
                vendor_id: vendor.id,
                current_stock: currentStock,
                reorder_level: reorderLevel,
                unit: unit as 'pcs' | 'boxes',
                po_quantity: poQuantity,
                include_in_create_po: true,
                added_to_po_queue: false,
              });
              importedCount++;
            }
          }
        }
        
        toast({
          title: "Import Complete",
          description: `${importedCount} product(s) imported successfully.`,
        });
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  };

  const handleDownloadMissingVendorTemplate = () => {
    const headers = ['Vendor ID', 'Vendor Name', 'Address', 'GST Number', 'Contact Person Name', 'Contact Person Email'];
    const rows = missingVendors.map(v => `,${v},,,,`);
    const csvContent = headers.join(',') + '\n' + rows.join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'missing_vendors_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Template Downloaded",
      description: "Vendor template with missing vendors has been downloaded.",
    });
  };

  const handleGoToVendors = () => {
    setShowVendorWarning(false);
    setIsModalOpen(false);
    navigate('/vendors', { state: { prefillVendorName: pendingVendorName } });
  };

  const handleIntegerInput = (value: string): number => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  };

  const allSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedProducts.has(p.id));
  const someSelected = selectedProducts.size > 0;

  // Determine if user can add products (Admin can manage, PO Creator can add single)
  const canAddProduct = canManageProducts || canAddSingle;

  // Check authorization - Approval Admin should see read-only view
  if (!hasPermission('view_products')) {
    return (
      <AppLayout>
        <div className="animate-fade-in">
          <Card>
            <CardContent className="py-16 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Not Authorized</h2>
              <p className="text-muted-foreground">
                You don't have permission to view products.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="page-title">Products</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {isMainAdmin ? 'Manage your product catalog' : 
               isPOCreator ? 'View products and add to PO queue' :
               'View product catalog (read-only)'}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Main Admin: Bulk operations */}
            {canBulkUpload && (
              <>
                <Button variant="outline" className="gap-2" onClick={handleDownloadTemplate}>
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
                <Button 
                  variant="outline" 
                  className="gap-2" 
                  onClick={handleUploadExcel}
                >
                  <Upload className="h-4 w-4" />
                  Upload Excel
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </>
            )}
            {/* Add Product button for Admin or PO Creator (single) */}
            {canAddProduct && (
              <Button 
                onClick={() => handleOpenModal()} 
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="All Vendors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {vendors.map(vendor => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions - Only for Main Admin */}
        {someSelected && canBulkDelete && (
          <Card className="mb-4 border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedProducts.size} product{selectedProducts.size > 1 ? 's' : ''} selected
              </span>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleBulkDelete}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Products Table */}
        <Card>
          <div className="overflow-x-auto">
            {filteredProducts.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    {canBulkDelete && (
                      <th className="w-12">
                        <Checkbox 
                          checked={allSelected}
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                    )}
                    <th>Product Name</th>
                    <th>Brand</th>
                    <th>Category</th>
                    <th>Supplier/Vendor</th>
                    <th className="text-right">Current Stock</th>
                    <th className="text-right">Reorder Level</th>
                    <th>Unit</th>
                    {!isApprovalAdmin && <th className="text-right w-28">PO Quantity</th>}
                    {canAddToQueue && <th className="text-center">Add to PO</th>}
                    {canManageProducts && <th className="text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const vendor = getVendorById(product.vendor_id);
                    const isLowStock = product.current_stock <= product.reorder_level;
                    
                    return (
                      <tr key={product.id}>
                        {canBulkDelete && (
                          <td>
                            <Checkbox 
                              checked={selectedProducts.has(product.id)}
                              onCheckedChange={(checked) => handleSelectProduct(product.id, !!checked)}
                            />
                          </td>
                        )}
                        <td className="font-medium">{product.name}</td>
                        <td>{product.brand}</td>
                        <td>
                          <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium">
                            {product.category}
                          </span>
                        </td>
                        <td>{vendor?.name || '-'}</td>
                        <td className="text-right">
                          <span className={`font-medium ${isLowStock ? 'text-destructive' : ''}`}>
                            {product.current_stock}
                          </span>
                          {isLowStock && (
                            <AlertCircle className="inline-block ml-1 h-4 w-4 text-destructive" />
                          )}
                        </td>
                        <td className="text-right">{product.reorder_level}</td>
                        <td>{product.unit}</td>
                        
                        {/* PO Quantity - editable for Admin and PO Creator */}
                        {!isApprovalAdmin && (
                          <td className="text-right">
                            <Input
                              type="number"
                              min="1"
                              step="1"
                              value={product.po_quantity || 1}
                              onChange={(e) => handlePOQuantityChange(product.id, handleIntegerInput(e.target.value))}
                              className="w-20 text-right h-8"
                              disabled={!canEditPOQuantity}
                            />
                          </td>
                        )}
                        
                        {/* Add to PO button */}
                        {canAddToQueue && (
                          <td className="text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => handleAddToQueue(e, product)}
                              disabled={isAddingToQueue === product.id || (product.po_quantity || 1) < 1}
                              className="gap-1"
                            >
                              {isAddingToQueue === product.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ShoppingCart className="h-4 w-4" />
                              )}
                              Add
                            </Button>
                          </td>
                        )}
                        
                        {/* Main Admin: Edit/Delete actions */}
                        {canManageProducts && (
                          <td className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenModal(product)}
                                className="h-8 w-8"
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(product.id)}
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="empty-state py-16">
                <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-1">
                  {isPOCreator ? 'No products available for PO' : 'No products found'}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {searchQuery || vendorFilter !== 'all' || categoryFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : isPOCreator 
                      ? 'All products have been added to PO queue. Wait for admin to add new products.'
                      : 'Get started by adding your first product'}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Add/Edit Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
              <DialogDescription>
                {editingProduct ? 'Update the product details below.' : 'Fill in the details to add a new product.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter product name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="e.g., Havells, Philips"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Electrical, Plumbing"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor">Supplier/Vendor</Label>
                <Select
                  value={formData.vendor_id}
                  onValueChange={(value) => setFormData({ ...formData, vendor_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map(vendor => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="current_stock">Current Stock</Label>
                  <Input
                    id="current_stock"
                    type="number"
                    value={formData.current_stock}
                    onChange={(e) => setFormData({ ...formData, current_stock: handleIntegerInput(e.target.value) })}
                    min="0"
                    step="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reorder_level">Reorder Level</Label>
                  <Input
                    id="reorder_level"
                    type="number"
                    value={formData.reorder_level}
                    onChange={(e) => setFormData({ ...formData, reorder_level: handleIntegerInput(e.target.value) })}
                    min="0"
                    step="1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value: 'pcs' | 'boxes') => setFormData({ ...formData, unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pcs">pcs</SelectItem>
                      <SelectItem value="boxes">boxes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="po_quantity">PO Quantity</Label>
                  <Input
                    id="po_quantity"
                    type="number"
                    value={formData.po_quantity}
                    onChange={(e) => setFormData({ ...formData, po_quantity: handleIntegerInput(e.target.value) })}
                    min="1"
                    step="1"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!formData.name || !formData.vendor_id}>
                {editingProduct ? 'Save Changes' : 'Add Product'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Missing Vendors Dialog */}
        <Dialog open={showMissingVendorsDialog} onOpenChange={setShowMissingVendorsDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Missing Vendors
              </DialogTitle>
              <DialogDescription>
                The following vendors from your upload are not found in the system. 
                Please upload these vendors first before importing products.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Import Blocked</AlertTitle>
                <AlertDescription>
                  Product import cannot proceed until all vendors exist in the system.
                </AlertDescription>
              </Alert>
              <div className="mt-4 max-h-40 overflow-y-auto">
                <ul className="space-y-1">
                  {missingVendors.map((vendor, idx) => (
                    <li key={idx} className="text-sm py-1 px-2 bg-muted rounded">
                      {vendor}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setShowMissingVendorsDialog(false)}>
                Cancel
              </Button>
              <Button variant="outline" onClick={() => { setShowMissingVendorsDialog(false); navigate('/vendors'); }} className="gap-2">
                Go to Vendors
              </Button>
              <Button onClick={handleDownloadMissingVendorTemplate} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Download Vendor Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Vendor Warning Dialog */}
        <Dialog open={showVendorWarning} onOpenChange={setShowVendorWarning}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-warning">
                <AlertCircle className="h-5 w-5" />
                Vendor Not Found
              </DialogTitle>
              <DialogDescription>
                The vendor does not exist in the system. Please add the vendor first.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Vendor Required</AlertTitle>
                <AlertDescription>
                  Please add the vendor first before adding this product to PO.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowVendorWarning(false)}>
                Cancel
              </Button>
              <Button onClick={handleGoToVendors} className="gap-2">
                Go to Vendors
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Products;
