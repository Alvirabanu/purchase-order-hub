import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { PurchaseOrder, Vendor, Product } from '@/types';

interface VendorGroup {
  vendor: Vendor;
  pos: PurchaseOrder[];
  phone: string;
  message: string;
  hasError: boolean;
  errorMessage: string;
  expanded: boolean;
}

interface WhatsAppBulkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPOs: PurchaseOrder[];
  getVendorById: (id: string) => Vendor | undefined;
  getProductById: (id: string) => Product | undefined;
}

const formatPhoneNumber = (phone: string): string => {
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const generateBulkMessage = (
  vendorName: string,
  pos: PurchaseOrder[],
  getProductById: (id: string) => Product | undefined
): string => {
  const poDetails = pos.map((po) => {
    const productLines = po.items
      .map((item) => {
        const product = getProductById(item.product_id);
        const productName = product?.name || 'Unknown Product';
        const brand = product?.brand || '-';
        const category = product?.category || '-';
        const unit = product?.unit || 'pcs';
        return `  • ${productName} | Brand: ${brand} | Category: ${category} | Unit: ${unit} | Qty: ${item.quantity}`;
      })
      .join('\n');

    const approvedDate = po.approved_at ? formatDate(po.approved_at) : '-';

    return `*PO Number:* ${po.po_number}
*Date:* ${formatDate(po.date)}
*Status:* ${po.status.toUpperCase()}
*Approved:* ${approvedDate}
*Items:*
${productLines}
*Total Items:* ${po.total_items}`;
  }).join('\n\n---\n\n');

  return `*PURCHASE ORDERS*

*Vendor:* ${vendorName}

${poDetails}

Please review and confirm.

Thank you.`;
};

export const WhatsAppBulkDialog = ({
  open,
  onOpenChange,
  selectedPOs,
  getVendorById,
  getProductById,
}: WhatsAppBulkDialogProps) => {
  const [vendorGroups, setVendorGroups] = useState<VendorGroup[]>([]);

  // Group POs by vendor
  const initialGroups = useMemo(() => {
    const groupMap = new Map<string, { vendor: Vendor; pos: PurchaseOrder[] }>();

    selectedPOs.forEach((po) => {
      const vendor = getVendorById(po.vendor_id);
      if (vendor) {
        const key = vendor._uuid || vendor.id;
        if (!groupMap.has(key)) {
          groupMap.set(key, { vendor, pos: [] });
        }
        groupMap.get(key)!.pos.push(po);
      }
    });

    return Array.from(groupMap.values()).map(({ vendor, pos }) => ({
      vendor,
      pos,
      phone: vendor.phone || '',
      message: generateBulkMessage(vendor.name, pos, getProductById),
      hasError: !vendor.phone,
      errorMessage: !vendor.phone ? 'Phone number missing' : '',
      expanded: true,
    }));
  }, [selectedPOs, getVendorById, getProductById]);

  useEffect(() => {
    if (open) {
      setVendorGroups(initialGroups);
    }
  }, [open, initialGroups]);

  const updateVendorGroup = (index: number, updates: Partial<VendorGroup>) => {
    setVendorGroups((prev) =>
      prev.map((group, i) => (i === index ? { ...group, ...updates } : group))
    );
  };

  const toggleExpanded = (index: number) => {
    updateVendorGroup(index, { expanded: !vendorGroups[index].expanded });
  };

  const handleOpenWhatsApp = () => {
    let hasAnyError = false;

    // Validate all phone numbers first
    const validatedGroups = vendorGroups.map((group) => {
      const cleanedPhone = formatPhoneNumber(group.phone);
      if (!cleanedPhone) {
        hasAnyError = true;
        return {
          ...group,
          hasError: true,
          errorMessage: 'Vendor phone number missing. Please update vendor details.',
        };
      }
      if (cleanedPhone.length < 10) {
        hasAnyError = true;
        return {
          ...group,
          hasError: true,
          errorMessage: 'Phone number appears invalid. Include country code.',
        };
      }
      return { ...group, hasError: false, errorMessage: '' };
    });

    setVendorGroups(validatedGroups);

    if (hasAnyError) {
      return;
    }

    // Open WhatsApp for each vendor
    validatedGroups.forEach((group, index) => {
      const cleanedPhone = formatPhoneNumber(group.phone);
      const encodedMessage = encodeURIComponent(group.message);
      const whatsappUrl = `https://wa.me/${cleanedPhone}?text=${encodedMessage}`;

      // Stagger the window opens to avoid popup blockers
      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
      }, index * 500);
    });

    onOpenChange(false);
  };

  const validGroupsCount = vendorGroups.filter(
    (g) => formatPhoneNumber(g.phone).length >= 10
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Bulk WhatsApp - Review Messages
          </DialogTitle>
          <DialogDescription>
            {vendorGroups.length} vendor{vendorGroups.length > 1 ? 's' : ''} will receive
            messages. Review and edit before sending.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-4 py-4">
            {vendorGroups.map((group, index) => (
              <div key={group.vendor.id} className="border rounded-lg p-4">
                {/* Vendor Header */}
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleExpanded(index)}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{group.vendor.name}</span>
                    <span className="text-sm text-muted-foreground">
                      ({group.pos.length} PO{group.pos.length > 1 ? 's' : ''})
                    </span>
                    {group.hasError && (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                  {group.expanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                {group.expanded && (
                  <div className="mt-4 space-y-3">
                    <Separator />

                    {/* Phone Number */}
                    <div className="space-y-1">
                      <Label className="text-sm">Phone Number</Label>
                      <Input
                        value={group.phone}
                        onChange={(e) =>
                          updateVendorGroup(index, {
                            phone: e.target.value,
                            hasError: false,
                            errorMessage: '',
                          })
                        }
                        placeholder="e.g., 919876543210"
                        className={group.hasError ? 'border-destructive' : ''}
                      />
                      {group.hasError && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {group.errorMessage}
                        </p>
                      )}
                    </div>

                    {/* Message */}
                    <div className="space-y-1">
                      <Label className="text-sm">Message Preview</Label>
                      <Textarea
                        value={group.message}
                        onChange={(e) =>
                          updateVendorGroup(index, { message: e.target.value })
                        }
                        rows={6}
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <p className="text-xs text-muted-foreground mr-auto">
            Opens WhatsApp Web/App for each vendor. You must manually press Send.
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleOpenWhatsApp}
            className="gap-2 bg-green-600 hover:bg-green-700"
            disabled={validGroupsCount === 0}
          >
            <MessageCircle className="h-4 w-4" />
            Open WhatsApp ({validGroupsCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
