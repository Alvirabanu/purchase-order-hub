import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useDataStore } from '@/contexts/DataStoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, XCircle, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Rejected = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { purchaseOrders, getVendorById, deletePurchaseOrder } = useDataStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPoId, setDeletingPoId] = useState<string | null>(null);
  
  const canDelete = hasPermission('delete_po');

  const rejectedPOs = purchaseOrders.filter(po => po.status === 'rejected');

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

  const handleDeletePO = (poId: string) => {
    setDeletingPoId(poId);
    setDeleteDialogOpen(true);
  };

  const confirmDeletePO = async () => {
    if (!deletingPoId) return;
    
    try {
      await deletePurchaseOrder(deletingPoId);
      toast({
        title: "PO Deleted",
        description: "Rejected purchase order has been deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete PO",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeletingPoId(null);
    }
  };

  if (!hasPermission('view_rejected')) {
    return (
      <AppLayout>
        <div className="animate-fade-in">
          <Card>
            <CardContent className="py-16 text-center">
              <XCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Not Authorized</h2>
              <p className="text-muted-foreground">
                You don't have permission to view rejected POs.
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
        <div className="page-header">
          <div>
            <h1 className="page-title">Rejected POs</h1>
            <p className="text-muted-foreground text-sm mt-1">View all rejected purchase orders</p>
          </div>
        </div>

        <Card>
          <div className="overflow-x-auto">
            {rejectedPOs.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>PO Number</th>
                    <th>Vendor Name</th>
                    <th>Date</th>
                    <th className="text-center">Total Items</th>
                    <th>Rejected By</th>
                    <th>Rejected At</th>
                    <th>Reason</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rejectedPOs.map((po) => {
                    const vendor = getVendorById(po.vendor_id);
                    return (
                      <tr key={po.id}>
                        <td>
                          <span className="font-mono font-medium">{po.po_number}</span>
                        </td>
                        <td>{po.vendorName || vendor?.name || '-'}</td>
                        <td>{formatDate(po.date)}</td>
                        <td className="text-center">{po.total_items}</td>
                        <td>{po.rejected_by || '-'}</td>
                        <td>{po.rejected_at ? formatDateTime(po.rejected_at) : '-'}</td>
                        <td className="max-w-[200px] truncate text-muted-foreground">
                          {po.rejection_reason || '-'}
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/po/${po.id}`)}
                              className="gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeletePO(po.id)}
                                className="gap-1 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="empty-state py-16">
                <XCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-1">No rejected POs</h3>
                <p className="text-muted-foreground text-sm">
                  All purchase orders have been approved or are pending
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Rejected PO</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to permanently delete this rejected purchase order? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeletePO} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default Rejected;
