import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useDataStore } from '@/contexts/DataStoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, CheckCircle, ClipboardList } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Approvals = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { purchaseOrders, getVendorById, approvePurchaseOrder, approvePurchaseOrders } = useDataStore();
  
  const canApprove = hasPermission('approve_po');
  const canBulkApprove = hasPermission('bulk_approve_po');

  const [selectedPOs, setSelectedPOs] = useState<Set<string>>(new Set());

  const pendingPOs = purchaseOrders.filter(po => po.status === 'created');

  const getStatusClass = (status: string) => {
    const statusClasses: Record<string, string> = {
      created: 'status-badge status-pending',
      approved: 'status-badge status-approved',
      rejected: 'status-badge status-rejected',
    };
    return statusClasses[status] || 'status-badge';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPOs(new Set(pendingPOs.map(po => po.id)));
    } else {
      setSelectedPOs(new Set());
    }
  };

  const handleSelectPO = (id: string, checked: boolean) => {
    setSelectedPOs(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleApprovePO = async (id: string) => {
    try {
      await approvePurchaseOrder(id);
      setSelectedPOs(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
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
    }
  };

  const handleBulkApprove = async () => {
    if (selectedPOs.size === 0) {
      toast({
        title: "No POs selected",
        description: "Please select at least one PO to approve.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await approvePurchaseOrders(Array.from(selectedPOs));
      const count = selectedPOs.size;
      setSelectedPOs(new Set());
      toast({
        title: "Bulk Approval Complete",
        description: `${count} purchase order(s) approved successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve POs",
        variant: "destructive",
      });
    }
  };

  const allSelected = pendingPOs.length > 0 && pendingPOs.every(po => selectedPOs.has(po.id));
  const someSelected = selectedPOs.size > 0;

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Approvals</h1>
            <p className="text-muted-foreground text-sm mt-1">Review and approve pending purchase orders</p>
          </div>
        </div>

        {/* Bulk Actions */}
        {someSelected && canBulkApprove && (
          <Card className="mb-4 border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
              <span className="text-sm font-medium">
                {selectedPOs.size} PO{selectedPOs.size > 1 ? 's' : ''} selected
              </span>
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleBulkApprove}
                className="gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Bulk Approve
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pending POs Table */}
        <Card>
          <div className="overflow-x-auto">
            {pendingPOs.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    {canBulkApprove && (
                      <th className="w-12">
                        <Checkbox 
                          checked={allSelected}
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                    )}
                    <th>PO Number</th>
                    <th>Vendor Name</th>
                    <th>Date</th>
                    <th className="text-center">Total Items</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPOs.map((po) => {
                    const vendor = getVendorById(po.vendor_id);
                    return (
                      <tr key={po.id}>
                        {canBulkApprove && (
                          <td>
                            <Checkbox 
                              checked={selectedPOs.has(po.id)}
                              onCheckedChange={(checked) => handleSelectPO(po.id, !!checked)}
                            />
                          </td>
                        )}
                        <td>
                          <span className="font-mono font-medium">{po.po_number}</span>
                        </td>
                        <td>{po.vendorName || vendor?.name || '-'}</td>
                        <td>{formatDate(po.date)}</td>
                        <td className="text-center">{po.total_items}</td>
                        <td>
                          <span className={getStatusClass(po.status)}>
                            {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end gap-1 flex-wrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/po/${po.id}`)}
                              className="gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              <span className="hidden sm:inline">View</span>
                            </Button>
                            
                            {canApprove && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApprovePO(po.id)}
                                className="gap-1 text-success hover:text-success"
                              >
                                <CheckCircle className="h-4 w-4" />
                                <span className="hidden sm:inline">Approve</span>
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
                <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-1">No pending approvals</h3>
                <p className="text-muted-foreground text-sm">
                  All purchase orders have been approved
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Approvals;
