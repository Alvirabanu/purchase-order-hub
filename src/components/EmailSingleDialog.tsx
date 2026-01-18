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
import { Mail, AlertTriangle, Loader2 } from 'lucide-react';
import { PurchaseOrder, Vendor, Product } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface EmailSingleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  po: PurchaseOrder | null;
  vendor: Vendor | undefined;
  getProductById: (id: string) => Product | undefined;
  fromEmail?: string;
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const generateEmailSubject = (po: PurchaseOrder): string => {
  return `Purchase Order - ${po.po_number}`;
};

const generateEmailContent = (
  po: PurchaseOrder,
  vendorName: string,
  getProductById: (id: string) => Product | undefined
): { html: string; text: string } => {
  const productRows = po.items
    .map((item) => {
      const product = getProductById(item.product_id);
      const productName = product?.name || 'Unknown Product';
      const brand = product?.brand || '-';
      const category = product?.category || '-';
      const unit = product?.unit || 'pcs';
      return {
        name: productName,
        brand,
        category,
        unit,
        quantity: item.quantity
      };
    });

  const approvedDate = po.approved_at ? formatDate(po.approved_at) : '-';

  // HTML content
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: #f8f9fa; padding: 20px; border-bottom: 3px solid #007bff; }
    .content { padding: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border: 1px solid #ddd; }
    th { background: #f8f9fa; font-weight: bold; }
    .info-row { margin: 8px 0; }
    .label { font-weight: bold; color: #555; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0; color: #007bff;">PURCHASE ORDER</h1>
  </div>
  <div class="content">
    <p>Dear ${vendorName},</p>
    <p>Please find the Purchase Order details below:</p>
    
    <div class="info-row"><span class="label">PO Number:</span> ${po.po_number}</div>
    <div class="info-row"><span class="label">Date:</span> ${formatDate(po.date)}</div>
    <div class="info-row"><span class="label">Vendor:</span> ${vendorName}</div>
    <div class="info-row"><span class="label">Status:</span> ${po.status.toUpperCase()}</div>
    <div class="info-row"><span class="label">Approved:</span> ${approvedDate}</div>
    
    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th>Brand</th>
          <th>Category</th>
          <th>Unit</th>
          <th>Quantity</th>
        </tr>
      </thead>
      <tbody>
        ${productRows.map(p => `
          <tr>
            <td>${p.name}</td>
            <td>${p.brand}</td>
            <td>${p.category}</td>
            <td>${p.unit}</td>
            <td>${p.quantity}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="info-row"><span class="label">Total Items:</span> ${po.total_items}</div>
    
    <p>Please review and confirm.</p>
    
    <div class="footer">
      <p>Thank you.</p>
    </div>
  </div>
</body>
</html>`;

  // Plain text content
  const text = `PURCHASE ORDER

Dear ${vendorName},

Please find the Purchase Order details below:

PO Number: ${po.po_number}
Date: ${formatDate(po.date)}
Vendor: ${vendorName}
Status: ${po.status.toUpperCase()}
Approved: ${approvedDate}

Items:
${productRows.map(p => `• ${p.name} | Brand: ${p.brand} | Category: ${p.category} | Unit: ${p.unit} | Qty: ${p.quantity}`).join('\n')}

Total Items: ${po.total_items}

Please review and confirm.

Thank you.`;

  return { html, text };
};

export const EmailSingleDialog = ({
  open,
  onOpenChange,
  po,
  vendor,
  getProductById,
  fromEmail,
}: EmailSingleDialogProps) => {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [emailError, setEmailError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open && po && vendor) {
      setEmail(vendor.contact_person_email || '');
      setSubject(generateEmailSubject(po));
      const { text } = generateEmailContent(po, vendor.name, getProductById);
      setMessage(text);
      setEmailError('');
    }
  }, [open, po, vendor, getProductById]);

  const validateEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleSendEmail = async () => {
    if (!email.trim()) {
      setEmailError('Vendor email is missing. Please update vendor details.');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    if (!po || !vendor) return;

    setEmailError('');
    setSending(true);

    try {
      const { html } = generateEmailContent(po, vendor.name, getProductById);

      const { data, error } = await supabase.functions.invoke('send-po-email', {
        body: {
          to: email,
          toName: vendor.name,
          subject: subject,
          htmlContent: html,
          textContent: message,
          fromEmail: fromEmail,
          fromName: 'Purchase Order System',
          ccEmail: fromEmail,
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Email Sent",
        description: `Purchase Order sent to ${vendor.name}`,
      });
      
      onOpenChange(false);
    } catch (error: any) {
      console.error('Email send error:', error);
      toast({
        title: "Email Failed",
        description: error.message || "Failed to send email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (!po || !vendor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            Send PO via Email
          </DialogTitle>
          <DialogDescription>
            Review and edit the email before sending to the vendor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Vendor Name (read-only) */}
          <div className="space-y-2">
            <Label>Vendor Name</Label>
            <Input value={vendor.name} readOnly className="bg-muted" />
          </div>

          {/* Email Address (editable) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError('');
              }}
              placeholder="vendor@example.com"
            />
            {emailError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                {emailError}
              </div>
            )}
          </div>

          {/* Subject (editable) */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Message Preview (editable) */}
          <div className="space-y-2">
            <Label htmlFor="message">Message Preview</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Note: The actual email will be sent in HTML format with proper styling.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSendEmail}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
            disabled={sending}
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
