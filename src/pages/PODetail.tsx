import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useDataStore } from '@/contexts/DataStoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Download, FileText, Building2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';

const PODetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { purchaseOrders, getVendorById, getProductById, approvePurchaseOrder, rejectPurchaseOrder } = useDataStore();
  
  const canApprove = hasPermission('approve_po');
  const canReject = hasPermission('reject_po');
  const canDownload = hasPermission('download_po');

  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const purchaseOrder = purchaseOrders.find(po => po.id === id);
  const vendor = purchaseOrder ? getVendorById(purchaseOrder.vendor_id) : undefined;

  if (!purchaseOrder) {
    return (
      <AppLayout>
        <div className="animate-fade-in">
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Purchase Order Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The purchase order you're looking for doesn't exist.
              </p>
              <Button onClick={() => navigate('/po-register')}>
                Back to PO Register
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const getStatusClass = (status: string) => {
    const statusClasses: Record<string, string> = {
      created: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return statusClasses[status] || '';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await approvePurchaseOrder(purchaseOrder.id);
      toast({
        title: "PO Approved",
        description: "Purchase order has been approved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve PO",
        variant: "destructive",
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await rejectPurchaseOrder(purchaseOrder.id);
      toast({
        title: "PO Rejected",
        description: "Purchase order has been rejected.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject PO",
        variant: "destructive",
      });
    } finally {
      setIsRejecting(false);
    }
  };

  const handleDownloadPDF = () => {
    toast({
      title: "Download Started",
      description: `Downloading ${purchaseOrder.po_number}.pdf`,
    });
  };

  return (
    <AppLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/po-register')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{purchaseOrder.po_number}</h1>
            <p className="text-muted-foreground text-sm">Purchase Order Details</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(purchaseOrder.status)}`}>
            {purchaseOrder.status === 'created' ? 'PO Created' : purchaseOrder.status.charAt(0).toUpperCase() + purchaseOrder.status.slice(1)}
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* PO Info */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">PO Number</p>
                    <p className="font-mono font-semibold">{purchaseOrder.po_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">{formatDate(purchaseOrder.date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-medium capitalize">{purchaseOrder.status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created By</p>
                    <p className="font-medium">{purchaseOrder.created_by || '-'}</p>
                  </div>
                </div>

                {purchaseOrder.status === 'approved' && purchaseOrder.approved_at && (
                  <>
                    <Separator className="my-4" />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Approved By</p>
                        <p className="font-medium">{purchaseOrder.approved_by || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Approved At</p>
                        <p className="font-medium">{formatDateTime(purchaseOrder.approved_at)}</p>
                      </div>
                    </div>
                  </>
                )}

                {purchaseOrder.status === 'rejected' && purchaseOrder.rejected_at && (
                  <>
                    <Separator className="my-4" />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Rejected By</p>
                        <p className="font-medium">{purchaseOrder.rejected_by || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Rejected At</p>
                        <p className="font-medium">{formatDateTime(purchaseOrder.rejected_at)}</p>
                      </div>
                    </div>
                    {purchaseOrder.rejection_reason && (
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground">Reason</p>
                        <p className="font-medium">{purchaseOrder.rejection_reason}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Order Items</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium">Product</th>
                        <th className="text-right py-2 font-medium">Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseOrder.items.map((item) => {
                        const product = getProductById(item.product_id);
                        return (
                          <tr key={item.id} className="border-b last:border-0">
                            <td className="py-3">
                              <div>
                                <p className="font-medium">{product?.name || 'Unknown Product'}</p>
                                {product && (
                                  <p className="text-sm text-muted-foreground">
                                    {product.brand} • {product.category}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="py-3 text-right">
                              <span className="font-medium">{item.quantity}</span>
                              <span className="text-muted-foreground ml-1">{product?.unit || 'pcs'}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Vendor Info */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vendor</p>
                    <p className="font-semibold">{vendor?.name || purchaseOrder.vendorName || 'Unknown'}</p>
                  </div>
                </div>
                {vendor && (
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Address</p>
                      <p>{vendor.address}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Contact</p>
                      <p>{vendor.contact_person_name}</p>
                      <p>{vendor.contact_person_email}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">GST</p>
                      <p className="font-mono">{vendor.gst}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <h3 className="font-semibold mb-4">Actions</h3>
                
                {purchaseOrder.status === 'created' && canApprove && (
                  <Button
                    className="w-full gap-2"
                    onClick={handleApprove}
                    disabled={isApproving}
                  >
                    {isApproving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Approve
                  </Button>
                )}

                {purchaseOrder.status === 'created' && canReject && (
                  <Button
                    variant="destructive"
                    className="w-full gap-2"
                    onClick={handleReject}
                    disabled={isRejecting}
                  >
                    {isRejecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    Reject
                  </Button>
                )}

                {purchaseOrder.status === 'approved' && canDownload && (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={handleDownloadPDF}
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                )}

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => navigate('/po-register')}
                >
                  Back to Register
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default PODetail;
