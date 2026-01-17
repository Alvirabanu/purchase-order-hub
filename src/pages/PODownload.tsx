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
import { Download, Search, FolderDown, FileDown, Package, FileSpreadsheet, FileText, Mail, MessageCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

type DownloadFormat = 'pdf' | 'xlsx';

const PODownload = () => {
  const { hasPermission } = useAuth();
  const { purchaseOrders, getVendorById, getProductById, addDownloadLog } = useDataStore();
  
  const canDownload = hasPermission('download_po');
  const canBulkDownload = hasPermission('bulk_download_po');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPOs, setSelectedPOs] = useState<Set<string>>(new Set());
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [downloadLocation, setDownloadLocation] = useState('');
  const [isBulkDownload, setIsBulkDownload] = useState(false);
  const [singleDownloadId, setSingleDownloadId] = useState<string | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>('pdf');

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

  // Send PO via WhatsApp
  const handleSendWhatsApp = (poId: string) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return;
    
    const vendor = getVendorById(po.vendor_id);
    if (!vendor?.phone) {
      toast({
        title: "No Phone Number",
        description: "This vendor doesn't have a phone number configured.",
        variant: "destructive",
      });
      return;
    }
    
    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = vendor.phone.replace(/[\s\-\(\)]/g, '');
    
    // Create message with PO details
    const message = `*Purchase Order: ${po.po_number}*
Date: ${formatDate(po.date)}
Vendor: ${vendor.name}
Status: Approved

Items:
${po.items?.map(item => {
      const product = getProductById(item.product_id);
      return product ? `- ${product.name} (${product.brand}): ${item.quantity} ${product.unit}` : '';
    }).filter(Boolean).join('\n') || 'No items'}

Total Items: ${po.total_items}

Please confirm receipt of this purchase order.`;

    // Open WhatsApp with the message
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    toast({
      title: "Opening WhatsApp",
      description: `Sending PO ${po.po_number} to ${vendor.name}`,
    });
  };

  // Send PO via Email (opens default email client)
  const handleSendEmail = (poId: string) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return;
    
    const vendor = getVendorById(po.vendor_id);
    if (!vendor?.contact_person_email) {
      toast({
        title: "No Email Address",
        description: "This vendor doesn't have an email address configured.",
        variant: "destructive",
      });
      return;
    }
    
    // Create email subject and body
    const subject = `Purchase Order: ${po.po_number}`;
    const body = `Dear ${vendor.contact_person_name || vendor.name},

Please find the Purchase Order details below:

PO Number: ${po.po_number}
Date: ${formatDate(po.date)}
Vendor: ${vendor.name}

Items:
${po.items?.map(item => {
      const product = getProductById(item.product_id);
      return product ? `• ${product.name} (${product.brand}): ${item.quantity} ${product.unit}` : '';
    }).filter(Boolean).join('\n') || 'No items'}

Total Items: ${po.total_items}

Please confirm receipt of this purchase order.

Thank you.`;

    // Open default email client
    const mailtoUrl = `mailto:${vendor.contact_person_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    
    toast({
      title: "Opening Email Client",
      description: `Sending PO ${po.po_number} to ${vendor.contact_person_email}`,
    });
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
      </div>
    </AppLayout>
  );
};

export default PODownload;