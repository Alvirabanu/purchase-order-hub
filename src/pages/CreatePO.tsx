import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { mockProducts, mockSuppliers, getSupplierById, getProductById } from '@/lib/mockData';
import { Product } from '@/types';
import { 
  Plus, 
  Trash2, 
  FileText, 
  Download, 
  Eye, 
  CheckCircle2, 
  Loader2,
  ShoppingCart 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface POLineItem {
  id: string;
  product_id: string;
  quantity: number;
}

interface GeneratedPO {
  po_number: string;
  supplier_id: string;
  items: POLineItem[];
}

const CreatePO = () => {
  const navigate = useNavigate();
  const [poDate, setPODate] = useState(new Date().toISOString().split('T')[0]);
  const [lineItems, setLineItems] = useState<POLineItem[]>([
    { id: '1', product_id: '', quantity: 0 }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPOs, setGeneratedPOs] = useState<GeneratedPO[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { id: Date.now().toString(), product_id: '', quantity: 0 }
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof POLineItem, value: string | number) => {
    setLineItems(lineItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const getProductDetails = (productId: string): Product | undefined => {
    return mockProducts.find(p => p.id === productId);
  };

  const handleGeneratePO = async () => {
    const validItems = lineItems.filter(item => item.product_id && item.quantity > 0);
    if (validItems.length === 0) return;

    setIsGenerating(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Group items by supplier
    const itemsBySupplier: Record<string, POLineItem[]> = {};
    validItems.forEach(item => {
      const product = getProductDetails(item.product_id);
      if (product) {
        if (!itemsBySupplier[product.supplier_id]) {
          itemsBySupplier[product.supplier_id] = [];
        }
        itemsBySupplier[product.supplier_id].push(item);
      }
    });

    // Generate PO for each supplier
    const generated: GeneratedPO[] = Object.entries(itemsBySupplier).map(([supplierId, items], index) => ({
      po_number: `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}${index}`,
      supplier_id: supplierId,
      items
    }));

    setGeneratedPOs(generated);
    setShowSuccess(true);
    setIsGenerating(false);
  };

  const resetForm = () => {
    setLineItems([{ id: '1', product_id: '', quantity: 0 }]);
    setGeneratedPOs([]);
    setShowSuccess(false);
  };

  const validItemsCount = useMemo(() => {
    return lineItems.filter(item => item.product_id && item.quantity > 0).length;
  }, [lineItems]);

  if (showSuccess) {
    return (
      <AppLayout>
        <div className="animate-fade-in max-w-3xl mx-auto">
          <Card className="border-success/30">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Purchase Orders Generated!</h2>
              <p className="text-muted-foreground mb-8">
                {generatedPOs.length} PO{generatedPOs.length > 1 ? 's' : ''} have been created and grouped by supplier.
              </p>

              <div className="space-y-4 mb-8">
                {generatedPOs.map((po) => {
                  const supplier = getSupplierById(po.supplier_id);
                  return (
                    <Card key={po.po_number} className="text-left">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div>
                            <p className="font-semibold text-lg">{po.po_number}</p>
                            <p className="text-muted-foreground text-sm">{supplier?.name}</p>
                            <p className="text-sm mt-1">{po.items.length} item{po.items.length > 1 ? 's' : ''}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate('/po-register')}
                              className="gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              View PO
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                            >
                              <Download className="h-4 w-4" />
                              Download PDF
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
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
            <p className="text-muted-foreground text-sm mt-1">Add items and generate purchase orders by supplier</p>
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

        {/* Line Items */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              Order Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Product</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground w-32">Current Stock</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground w-48">Supplier</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground w-32">Quantity</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item) => {
                    const product = item.product_id ? getProductDetails(item.product_id) : null;
                    const supplier = product ? getSupplierById(product.supplier_id) : null;
                    return (
                      <tr key={item.id} className="border-b last:border-b-0">
                        <td className="py-3 px-2">
                          <Select
                            value={item.product_id}
                            onValueChange={(value) => updateLineItem(item.id, 'product_id', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a product" />
                            </SelectTrigger>
                            <SelectContent>
                              {mockProducts.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-2 text-right">
                          {product ? (
                            <span className={product.current_stock <= product.reorder_level ? 'text-destructive font-medium' : ''}>
                              {product.current_stock}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-muted-foreground">
                            {supplier?.name || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <Input
                            type="number"
                            min="0"
                            value={item.quantity || ''}
                            onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-full text-right"
                            placeholder="0"
                          />
                        </td>
                        <td className="py-3 px-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLineItem(item.id)}
                            disabled={lineItems.length === 1}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {lineItems.map((item, index) => {
                const product = item.product_id ? getProductDetails(item.product_id) : null;
                const supplier = product ? getSupplierById(product.supplier_id) : null;
                return (
                  <Card key={item.id} className="relative">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(item.id)}
                          disabled={lineItems.length === 1}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm">Product</Label>
                        <Select
                          value={item.product_id}
                          onValueChange={(value) => updateLineItem(item.id, 'product_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a product" />
                          </SelectTrigger>
                          <SelectContent>
                            {mockProducts.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {product && (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Current Stock:</span>
                            <span className={`ml-2 font-medium ${product.current_stock <= product.reorder_level ? 'text-destructive' : ''}`}>
                              {product.current_stock}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Supplier:</span>
                            <span className="ml-2">{supplier?.name}</span>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label className="text-sm">Purchase Quantity</Label>
                        <Input
                          type="number"
                          min="0"
                          value={item.quantity || ''}
                          onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                          placeholder="Enter quantity"
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Button variant="outline" onClick={addLineItem} className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </CardContent>
        </Card>

        {/* Generate Button */}
        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={handleGeneratePO}
            disabled={validItemsCount === 0 || isGenerating}
            className="gap-2 min-w-[200px]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Generate PO ({validItemsCount} item{validItemsCount !== 1 ? 's' : ''})
              </>
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default CreatePO;
