import { useState, useEffect } from 'react';
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
import { MessageCircle, AlertTriangle } from 'lucide-react';
import { PurchaseOrder, Vendor, Product } from '@/types';

interface WhatsAppSingleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  po: PurchaseOrder | null;
  vendor: Vendor | undefined;
  getProductById: (id: string) => Product | undefined;
}

const formatPhoneNumber = (phone: string): string => {
  // Remove spaces, dashes, parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  // Remove leading + if present (wa.me handles it)
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

const generateMessage = (
  po: PurchaseOrder,
  vendorName: string,
  getProductById: (id: string) => Product | undefined
): string => {
  const productLines = po.items
    .map((item) => {
      const product = getProductById(item.product_id);
      const productName = product?.name || 'Unknown Product';
      const brand = product?.brand || '-';
      const category = product?.category || '-';
      const unit = product?.unit || 'pcs';
      return `• ${productName} | Brand: ${brand} | Category: ${category} | Unit: ${unit} | Qty: ${item.quantity}`;
    })
    .join('\n');

  const approvedDate = po.approved_at ? formatDate(po.approved_at) : '-';

  return `*PURCHASE ORDER*

*PO Number:* ${po.po_number}
*Date:* ${formatDate(po.date)}
*Vendor:* ${vendorName}
*Status:* ${po.status.toUpperCase()}
*Approved:* ${approvedDate}

*Items:*
${productLines}

*Total Items:* ${po.total_items}

Please review and confirm.

Thank you.`;
};

export const WhatsAppSingleDialog = ({
  open,
  onOpenChange,
  po,
  vendor,
  getProductById,
}: WhatsAppSingleDialogProps) => {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    if (open && po && vendor) {
      setPhone(vendor.phone || '');
      setMessage(generateMessage(po, vendor.name, getProductById));
      setPhoneError('');
    }
  }, [open, po, vendor, getProductById]);

  const handleOpenWhatsApp = () => {
    const cleanedPhone = formatPhoneNumber(phone);
    
    if (!cleanedPhone) {
      setPhoneError('Vendor phone number missing. Please update vendor details.');
      return;
    }

    // Check if it looks like a valid phone (at least 10 digits)
    if (cleanedPhone.length < 10) {
      setPhoneError('Phone number appears invalid. Please include country code (e.g., 91XXXXXXXXXX).');
      return;
    }

    setPhoneError('');
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanedPhone}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    onOpenChange(false);
  };

  if (!po || !vendor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Send PO via WhatsApp
          </DialogTitle>
          <DialogDescription>
            Review and edit the message before sending to the vendor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Vendor Name (read-only) */}
          <div className="space-y-2">
            <Label>Vendor Name</Label>
            <Input value={vendor.name} readOnly className="bg-muted" />
          </div>

          {/* Phone Number (editable) */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setPhoneError('');
              }}
              placeholder="e.g., 919876543210"
            />
            {phoneError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                {phoneError}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Include country code without + (e.g., 91 for India)
            </p>
          </div>

          {/* Message (editable) */}
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              className="font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleOpenWhatsApp}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <MessageCircle className="h-4 w-4" />
            Open WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
