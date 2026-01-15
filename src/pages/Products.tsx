import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { Card, CardContent } from '@/components/ui/card';
import { mockProducts, mockVendors, getVendorById } from '@/lib/mockData';
import { Product } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Pencil, Trash2, Package, AlertCircle, FileSpreadsheet, Upload } from 'lucide-react';

const Products = () => {
  const { hasPermission } = useAuth();
  const canManageProducts = hasPermission('manage_products');
  const canBulkDelete = hasPermission('bulk_delete_products');
  const canToggleInclude = hasPermission('toggle_include_in_po');

  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    brand: '',
    vendor_id: '',
    current_stock: 0,
    reorder_level: 0,
    unit: 'pcs' as 'pcs' | 'boxes',
    default_po_quantity: 0,
    include_in_create_po: true,
  });

  const categories = [...new Set(products.map(p => p.category))];

  const filteredProducts = products.filter(product => {
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
        default_po_quantity: product.default_po_quantity,
        include_in_create_po: product.include_in_create_po,
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
        default_po_quantity: 0,
        include_in_create_po: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (editingProduct) {
      setProducts(products.map(p => 
        p.id === editingProduct.id ? { ...p, ...formData } : p
      ));
    } else {
      const newProduct: Product = {
        id: Date.now().toString(),
        ...formData,
      };
      setProducts([...products, newProduct]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const handleBulkDelete = () => {
    setProducts(products.filter(p => !selectedProducts.has(p.id)));
    setSelectedProducts(new Set());
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

  const handleToggleInclude = (id: string, include: boolean) => {
    setProducts(products.map(p => 
      p.id === id ? { ...p, include_in_create_po: include } : p
    ));
  };

  const handleDownloadTemplate = () => {
    // API placeholder for downloading Excel template
    console.log('API: GET /api/products/template');
    alert('Download Blank Excel Template - API placeholder');
  };

  const handleUploadExcel = () => {
    // API placeholder for uploading Excel file
    console.log('API: POST /api/products/upload');
    alert('Upload Excel - API placeholder');
  };

  const handleIntegerInput = (value: string): number => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  };

  const allSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedProducts.has(p.id));
  const someSelected = selectedProducts.size > 0;

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Products</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your product catalog</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" className="gap-2" onClick={handleDownloadTemplate}>
              <FileSpreadsheet className="h-4 w-4" />
              Download Blank Excel Template
            </Button>
            <Button 
              variant="outline" 
              className="gap-2" 
              onClick={handleUploadExcel}
              disabled={!canManageProducts}
              title={!canManageProducts ? 'No permission' : ''}
            >
              <Upload className="h-4 w-4" />
              Upload Excel
            </Button>
            <Button 
              onClick={() => handleOpenModal()} 
              className="gap-2"
              disabled={!canManageProducts}
              title={!canManageProducts ? 'No permission' : ''}
            >
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
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
                  {mockVendors.map(vendor => (
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

        {/* Bulk Actions */}
        {someSelected && (
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
                disabled={!canBulkDelete}
                title={!canBulkDelete ? 'No permission' : ''}
              >
                <Trash2 className="h-4 w-4" />
                Bulk Delete
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
                    <th className="w-12">
                      <Checkbox 
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        disabled={!canBulkDelete}
                      />
                    </th>
                    <th>Product Name</th>
                    <th>Brand</th>
                    <th>Category</th>
                    <th>Vendor</th>
                    <th className="text-right">Current Stock</th>
                    <th className="text-right">Reorder Level</th>
                    <th>Unit</th>
                    <th className="text-right">Default PO Qty</th>
                    <th className="text-center">Include in PO</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const vendor = getVendorById(product.vendor_id);
                    const isLowStock = product.current_stock <= product.reorder_level;
                    return (
                      <tr key={product.id}>
                        <td>
                          <Checkbox 
                            checked={selectedProducts.has(product.id)}
                            onCheckedChange={(checked) => handleSelectProduct(product.id, !!checked)}
                            disabled={!canBulkDelete}
                          />
                        </td>
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
                        <td className="text-right">{product.default_po_quantity}</td>
                        <td className="text-center">
                          <Switch
                            checked={product.include_in_create_po}
                            onCheckedChange={(checked) => handleToggleInclude(product.id, checked)}
                            disabled={!canToggleInclude}
                          />
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenModal(product)}
                              className="h-8 w-8"
                              disabled={!canManageProducts}
                              title={!canManageProducts ? 'No permission' : 'Edit'}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(product.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              disabled={!canManageProducts}
                              title={!canManageProducts ? 'No permission' : 'Delete'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="empty-state py-16">
                <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-1">No products found</h3>
                <p className="text-muted-foreground text-sm">
                  {searchQuery || vendorFilter !== 'all' || categoryFilter !== 'all'
                    ? 'Try adjusting your filters'
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
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Electrical, Plumbing"
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
                <Label htmlFor="vendor">Vendor</Label>
                <Select
                  value={formData.vendor_id}
                  onValueChange={(value) => setFormData({ ...formData, vendor_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockVendors.map(vendor => (
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
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pcs">pcs</SelectItem>
                      <SelectItem value="boxes">boxes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default_po_quantity">Default PO Quantity</Label>
                  <Input
                    id="default_po_quantity"
                    type="number"
                    value={formData.default_po_quantity}
                    onChange={(e) => setFormData({ ...formData, default_po_quantity: handleIntegerInput(e.target.value) })}
                    min="0"
                    step="1"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="include_in_create_po">Include in Create PO</Label>
                <Switch
                  id="include_in_create_po"
                  checked={formData.include_in_create_po}
                  onCheckedChange={(checked) => setFormData({ ...formData, include_in_create_po: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingProduct ? 'Save Changes' : 'Add Product'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Products;
