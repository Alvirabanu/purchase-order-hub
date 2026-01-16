import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Download, Search, FolderDown, FileDown, Package } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const PODownload = () => {
  const { hasPermission } = useAuth();
  const { purchaseOrders, getVendorById, addDownloadLog } = useDataStore();
  
  const canDownload = hasPermission('download_po');
  const canBulkDownload = hasPermission('bulk_download_po');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPOs, setSelectedPOs] = useState<Set<string>>(new Set());
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [downloadLocation, setDownloadLocation] = useState('');
  const [isBulkDownload, setIsBulkDownload] = useState(false);
  const [singleDownloadId, setSingleDownloadId] = useState<string | null>(null);

  // Only show approved POs
  const approvedPOs = purchaseOrders.filter(po => po.status === 'approved');

  const filteredPOs = approvedPOs.filter(po =>
    po.po_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateForFile = (dateStr: string) => {
    return new Date(dateStr).toISOString().split('T')[0];
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

  const handleDownloadSingle = (id: string) => {
    setSingleDownloadId(id);
    setIsBulkDownload(false);
    setDownloadLocation('');
    setShowLocationDialog(true);
  };

  const handleBulkDownload = () => {
    if (selectedPOs.size === 0) {
      toast({
        title: "No POs Selected",
        description: "Please select at least one PO to download.",
        variant: "destructive",
      });
      return;
    }
    setIsBulkDownload(true);
    setDownloadLocation('');
    setShowLocationDialog(true);
  };

  const confirmDownload = () => {
    if (!downloadLocation.trim()) {
      toast({
        title: "Location Required",
        description: "Please enter a download location reference for logging.",
        variant: "destructive",
      });
      return;
    }

    const idsToDownload = isBulkDownload ? Array.from(selectedPOs) : [singleDownloadId!];
    const posToDownload = purchaseOrders.filter(po => idsToDownload.includes(po.id));

    // Log each download
    idsToDownload.forEach(id => {
      addDownloadLog(id, downloadLocation.trim());
    });

    // Generate and download files
    if (posToDownload.length === 1) {
      const po = posToDownload[0];
      const fileName = `PO-${po.po_number}-${formatDateForFile(po.date)}.pdf`;
      
      // Create a simple text file as placeholder (in real app, generate PDF)
      const content = `Purchase Order: ${po.po_number}\nDate: ${formatDate(po.date)}\nVendor: ${po.vendorName || getVendorById(po.vendor_id)?.name || 'Unknown'}\nTotal Items: ${po.total_items}\nStatus: ${po.status}\nDownload Location: ${downloadLocation}`;
      
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Started",
        description: `Downloading ${fileName}`,
      });
    } else {
      // For multiple files, download individually (in real app, create ZIP)
      posToDownload.forEach(po => {
        const fileName = `PO-${po.po_number}-${formatDateForFile(po.date)}.pdf`;
        const content = `Purchase Order: ${po.po_number}\nDate: ${formatDate(po.date)}\nVendor: ${po.vendorName || getVendorById(po.vendor_id)?.name || 'Unknown'}\nTotal Items: ${po.total_items}\nStatus: ${po.status}\nDownload Location: ${downloadLocation}`;
        
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
      
      toast({
        title: "Bulk Download Started",
        description: `Downloading ${posToDownload.length} PO files`,
      });
    }

    setShowLocationDialog(false);
    setDownloadLocation('');
    setSingleDownloadId(null);
    if (isBulkDownload) {
      setSelectedPOs(new Set());
    }
  };

  const allSelected = filteredPOs.length > 0 && filteredPOs.every(po => selectedPOs.has(po.id));
  const someSelected = selectedPOs.size > 0;

  // PO Download is visible to all roles (per requirement #7)
  if (!hasPermission('view_po_download')) {
    return (
      <AppLayout>
        <div className="animate-fade-in">
          <Card>
            <CardContent className="py-16 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Not Authorized</h2>
              <p className="text-muted-foreground">
                You don't have permission to access PO downloads.
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
            <h1 className="page-title">PO Download</h1>
            <p className="text-muted-foreground text-sm mt-1">Download approved purchase orders</p>
          </div>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search PO number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Bulk Download Action */}
        {someSelected && canBulkDownload && (
          <Card className="mb-4 border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedPOs.size} PO{selectedPOs.size > 1 ? 's' : ''} selected
              </span>
              <Button 
                onClick={handleBulkDownload}
                className="gap-2"
              >
                <FolderDown className="h-4 w-4" />
                Bulk Download ({selectedPOs.size})
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Approved POs Table */}
        <Card>
          <div className="overflow-x-auto">
            {filteredPOs.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    {canBulkDownload && (
                      <th className="w-12">
                        <Checkbox 
                          checked={allSelected}
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                    )}
                    <th>PO Number</th>
                    <th>Vendor</th>
                    <th>Date</th>
                    <th className="text-center">Items</th>
                    <th>Approved At</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPOs.map((po) => {
                    const vendor = getVendorById(po.vendor_id);
                    return (
                      <tr key={po.id}>
                        {canBulkDownload && (
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
                        <td className="text-muted-foreground">
                          {po.approved_at ? formatDate(po.approved_at) : '-'}
                        </td>
                        <td className="text-right">
                          {canDownload && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadSingle(po.id)}
                              className="gap-1"
                            >
                              <FileDown className="h-4 w-4" />
                              Download
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="empty-state py-16">
                <Download className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-1">No approved POs</h3>
                <p className="text-muted-foreground text-sm">
                  {searchQuery
                    ? 'Try adjusting your search'
                    : 'Approved purchase orders will appear here for download'}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Location Dialog */}
        <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>
                {isBulkDownload ? 'Bulk Download POs' : 'Download PO'}
              </DialogTitle>
              <DialogDescription>
                Enter a download location reference for tracking purposes. Files will download via your browser.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-2">
                <Label htmlFor="location">Download Location (Reference)</Label>
                <Input
                  id="location"
                  value={downloadLocation}
                  onChange={(e) => setDownloadLocation(e.target.value)}
                  placeholder="e.g., Laptop > Downloads, Warehouse A"
                />
                <p className="text-xs text-muted-foreground">
                  This is logged for audit purposes. Actual files download to your browser's default location.
                </p>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                {isBulkDownload 
                  ? `${selectedPOs.size} PO${selectedPOs.size > 1 ? 's' : ''} will be downloaded.`
                  : 'PO will be downloaded as a PDF file.'
                }
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                File naming: PO-&lt;Number&gt;-&lt;Date&gt;.pdf
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLocationDialog(false)}>
                Cancel
              </Button>
              <Button onClick={confirmDownload} disabled={!downloadLocation.trim()}>
                Download
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default PODownload;
