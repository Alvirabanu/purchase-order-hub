import { useState, useMemo } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useDataStore } from '@/contexts/DataStoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { Download, Search, FolderDown, FileDown, Package, FileSpreadsheet, FileText, Mail, MessageCircle, Trash2 } from 'lucide-react';
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
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { WhatsAppSingleDialog } from '@/components/WhatsAppSingleDialog';
import { WhatsAppBulkDialog } from '@/components/WhatsAppBulkDialog';

type DownloadFormat = 'pdf' | 'xlsx';

const PODownload = () => {
  const { hasPermission } = useAuth();
  const { purchaseOrders, getVendorById, getProductById, addDownloadLog, deletePurchaseOrder, appSettings } = useDataStore();
  
  const canDownload = hasPermission('download_po');
  const canBulkDownload = hasPermission('bulk_download_po');
  const canDelete = hasPermission('delete_po');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPOs, setSelectedPOs] = useState<Set<string>>(new Set());
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [downloadLocation, setDownloadLocation] = useState('');
  const [isBulkDownload, setIsBulkDownload] = useState(false);
  const [singleDownloadId, setSingleDownloadId] = useState<string | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>('pdf');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPoId, setDeletingPoId] = useState<string | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [showComingSoonDialog, setShowComingSoonDialog] = useState(false);
  const [comingSoonFeature, setComingSoonFeature] = useState<'email' | 'whatsapp'>('email');
  
  // WhatsApp dialog states
  const [showWhatsAppSingleDialog, setShowWhatsAppSingleDialog] = useState(false);
  const [whatsAppSinglePOId, setWhatsAppSinglePOId] = useState<string | null>(null);
  const [showWhatsAppBulkDialog, setShowWhatsAppBulkDialog] = useState(false);
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

  // Generate PDF for a single PO
  const generatePDF = (po: typeof purchaseOrders[0]) => {
    const doc = new jsPDF();
    const vendor = getVendorById(po.vendor_id);
    
    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('PURCHASE ORDER', 105, 20, { align: 'center' });
    
    // PO Details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`PO Number: ${po.po_number}`, 20, 40);
    doc.text(`Date: ${formatDate(po.date)}`, 20, 50);
    doc.text(`Vendor: ${po.vendorName || vendor?.name || 'Unknown'}`, 20, 60);
    doc.text(`Status: ${po.status.toUpperCase()}`, 20, 70);
    
    if (po.approved_at) {
      doc.text(`Approved: ${formatDate(po.approved_at)}`, 20, 80);
    }
    
    // Items table header
    let yPos = 100;
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPos - 5, 170, 10, 'F');
    doc.text('Product', 25, yPos);
    doc.text('Brand', 75, yPos);
    doc.text('Category', 105, yPos);
    doc.text('Unit', 145, yPos);
    doc.text('Qty', 170, yPos);
    
    // Items
    doc.setFont('helvetica', 'normal');
    yPos += 15;
    
    if (po.items && po.items.length > 0) {
      po.items.forEach((item) => {
        const product = getProductById(item.product_id);
        if (product) {
          doc.text(product.name.substring(0, 25), 25, yPos);
          doc.text(product.brand.substring(0, 15), 75, yPos);
          doc.text(product.category.substring(0, 15), 105, yPos);
          doc.text(product.unit, 145, yPos);
          doc.text(String(item.quantity), 170, yPos);
          yPos += 10;
          
          // Add new page if needed
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
        }
      });
    }
    
    // Total
    yPos += 10;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Items: ${po.total_items}`, 20, yPos);
    
    return doc;
  };

  // Generate Excel for a single PO
  const generateExcel = (po: typeof purchaseOrders[0]) => {
    const vendor = getVendorById(po.vendor_id);
    
    // Prepare data
    const wsData = [
      ['PURCHASE ORDER'],
      [],
      ['PO Number', po.po_number],
      ['Date', formatDate(po.date)],
      ['Vendor', po.vendorName || vendor?.name || 'Unknown'],
      ['Status', po.status.toUpperCase()],
      po.approved_at ? ['Approved', formatDate(po.approved_at)] : [],
      [],
      ['Product', 'Brand', 'Category', 'Unit', 'Quantity'],
    ];
    
    // Add items
    if (po.items && po.items.length > 0) {
      po.items.forEach((item) => {
        const product = getProductById(item.product_id);
        if (product) {
          wsData.push([product.name, product.brand, product.category, product.unit, String(item.quantity)]);
        }
      });
    }
    
    wsData.push([]);
    wsData.push(['Total Items', String(po.total_items)]);
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Purchase Order');
    
    return wb;
  };

  const confirmDownload = async () => {
    // Location is optional now - no blocking
    const locationRef = downloadLocation.trim() || 'Not specified';

    const idsToDownload = isBulkDownload ? Array.from(selectedPOs) : [singleDownloadId!];
    const posToDownload = purchaseOrders.filter(po => idsToDownload.includes(po.id));

    // Log each download
    idsToDownload.forEach(id => {
      addDownloadLog(id, locationRef);
    });

    // Log each download
    idsToDownload.forEach(id => {
      addDownloadLog(id, downloadLocation.trim());
    });

    try {
      if (posToDownload.length === 1) {
        // Single file download
        const po = posToDownload[0];
        const fileDate = formatDateForFile(po.date);
        
        if (downloadFormat === 'pdf') {
          const doc = generatePDF(po);
          doc.save(`PO-${po.po_number}-${fileDate}.pdf`);
        } else {
          const wb = generateExcel(po);
          XLSX.writeFile(wb, `PO-${po.po_number}-${fileDate}.xlsx`);
        }
        
        toast({
          title: "Download Complete",
          description: `PO-${po.po_number} downloaded as ${downloadFormat.toUpperCase()}`,
        });
      } else {
        // Bulk download - create ZIP
        const zip = new JSZip();
        
        for (const po of posToDownload) {
          const fileDate = formatDateForFile(po.date);
          
          if (downloadFormat === 'pdf') {
            const doc = generatePDF(po);
            const pdfBlob = doc.output('blob');
            zip.file(`PO-${po.po_number}-${fileDate}.pdf`, pdfBlob);
          } else {
            const wb = generateExcel(po);
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            zip.file(`PO-${po.po_number}-${fileDate}.xlsx`, wbout);
          }
        }
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = `PO-Bulk-Download-${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "Bulk Download Complete",
          description: `${posToDownload.length} POs downloaded as ZIP`,
        });
      }
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "An error occurred while generating files",
        variant: "destructive",
      });
    }

    setShowLocationDialog(false);
    setDownloadLocation('');
    setSingleDownloadId(null);
    if (isBulkDownload) {
      setSelectedPOs(new Set());
    }
  };

  // Send PO via WhatsApp - Open dialog with vendor info
  const handleSendWhatsApp = (poId: string) => {
    setWhatsAppSinglePOId(poId);
    setShowWhatsAppSingleDialog(true);
  };

  // Send PO via Email - Coming Soon
  const handleSendEmail = (poId: string) => {
    setComingSoonFeature('email');
    setShowComingSoonDialog(true);
  };

  // Get selected PO for WhatsApp single dialog
  const whatsAppSinglePO = useMemo(() => {
    if (!whatsAppSinglePOId) return null;
    return purchaseOrders.find(po => po.id === whatsAppSinglePOId) || null;
  }, [whatsAppSinglePOId, purchaseOrders]);

  const whatsAppSingleVendor = useMemo(() => {
    if (!whatsAppSinglePO) return undefined;
    return getVendorById(whatsAppSinglePO.vendor_id);
  }, [whatsAppSinglePO, getVendorById]);

  // Get selected POs for bulk WhatsApp
  const selectedPOsForBulk = useMemo(() => {
    return purchaseOrders.filter(po => selectedPOs.has(po.id));
  }, [selectedPOs, purchaseOrders]);

  // Delete PO handler
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
        description: "Purchase order has been deleted successfully.",
      });
      setSelectedPOs(prev => {
        const newSet = new Set(prev);
        newSet.delete(deletingPoId);
        return newSet;
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

  // Bulk WhatsApp handler - Open bulk dialog
  const handleBulkWhatsApp = () => {
    if (selectedPOs.size === 0) {
      toast({
        title: "No POs Selected",
        description: "Please select at least one PO to send via WhatsApp.",
        variant: "destructive",
      });
      return;
    }
    setShowWhatsAppBulkDialog(true);
  };

  // Bulk Email handler - Coming Soon
  const handleBulkEmail = () => {
    if (selectedPOs.size === 0) {
      toast({
        title: "No POs Selected",
        description: "Please select at least one PO to send via Email.",
        variant: "destructive",
      });
      return;
    }
    setComingSoonFeature('email');
    setShowComingSoonDialog(true);
  };

  // Bulk Delete handler
  const handleBulkDelete = () => {
    if (selectedPOs.size === 0) {
      toast({
        title: "No POs Selected",
        description: "Please select at least one PO to delete.",
        variant: "destructive",
      });
      return;
    }
    setBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    const idsToDelete = Array.from(selectedPOs);
    let deletedCount = 0;
    let failedCount = 0;

    for (const id of idsToDelete) {
      try {
        await deletePurchaseOrder(id);
        deletedCount++;
      } catch (error) {
        failedCount++;
        console.error(`Failed to delete PO ${id}:`, error);
      }
    }

    if (deletedCount > 0) {
      toast({
        title: "Bulk Delete Complete",
        description: `${deletedCount} PO${deletedCount > 1 ? 's' : ''} deleted successfully.${failedCount > 0 ? ` ${failedCount} failed.` : ''}`,
      });
    } else {
      toast({
        title: "Delete Failed",
        description: "Could not delete selected POs.",
        variant: "destructive",
      });
    }

    setSelectedPOs(new Set());
    setBulkDeleteDialogOpen(false);
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

  // Download PO list as Excel (table export)
  const handleDownloadPOList = () => {
    if (filteredPOs.length === 0) {
      toast({
        title: "No Data",
        description: "No approved POs to export.",
        variant: "destructive",
      });
      return;
    }

    // Prepare data matching table columns
    const wsData = [
      ['PO Number', 'Vendor', 'Date', 'Items', 'Approved At'],
    ];
    
    filteredPOs.forEach((po) => {
      const vendor = getVendorById(po.vendor_id);
      wsData.push([
        po.po_number,
        po.vendorName || vendor?.name || '-',
        formatDate(po.date),
        String(po.total_items),
        po.approved_at ? formatDate(po.approved_at) : '-',
      ]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PO List');
    
    const fileName = `PO-List-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast({
      title: "Download Complete",
      description: `PO list exported as ${fileName}`,
    });
  };

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="page-title">PO Download</h1>
            <p className="text-muted-foreground text-sm mt-1">Download approved purchase orders as PDF or Excel</p>
          </div>
          <Button onClick={handleDownloadPOList} variant="outline" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Download PO List (Excel)
          </Button>
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
            <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
              <span className="text-sm font-medium">
                {selectedPOs.size} PO{selectedPOs.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-3">
                <Select value={downloadFormat} onValueChange={(v: DownloadFormat) => setDownloadFormat(v)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        PDF
                      </div>
                    </SelectItem>
                    <SelectItem value="xlsx">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        Excel
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleBulkDownload}
                  className="gap-2"
                >
                  <FolderDown className="h-4 w-4" />
                  Bulk Download ({selectedPOs.size})
                </Button>
                <Button 
                  onClick={handleBulkWhatsApp}
                  variant="outline"
                  className="gap-2 text-green-600 hover:text-green-700"
                >
                  <MessageCircle className="h-4 w-4" />
                  Bulk WhatsApp
                </Button>
                <Button 
                  onClick={handleBulkEmail}
                  variant="outline"
                  className="gap-2 text-blue-600 hover:text-blue-700"
                >
                  <Mail className="h-4 w-4" />
                  Bulk Email
                </Button>
                {canDelete && (
                  <Button 
                    onClick={handleBulkDelete}
                    variant="outline"
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Bulk Delete
                  </Button>
                )}
              </div>
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
                    <th className="text-right">Actions</th>
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
                          <div className="flex justify-end gap-1">
                            {canDownload && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownloadSingle(po.id)}
                                  className="gap-1"
                                  title="Download PO"
                                >
                                  <FileDown className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSendWhatsApp(po.id)}
                                  className="gap-1 text-green-600 hover:text-green-700"
                                  title="Send via WhatsApp"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSendEmail(po.id)}
                                  className="gap-1 text-blue-600 hover:text-blue-700"
                                  title="Send via Email"
                                >
                                  <Mail className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {canDelete && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeletePO(po.id)}
                                className="gap-1 text-destructive hover:text-destructive"
                                title="Delete PO"
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
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>
                {isBulkDownload ? 'Bulk Download POs' : 'Download PO'}
              </DialogTitle>
              <DialogDescription>
                Select format and enter a location reference for tracking.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {/* Format Selector */}
              <div className="space-y-2">
                <Label>Download Format</Label>
                <Select value={downloadFormat} onValueChange={(v: DownloadFormat) => setDownloadFormat(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        PDF Document
                      </div>
                    </SelectItem>
                    <SelectItem value="xlsx">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        Excel Spreadsheet (.xlsx)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Location Reference - Optional */}
              <div className="space-y-2">
                <Label htmlFor="location">Download Location (Reference) - Optional</Label>
                <Input
                  id="location"
                  value={downloadLocation}
                  onChange={(e) => setDownloadLocation(e.target.value)}
                  placeholder="e.g., Laptop > Downloads, Warehouse A"
                />
                <p className="text-xs text-muted-foreground">
                  Browsers download to your default Downloads folder. This field is for tracking purposes only and does not change where files are saved.
                </p>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {isBulkDownload 
                  ? `${selectedPOs.size} PO${selectedPOs.size > 1 ? 's' : ''} will be downloaded as a ZIP file.`
                  : `PO will be downloaded as a ${downloadFormat.toUpperCase()} file.`
                }
              </p>
              <p className="text-xs text-muted-foreground">
                File naming: PO-&lt;Number&gt;-&lt;Date&gt;.{downloadFormat}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLocationDialog(false)}>
                Cancel
              </Button>
              <Button onClick={confirmDownload} className="gap-2">
                {downloadFormat === 'pdf' ? <FileText className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />}
                Download
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Purchase Order</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this purchase order? This action cannot be undone.
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

        {/* Bulk Delete Confirmation Dialog */}
        <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedPOs.size} Purchase Order{selectedPOs.size > 1 ? 's' : ''}</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedPOs.size} selected purchase order{selectedPOs.size > 1 ? 's' : ''}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete {selectedPOs.size} PO{selectedPOs.size > 1 ? 's' : ''}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Coming Soon Dialog */}
        <Dialog open={showComingSoonDialog} onOpenChange={setShowComingSoonDialog}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Coming Soon</DialogTitle>
              <DialogDescription>
                {comingSoonFeature === 'email' 
                  ? 'Email sending will be enabled later.'
                  : 'WhatsApp sending will be enabled later.'}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setShowComingSoonDialog(false)}>
                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* WhatsApp Single PO Dialog */}
        <WhatsAppSingleDialog
          open={showWhatsAppSingleDialog}
          onOpenChange={(open) => {
            setShowWhatsAppSingleDialog(open);
            if (!open) setWhatsAppSinglePOId(null);
          }}
          po={whatsAppSinglePO}
          vendor={whatsAppSingleVendor}
          getProductById={getProductById}
        />

        {/* WhatsApp Bulk Dialog */}
        <WhatsAppBulkDialog
          open={showWhatsAppBulkDialog}
          onOpenChange={setShowWhatsAppBulkDialog}
          selectedPOs={selectedPOsForBulk}
          getVendorById={getVendorById}
        />
      </div>
    </AppLayout>
  );
};

export default PODownload;