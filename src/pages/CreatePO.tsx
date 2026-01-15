import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useDataStore, ExtendedPurchaseOrder } from '@/contexts/DataStoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { Product } from '@/types';
import { 
  Plus, 
  FileText, 
  Eye, 
  CheckCircle2, 
  Loader2,
  ShoppingCart,
  Package
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface SelectedProduct {
  product: Product;
  quantity: number;
}

const CreatePO = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { products, getVendorById, addPurchaseOrders, getNextPONumber } = useDataStore();
  
  const [poDate, setPODate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedProducts, setSelectedProducts] = useState<Map<string, SelectedProduct>>(new Map());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPONumbers, setGeneratedPONumbers] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  // Filter products that have include_in_create_po = true
  const availableProducts = useMemo(() => {
    return products.filter(p => p.include_in_create_po);
  }, [products]);

  const handleIntegerInput = (value: string): number => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  };

  const handleSelectProduct = (product: Product, checked: boolean) => {
    setSelectedProducts(prev => {
      const newMap = new Map(prev);
      if (checked) {
        newMap.set(product.id, { 
          product, 
          quantity: product.default_po_quantity || 1 
        });
      } else {
        newMap.delete(product.id);
      }
      return newMap;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newMap = new Map<string, SelectedProduct>();
      availableProducts.forEach(product => {
        newMap.set(product.id, { 
          product, 
          quantity: product.default_po_quantity || 1 
        });
      });
      setSelectedProducts(newMap);
    } else {
      setSelectedProducts(new Map());
    }
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    setSelectedProducts(prev => {
      const newMap = new Map(prev);
      const item = newMap.get(productId);
      if (item) {
        newMap.set(productId, { ...item, quantity });
      }
      return newMap;
    });
  };

  const allSelected = availableProducts.length > 0 && 
    availableProducts.every(p => selectedProducts.has(p.id));

  // Group selected products by vendor for summary
  const groupedByVendor = useMemo(() => {
    const groups: Record<string, { vendor: ReturnType<typeof getVendorById>; items: SelectedProduct[] }> = {};
    
    selectedProducts.forEach((item) => {
      const vendorId = item.product.vendor_id;
      const vendor = getVendorById(vendorId);
      
      if (!groups[vendorId]) {
        groups[vendorId] = { vendor, items: [] };
      }
      groups[vendorId].items.push(item);
    });
    
    return groups;
  }, [selectedProducts, getVendorById]);

  const totalSelectedCount = selectedProducts.size;
  const canGenerate = totalSelectedCount > 0 && 
    Array.from(selectedProducts.values()).every(item => item.quantity > 0);

  const handleGeneratePO = async () => {
    if (!canGenerate) {
      toast({
        title: "Validation Error",
        description: "Please select at least one product with a valid quantity.",
        variant: "destructive",
      });
      return;
    }

    // Validate all quantities are > 0
    const invalidItems = Array.from(selectedProducts.values()).filter(item => item.quantity <= 0);
    if (invalidItems.length > 0) {
      toast({
        title: "Validation Error",
        description: "All selected products must have a quantity greater than 0.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));

    // Generate PO for each vendor with status "Created"
    const newPOs: ExtendedPurchaseOrder[] = [];
    const poNumbers: string[] = [];

    Object.entries(groupedByVendor).forEach(([vendorId, group]) => {
      const poNumber = getNextPONumber();
      poNumbers.push(poNumber);
      
      const po: ExtendedPurchaseOrder = {
        id: `po_${Date.now()}_${vendorId}`,
        po_number: poNumber,
        vendor_id: vendorId,
        vendorName: group.vendor?.name || 'Unknown Vendor',
        date: poDate,
        total_items: group.items.reduce((sum, item) => sum + item.quantity, 0),
        status: 'created',
        createdByRole: user?.role || 'unknown',
        approvedBy: null,
        approvedAt: null,
        canDownloadPdf: false,
        canSendMail: false,
        items: group.items.map((item, index) => ({
          id: `item_${Date.now()}_${index}`,
          po_id: `po_${Date.now()}_${vendorId}`,
          product_id: item.product.id,
          quantity: item.quantity,
        })),
      };
      
      newPOs.push(po);
    });

    // Save to shared store
    addPurchaseOrders(newPOs);
    
    setGeneratedPONumbers(poNumbers);
    setShowSuccess(true);
    setIsGenerating(false);

    toast({
      title: "Success!",
      description: `${newPOs.length} Purchase Order${newPOs.length > 1 ? 's' : ''} created successfully.`,
    });
  };

  const resetForm = () => {
    setSelectedProducts(new Map());
    setGeneratedPONumbers([]);
    setShowSuccess(false);
  };

  if (showSuccess) {
    return (
      <AppLayout>
        <div className="animate-fade-in max-w-3xl mx-auto">
          <Card className="border-success/30">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Purchase Orders Created!</h2>
              <p className="text-muted-foreground mb-8">
                {generatedPONumbers.length} PO{generatedPONumbers.length > 1 ? 's' : ''} have been created with status "Created" and grouped by vendor.
              </p>

              <div className="space-y-4 mb-8">
                {generatedPONumbers.map((poNumber) => (
                  <Card key={poNumber} className="text-left">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <p className="font-semibold text-lg">{poNumber}</p>
                          <span className="inline-flex items-center rounded-md bg-primary/10 text-primary px-2 py-1 text-xs font-medium mt-2">
                            Created
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/po-register')}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            View in Register
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={resetForm} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Another PO
                </Button>
                <Button variant="outline" onClick={() => navigate('/po-register')}>
                  Go to PO Register
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Create Purchase Order</h1>
            <p className="text-muted-foreground text-sm mt-1">Select products and generate purchase orders by vendor</p>
          </div>
        </div>

        {/* PO Date */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="poDate" className="font-medium whitespace-nowrap">PO Date</Label>
              <Input
                id="poDate"
                type="date"
                value={poDate}
                onChange={(e) => setPODate(e.target.value)}
                className="w-auto"
              />
            </div>
          </CardContent>
        </Card>

        {/* Two Panel Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Select Products Table */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  Select Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  {availableProducts.length > 0 ? (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th className="w-12">
                            <Checkbox 
                              checked={allSelected}
                              onCheckedChange={handleSelectAll}
                            />
                          </th>
                          <th>Product</th>
                          <th>Vendor</th>
                          <th className="text-center w-24">Unit</th>
                          <th className="text-right w-32">PO Quantity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {availableProducts.map((product) => {
                          const vendor = getVendorById(product.vendor_id);
                          const isSelected = selectedProducts.has(product.id);
                          const selectedItem = selectedProducts.get(product.id);
                          
                          return (
                            <tr key={product.id}>
                              <td>
                                <Checkbox 
                                  checked={isSelected}
                                  onCheckedChange={(checked) => handleSelectProduct(product, !!checked)}
                                />
                              </td>
                              <td>
                                <div>
                                  <span className="font-medium">{product.name}</span>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {product.brand} • {product.category}
                                  </div>
                                </div>
                              </td>
                              <td>{vendor?.name || '-'}</td>
                              <td className="text-center">{product.unit}</td>
                              <td className="text-right">
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={isSelected ? (selectedItem?.quantity || '') : product.default_po_quantity}
                                  onChange={(e) => {
                                    const qty = handleIntegerInput(e.target.value);
                                    if (isSelected) {
                                      handleQuantityChange(product.id, qty);
                                    } else {
                                      // Auto-select when quantity is changed
                                      setSelectedProducts(prev => {
                                        const newMap = new Map(prev);
                                        newMap.set(product.id, { product, quantity: qty });
                                        return newMap;
                                      });
                                    }
                                  }}
                                  className="w-24 text-right h-8"
                                  disabled={!isSelected}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="empty-state py-12">
                      <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium mb-1">No products available</h3>
                      <p className="text-muted-foreground text-sm">
                        Enable products for PO creation in the Products page
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {totalSelectedCount === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No products selected</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Select products from the table to add them to your order
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Vendor Groups */}
                    {Object.entries(groupedByVendor).map(([vendorId, group]) => (
                      <div key={vendorId} className="border rounded-lg p-3">
                        <h4 className="font-semibold text-sm mb-2 text-primary">
                          {group.vendor?.name || 'Unknown Vendor'}
                        </h4>
                        <div className="space-y-2">
                          {group.items.map((item) => (
                            <div key={item.product.id} className="flex justify-between items-start text-sm">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{item.product.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.product.brand} • {item.product.category}
                                </p>
                              </div>
                              <div className="text-right ml-2 shrink-0">
                                <span className="font-medium">{item.quantity}</span>
                                <span className="text-muted-foreground ml-1">{item.product.unit}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Total */}
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Total Selected Items</span>
                        <span className="font-semibold">{totalSelectedCount}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-muted-foreground">Vendors</span>
                        <span className="font-semibold">{Object.keys(groupedByVendor).length}</span>
                      </div>
                    </div>

                    {/* Generate Button */}
                    <Button
                      size="lg"
                      onClick={handleGeneratePO}
                      disabled={!canGenerate || isGenerating}
                      className="w-full gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4" />
                          Generate PO
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default CreatePO;
