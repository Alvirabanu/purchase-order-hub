import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useDataStore } from '@/contexts/DataStoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Eye, ClipboardList, Calendar, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const PORegister = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { 
    purchaseOrders, 
    vendors, 
    getVendorById, 
    approvePurchaseOrder, 
    approvePurchaseOrders,
    rejectPurchaseOrder 
  } = useDataStore();
  
  const canApprove = hasPermission('approve_po');
  const canReject = hasPermission('reject_po');
  const canBulkApprove = hasPermission('bulk_approve_po');

  const [searchQuery, setSearchQuery] = useState('');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedPOs, setSelectedPOs] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('created');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  
  // Reject dialog
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectingPOId, setRejectingPOId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Filter POs by status
  const createdPOs = purchaseOrders.filter(po => po.status === 'created');
  const approvedPOs = purchaseOrders.filter(po => po.status === 'approved');
  const rejectedPOs = purchaseOrders.filter(po => po.status === 'rejected');

  const getFilteredPOs = (pos: typeof purchaseOrders) => {
    return pos.filter(po => {
      const matchesSearch = po.po_number.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesVendor = vendorFilter === 'all' || po.vendor_id === vendorFilter;
      
      let matchesDate = true;
      if (dateFrom) {
        matchesDate = matchesDate && po.date >= dateFrom;
      }
      if (dateTo) {
        matchesDate = matchesDate && po.date <= dateTo;
      }
      
      return matchesSearch && matchesVendor && matchesDate;
    });
  };

  const filteredCreatedPOs = getFilteredPOs(createdPOs);
  const filteredApprovedPOs = getFilteredPOs(approvedPOs);
  const filteredRejectedPOs = getFilteredPOs(rejectedPOs);

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

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPOs(new Set(filteredCreatedPOs.map(po => po.id)));
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
    setIsApproving(true);
    try {
      await approvePurchaseOrder(id);
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

  const handleBulkApprove = async () => {
    if (selectedPOs.size === 0) {
      toast({
        title: "No POs Selected",
        description: "Please select at least one PO to approve.",
        variant: "destructive",
      });
      return;
    }
    
    setIsApproving(true);
    try {
      await approvePurchaseOrders(Array.from(selectedPOs));
      setSelectedPOs(new Set());
      toast({
        title: "Bulk Approval Complete",
        description: `${selectedPOs.size} purchase order(s) approved successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve POs",
        variant: "destructive",
      });
    } finally {
      setIsApproving(false);
    }
  };

  const openRejectDialog = (id: string) => {
    setRejectingPOId(id);
    setRejectionReason('');
    setShowRejectDialog(true);
  };

  const handleRejectPO = async () => {
    if (!rejectingPOId) return;
    
    setIsRejecting(true);
    try {
      await rejectPurchaseOrder(rejectingPOId, rejectionReason || undefined);
      toast({
        title: "PO Rejected",
        description: "Purchase order has been rejected.",
      });
      setShowRejectDialog(false);
      setRejectingPOId(null);
      setRejectionReason('');
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

  const allSelected = filteredCreatedPOs.length > 0 && filteredCreatedPOs.every(po => selectedPOs.has(po.id));
  const someSelected = selectedPOs.size > 0;

  const renderPOTable = (pos: typeof purchaseOrders, showActions: boolean = false, showApprovalInfo: boolean = false, showRejectionInfo: boolean = false) => (
    <div className="overflow-x-auto">
      {pos.length > 0 ? (
        <table className="data-table">
          <thead>
            <tr>
              {showActions && canBulkApprove && (
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
              {showApprovalInfo && <th>Approved At</th>}
              {showRejectionInfo && <th>Rejected At</th>}
              {showRejectionInfo && <th>Reason</th>}
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pos.map((po) => {
              const vendor = getVendorById(po.vendor_id);
              return (
                <tr key={po.id}>
                  {showActions && canBulkApprove && (
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
                      {po.status === 'created' ? 'PO Created' : po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                    </span>
                  </td>
                  {showApprovalInfo && (
                    <td className="text-muted-foreground text-sm">
                      {po.approved_at ? formatDateTime(po.approved_at) : '-'}
                    </td>
                  )}
                  {showRejectionInfo && (
                    <td className="text-muted-foreground text-sm">
                      {po.rejected_at ? formatDateTime(po.rejected_at) : '-'}
                    </td>
                  )}
                  {showRejectionInfo && (
                    <td className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {po.rejection_reason || '-'}
                    </td>
                  )}
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
                      
                      {showActions && canApprove && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleApprovePO(po.id)}
                          disabled={isApproving}
                          className="gap-1 text-green-600 hover:text-green-600"
                        >
                          {isApproving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          <span className="hidden sm:inline">Approve</span>
                        </Button>
                      )}
                      
                      {showActions && canReject && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openRejectDialog(po.id)}
                          className="gap-1 text-destructive hover:text-destructive"
                        >
                          <XCircle className="h-4 w-4" />
                          <span className="hidden sm:inline">Reject</span>
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
          <h3 className="text-lg font-medium mb-1">No purchase orders found</h3>
          <p className="text-muted-foreground text-sm">
            {searchQuery || vendorFilter !== 'all' || dateFrom || dateTo
              ? 'Try adjusting your filters'
              : 'Purchase orders will appear here'}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">PO Register</h1>
            <p className="text-muted-foreground text-sm mt-1">View and manage all purchase orders</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search PO number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger>
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

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  placeholder="From"
                  className="flex-1"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">to</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder="To"
                  className="flex-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions for Created POs */}
        {activeTab === 'created' && someSelected && canBulkApprove && (
          <Card className="mb-4 border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
              <span className="text-sm font-medium">
                {selectedPOs.size} PO{selectedPOs.size > 1 ? 's' : ''} selected
              </span>
              <Button 
                onClick={handleBulkApprove}
                disabled={isApproving}
                className="gap-2"
              >
                {isApproving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Bulk Approve ({selectedPOs.size})
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Tabs for PO Status */}
        <Card>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b px-4">
              <TabsList className="h-12 bg-transparent">
                <TabsTrigger value="created" className="gap-2">
                  PO Created
                  {createdPOs.length > 0 && (
                    <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium">
                      {createdPOs.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approved" className="gap-2">
                  Approved
                  {approvedPOs.length > 0 && (
                    <span className="ml-1 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-medium">
                      {approvedPOs.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="rejected" className="gap-2">
                  Rejected
                  {rejectedPOs.length > 0 && (
                    <span className="ml-1 rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium">
                      {rejectedPOs.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="created" className="m-0">
              {renderPOTable(filteredCreatedPOs, true, false, false)}
            </TabsContent>
            
            <TabsContent value="approved" className="m-0">
              {renderPOTable(filteredApprovedPOs, false, true, false)}
            </TabsContent>
            
            <TabsContent value="rejected" className="m-0">
              {renderPOTable(filteredRejectedPOs, false, false, true)}
            </TabsContent>
          </Tabs>
        </Card>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Reject Purchase Order</DialogTitle>
              <DialogDescription>
                Are you sure you want to reject this PO? You can optionally provide a reason.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Rejection Reason (Optional)</Label>
                <Textarea
                  id="reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleRejectPO}
                disabled={isRejecting}
              >
                {isRejecting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Reject PO
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default PORegister;
