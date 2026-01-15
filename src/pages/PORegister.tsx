import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { mockPurchaseOrders, mockVendors, getVendorById } from '@/lib/mockData';
import { PurchaseOrder } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Eye, Download, ClipboardList, Calendar, CheckCircle, Mail } from 'lucide-react';

const PORegister = () => {
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();
  const canApprove = hasPermission('approve_po');
  const canBulkApprove = hasPermission('bulk_approve_po');
  const canDownload = hasPermission('download_pdf');
  const canSendMail = hasPermission('send_mail');

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(mockPurchaseOrders);
  const [searchQuery, setSearchQuery] = useState('');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedPOs, setSelectedPOs] = useState<Set<string>>(new Set());
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [downloadLocation, setDownloadLocation] = useState('');

  const filteredPOs = purchaseOrders.filter(po => {
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

  const getStatusClass = (status: PurchaseOrder['status']) => {
    const statusClasses = {
      created: 'status-badge status-pending',
      approved: 'status-badge status-approved',
    };
    return statusClasses[status];
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
      setSelectedPOs(new Set(filteredPOs.map(po => po.id)));
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

  const handleApprovePO = (id: string) => {
    setPurchaseOrders(prev => prev.map(po => 
      po.id === id ? { ...po, status: 'approved' as const } : po
    ));
  };

  const handleBulkApprove = () => {
    setPurchaseOrders(prev => prev.map(po => 
      selectedPOs.has(po.id) ? { ...po, status: 'approved' as const } : po
    ));
    setSelectedPOs(new Set());
  };

  const handleDownloadPDF = (id: string) => {
    // API placeholder: GET /api/po/{id}/pdf
    console.log(`API: GET /api/po/${id}/pdf`);
    alert(`Download PDF for PO - API placeholder`);
  };

  const handleSendMail = (id: string) => {
    // API placeholder: POST /api/po/{id}/send-mail
    console.log(`API: POST /api/po/${id}/send-mail`);
    alert(`Send mail for PO - API placeholder`);
  };

  const handleBulkDownload = () => {
    setShowLocationDialog(true);
  };

  const confirmBulkDownload = () => {
    // API placeholder: POST /api/po/bulk-download
    const approvedSelectedPOs = Array.from(selectedPOs).filter(id => {
      const po = purchaseOrders.find(p => p.id === id);
      return po?.status === 'approved';
    });
    console.log(`API: POST /api/po/bulk-download`, { ids: approvedSelectedPOs, location: downloadLocation });
    alert(`Bulk download ${approvedSelectedPOs.length} POs to ${downloadLocation} - API placeholder`);
    setShowLocationDialog(false);
    setDownloadLocation('');
    setSelectedPOs(new Set());
  };

  const allSelected = filteredPOs.length > 0 && filteredPOs.every(po => selectedPOs.has(po.id));
  const someSelected = selectedPOs.size > 0;
  const selectedApprovedCount = Array.from(selectedPOs).filter(id => {
    const po = purchaseOrders.find(p => p.id === id);
    return po?.status === 'approved';
  }).length;

  // Check if user can download a specific PO
  const canDownloadPO = (po: PurchaseOrder) => {
    if (!canDownload) return false;
    // PO Creator can only download if approved
    if (user?.role === 'po_creator') {
      return po.status === 'approved';
    }
    // Main Admin can download approved POs
    return po.status === 'approved';
  };

  // Check if user can send mail for a specific PO
  const canSendMailPO = (po: PurchaseOrder) => {
    return canSendMail && po.status === 'approved';
  };

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
                  {mockVendors.map(vendor => (
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

        {/* Bulk Actions */}
        {someSelected && (canBulkApprove || canDownload) && (
          <Card className="mb-4 border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
              <span className="text-sm font-medium">
                {selectedPOs.size} PO{selectedPOs.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2 flex-wrap">
                {canBulkApprove && (
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleBulkApprove}
                    className="gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Bulk Approve
                  </Button>
                )}
                {canDownload && selectedApprovedCount > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleBulkDownload}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Bulk Download ({selectedApprovedCount} approved)
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* PO Table */}
        <Card>
          <div className="overflow-x-auto">
            {filteredPOs.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    {(canBulkApprove || canDownload) && (
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
                  {filteredPOs.map((po) => {
                    const vendor = getVendorById(po.vendor_id);
                    return (
                      <tr key={po.id}>
                        {(canBulkApprove || canDownload) && (
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
                        <td>{vendor?.name || '-'}</td>
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
                            
                            {canApprove && po.status === 'created' && (
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
                            
                            {canDownloadPO(po) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadPDF(po.id)}
                                className="gap-1"
                              >
                                <Download className="h-4 w-4" />
                                <span className="hidden sm:inline">PDF</span>
                              </Button>
                            )}
                            
                            {canSendMailPO(po) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSendMail(po.id)}
                                className="gap-1"
                              >
                                <Mail className="h-4 w-4" />
                                <span className="hidden sm:inline">Send</span>
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
                <p className="text-muted-foreground text-sm mb-4">
                  {searchQuery || vendorFilter !== 'all' || dateFrom || dateTo
                    ? 'Try adjusting your filters'
                    : 'Get started by creating your first purchase order'}
                </p>
                <Button onClick={() => navigate('/create-po')}>
                  Create Purchase Order
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Location Selection Dialog for Bulk Download */}
        <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Bulk Download POs</DialogTitle>
              <DialogDescription>
                Enter or select a location for the downloaded files.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-2">
                <Label htmlFor="location">Download Location</Label>
                <Input
                  id="location"
                  value={downloadLocation}
                  onChange={(e) => setDownloadLocation(e.target.value)}
                  placeholder="e.g., Warehouse A, Main Office"
                />
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                {selectedApprovedCount} approved PO{selectedApprovedCount !== 1 ? 's' : ''} will be downloaded.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLocationDialog(false)}>
                Cancel
              </Button>
              <Button onClick={confirmBulkDownload} disabled={!downloadLocation.trim()}>
                Download
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default PORegister;
