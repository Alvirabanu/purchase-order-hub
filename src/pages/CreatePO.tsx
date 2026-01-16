import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useDataStore } from '@/contexts/DataStoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Plus, 
  FileText, 
  Eye, 
  CheckCircle2, 
  Loader2,
  ShoppingCart,
  Package,
  Trash2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const CreatePO = () => {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const { 
    poQueue, 
    getVendorById, 
    getProductById,
    removeFromPoQueue,
    generatePOFromQueue,
    refreshProducts 
  } = useDataStore();
  
  const canCreatePO = hasPermission('create_po');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPONumbers, setGeneratedPONumbers] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Get products in the queue with their details
  const queuedProducts = useMemo(() => {
    return poQueue.map(item => {
      const product = getProductById(item.productId);
      return {
        ...item,
        product,
      };
    }).filter(item => item.product);
  }, [poQueue, getProductById]);

  // Get only selected products for summary
  const selectedProducts = useMemo(() => {
    return queuedProducts.filter(item => selectedItems.has(item.productId));
  }, [queuedProducts, selectedItems]);

  // Group SELECTED products by vendor for summary
  const groupedByVendor = useMemo(() => {
    const groups: Record<string, { vendor: ReturnType<typeof getVendorById>; items: typeof selectedProducts }> = {};
    
    selectedProducts.forEach((item) => {
      if (!item.product) return;
      const vendorId = item.product.vendor_id;
      const vendor = getVendorById(vendorId);
      
      if (!groups[vendorId]) {
        groups[vendorId] = { vendor, items: [] };
      }
      groups[vendorId].items.push(item);
    });
    
    return groups;
  }, [selectedProducts, getVendorById]);

  const totalQueuedCount = queuedProducts.length;
  const selectedCount = selectedItems.size;
  const allSelected = totalQueuedCount > 0 && selectedCount === totalQueuedCount;
  
  const canGenerate = canCreatePO && selectedCount > 0 && 
    selectedProducts.every(item => item.quantity > 0);

  const handleSelectItem = (productId: string, checked: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(productId);
      } else {
        newSet.delete(productId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(queuedProducts.map(item => item.productId)));
    }
  };

  const handleClearSelection = () => {
    setSelectedItems(new Set());
  };

  const handleGeneratePO = async () => {
    if (selectedCount === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one item to generate a PO.",
        variant: "destructive",
      });
      return;
    }

    // Validate all selected quantities are > 0
    const invalidItems = selectedProducts.filter(item => item.quantity <= 0);
    if (invalidItems.length > 0) {
      toast({
        title: "Validation Error",
        description: "All selected products must have a PO quantity greater than 0.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Generate PO only for selected items
      await generatePOFromQueue(Array.from(selectedItems));
      
      const poNumbers = Object.entries(groupedByVendor).map(([_, group]) => 
        `PO for ${group.vendor?.name || 'Unknown Vendor'}`
      );
      
      setGeneratedPONumbers(poNumbers);
      setShowSuccess(true);
      setSelectedItems(new Set());
      await refreshProducts();

      toast({
        title: "Success!",
        description: `${Object.keys(groupedByVendor).length} Purchase Order${Object.keys(groupedByVendor).length > 1 ? 's' : ''} created successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create purchase order",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRemoveFromQueue = (productId: string) => {
    removeFromPoQueue(productId);
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(productId);
      return newSet;
    });
    toast({
      title: "Removed",
      description: "Product removed from PO queue and returned to Products",
    });
  };

  const resetForm = () => {
    setGeneratedPONumbers([]);
    setShowSuccess(false);
    setSelectedItems(new Set());
  };

  if (!canCreatePO) {
    return (
      <AppLayout>
        <div className="animate-fade-in">
          <Card>
            <CardContent className="py-16 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Not Authorized</h2>
              <p className="text-muted-foreground">
                You don't have permission to create purchase orders.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

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
                {generatedPONumbers.length} PO{generatedPONumbers.length > 1 ? 's' : ''} have been created with status "PO Created" and grouped by vendor.
              </p>

              <div className="space-y-4 mb-8">
                {generatedPONumbers.map((poNumber, idx) => (
                  <Card key={idx} className="text-left">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <p className="font-semibold text-lg">{poNumber}</p>
                          <span className="inline-flex items-center rounded-md bg-primary/10 text-primary px-2 py-1 text-xs font-medium mt-2">
                            PO Created
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
            <p className="text-muted-foreground text-sm mt-1">Select products from the queue to generate purchase orders</p>
          </div>
        </div>

        {/* Two Panel Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Queued Products Table */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    Products in Queue ({totalQueuedCount})
                  </CardTitle>
                  {totalQueuedCount > 0 && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleSelectAll}
                      >
                        {allSelected ? 'Deselect All' : 'Select All'}
                      </Button>
                      {selectedCount > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={handleClearSelection}
                        >
                          Clear Selection ({selectedCount})
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  {queuedProducts.length > 0 ? (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th className="w-12">
                            <Checkbox
                              checked={allSelected}
                              onCheckedChange={handleSelectAll}
                              aria-label="Select all"
                            />
                          </th>
                          <th>Product</th>
                          <th>Vendor</th>
                          <th className="text-center w-24">Unit</th>
                          <th className="text-right w-32">PO Quantity</th>
                          <th className="text-center w-20">Remove</th>
                        </tr>
                      </thead>
                      <tbody>
                        {queuedProducts.map((item) => {
                          if (!item.product) return null;
                          const vendor = getVendorById(item.product.vendor_id);
                          const isSelected = selectedItems.has(item.productId);
                          
                          return (
                            <tr key={item.productId} className={isSelected ? 'bg-primary/5' : ''}>
                              <td>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => handleSelectItem(item.productId, !!checked)}
                                  aria-label={`Select ${item.product.name}`}
                                />
                              </td>
                              <td>
                                <div>
                                  <span className="font-medium">{item.product.name}</span>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {item.product.brand} • {item.product.category}
                                  </div>
                                </div>
                              </td>
                              <td>{vendor?.name || '-'}</td>
                              <td className="text-center">{item.product.unit}</td>
                              <td className="text-right font-medium">{item.quantity}</td>
                              <td className="text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveFromQueue(item.productId)}
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="empty-state py-12">
                      <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium mb-1">No products in queue</h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        Add products to the PO queue from the Products page
                      </p>
                      <Button variant="outline" onClick={() => navigate('/products')}>
                        Go to Products
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Order Summary (Only Selected Items) */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedCount === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No items selected</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Select products from the queue to add to order
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
                            item.product && (
                              <div key={item.productId} className="flex justify-between items-start text-sm">
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
                            )
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Total */}
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Selected Items</span>
                        <span className="font-semibold">{selectedCount}</span>
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
                          Generate PO ({selectedCount} items)
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