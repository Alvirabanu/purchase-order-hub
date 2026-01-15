import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getPOById, getSupplierById, getProductById } from '@/lib/mockData';
import { ArrowLeft, Download, FileText, Building2 } from 'lucide-react';

const PODetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const purchaseOrder = id ? getPOById(id) : undefined;
  const supplier = purchaseOrder ? getSupplierById(purchaseOrder.supplier_id) : undefined;

  if (!purchaseOrder || !supplier) {
    return (
      <AppLayout>
        <div className="animate-fade-in">
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Purchase Order Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The requested purchase order could not be found.
              </p>
              <Button onClick={() => navigate('/po-register')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Register
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusClass = (status: string) => {
    const statusClasses: Record<string, string> = {
      draft: 'status-badge status-draft',
      pending: 'status-badge status-pending',
      approved: 'status-badge status-approved',
      completed: 'status-badge status-completed',
    };
    return statusClasses[status] || 'status-badge';
  };

  return (
    <AppLayout>
      <div className="animate-fade-in max-w-4xl mx-auto">
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate('/po-register')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Register
          </Button>
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>

        {/* PO Document */}
        <Card className="shadow-lg">
          <CardContent className="p-8">
            {/* Company Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-8">
              <div className="flex items-center gap-3 mb-4 sm:mb-0">
                <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Your Company Name</h1>
                  <p className="text-sm text-muted-foreground">123 Business Street, City 400001</p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <h2 className="text-2xl font-bold text-primary">{purchaseOrder.po_number}</h2>
                <p className="text-sm text-muted-foreground mt-1">Date: {formatDate(purchaseOrder.date)}</p>
                <span className={`${getStatusClass(purchaseOrder.status)} mt-2 inline-block`}>
                  {purchaseOrder.status.charAt(0).toUpperCase() + purchaseOrder.status.slice(1)}
                </span>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Supplier Details */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Supplier Details
              </h3>
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="font-semibold text-lg">{supplier.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">{supplier.address}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-sm">
                        <span className="text-muted-foreground">GST: </span>
                        <code className="bg-background px-2 py-0.5 rounded text-xs">{supplier.gst}</code>
                      </p>
                      <p className="text-sm mt-1">
                        <span className="text-muted-foreground">Payment Terms: </span>
                        <span className="font-medium">{supplier.payment_terms}</span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Items Table */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Order Items
              </h3>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left py-3 px-4 text-sm font-semibold">#</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold">Product</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold">Category</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold">Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrder.items.map((item, index) => {
                      const product = getProductById(item.product_id);
                      return (
                        <tr key={item.id} className="border-t">
                          <td className="py-3 px-4 text-sm text-muted-foreground">{index + 1}</td>
                          <td className="py-3 px-4 font-medium">{product?.name || 'Unknown Product'}</td>
                          <td className="py-3 px-4 text-muted-foreground">{product?.category || '-'}</td>
                          <td className="py-3 px-4 text-right font-semibold">{item.quantity}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/30">
                      <td colSpan={3} className="py-3 px-4 text-sm font-semibold text-right">
                        Total Items:
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-lg">
                        {purchaseOrder.items.reduce((sum, item) => sum + item.quantity, 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Notes */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Notes
              </h3>
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground italic">
                    Please deliver to the main warehouse. Contact purchasing department for any queries.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Footer */}
            <Separator className="my-6" />
            <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground">
              <p>Generated by PO Manager</p>
              <p>Page 1 of 1</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default PODetail;
