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
import { Mail, AlertTriangle, ChevronDown, ChevronUp, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { PurchaseOrder, Vendor, Product } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface VendorEmailGroup {
  vendor: Vendor;
  pos: PurchaseOrder[];
  email: string;
  subject: string;
  message: string;
  hasError: boolean;
  errorMessage: string;
  expanded: boolean;
  sendStatus: 'pending' | 'sending' | 'sent' | 'failed';
}

interface EmailBulkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPOs: PurchaseOrder[];
  getVendorById: (id: string) => Vendor | undefined;
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

const validateEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const generateBulkEmailSubject = (vendorName: string, poCount: number): string => {
  return `Purchase Orders (${poCount}) - ${vendorName}`;
};

const generateBulkEmailContent = (
  vendorName: string,
  pos: PurchaseOrder[],
  getProductById: (id: string) => Product | undefined
): { html: string; text: string } => {
  
  const posHtml = pos.map(po => {
    const productRows = po.items.map(item => {
      const product = getProductById(item.product_id);
      return {
        name: product?.name || 'Unknown Product',
        brand: product?.brand || '-',
        category: product?.category || '-',
        unit: product?.unit || 'pcs',
        quantity: item.quantity
      };
    });

    const approvedDate = po.approved_at ? formatDate(po.approved_at) : '-';

    return `
      <div style="margin-bottom: 30px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
        <div style="background: #f8f9fa; padding: 15px; border-bottom: 1px solid #ddd;">
          <h3 style="margin: 0; color: #007bff;">${po.po_number}</h3>
        </div>
        <div style="padding: 15px;">
          <div style="margin: 5px 0;"><strong>Date:</strong> ${formatDate(po.date)}</div>
          <div style="margin: 5px 0;"><strong>Status:</strong> ${po.status.toUpperCase()}</div>
          <div style="margin: 5px 0;"><strong>Approved:</strong> ${approvedDate}</div>
          
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <thead>
              <tr>
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd; background: #f8f9fa;">Product</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd; background: #f8f9fa;">Brand</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd; background: #f8f9fa;">Category</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd; background: #f8f9fa;">Unit</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd; background: #f8f9fa;">Qty</th>
              </tr>
            </thead>
            <tbody>
              ${productRows.map(p => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">${p.name}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${p.brand}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${p.category}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${p.unit}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${p.quantity}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div><strong>Total Items:</strong> ${po.total_items}</div>
        </div>
      </div>
    `;
  }).join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: #007bff; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">PURCHASE ORDERS</h1>
    <p style="margin: 5px 0 0 0;">${pos.length} Order${pos.length > 1 ? 's' : ''}</p>
  </div>
  <div class="content">
    <p>Dear ${vendorName},</p>
    <p>Please find the following Purchase Order${pos.length > 1 ? 's' : ''} below:</p>
    
    ${posHtml}
    
    <p>Please review and confirm.</p>
    
    <div class="footer">
      <p>Thank you.</p>
    </div>
  </div>
</body>
</html>`;

  // Plain text version
  const posText = pos.map(po => {
    const productLines = po.items.map(item => {
      const product = getProductById(item.product_id);
      return `  • ${product?.name || 'Unknown'} | Brand: ${product?.brand || '-'} | Category: ${product?.category || '-'} | Unit: ${product?.unit || 'pcs'} | Qty: ${item.quantity}`;
    }).join('\n');

    const approvedDate = po.approved_at ? formatDate(po.approved_at) : '-';

    return `
PO Number: ${po.po_number}
Date: ${formatDate(po.date)}
Status: ${po.status.toUpperCase()}
Approved: ${approvedDate}
Items:
${productLines}
Total Items: ${po.total_items}
---`;
  }).join('\n');

  const text = `PURCHASE ORDERS

Dear ${vendorName},

Please find the following Purchase Order${pos.length > 1 ? 's' : ''} below:

${posText}

Please review and confirm.

Thank you.`;

  return { html, text };
};

export const EmailBulkDialog = ({
  open,
  onOpenChange,
  selectedPOs,
  getVendorById,
  getProductById,
  fromEmail,
}: EmailBulkDialogProps) => {
  const [vendorGroups, setVendorGroups] = useState<VendorEmailGroup[]>([]);
  const [sending, setSending] = useState(false);

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

    return Array.from(groupMap.values()).map(({ vendor, pos }) => {
      const { text } = generateBulkEmailContent(vendor.name, pos, getProductById);
      return {
        vendor,
        pos,
        email: vendor.contact_person_email || '',
        subject: generateBulkEmailSubject(vendor.name, pos.length),
        message: text,
        hasError: !vendor.contact_person_email,
        errorMessage: !vendor.contact_person_email ? 'Email address missing' : '',
        expanded: true,
        sendStatus: 'pending' as const,
      };
    });
  }, [selectedPOs, getVendorById, getProductById]);

  useEffect(() => {
    if (open) {
      setVendorGroups(initialGroups);
      setSending(false);
    }
  }, [open, initialGroups]);

  const updateVendorGroup = (index: number, updates: Partial<VendorEmailGroup>) => {
    setVendorGroups((prev) =>
      prev.map((group, i) => (i === index ? { ...group, ...updates } : group))
    );
  };

  const toggleExpanded = (index: number) => {
    updateVendorGroup(index, { expanded: !vendorGroups[index].expanded });
  };

  const handleSendEmails = async () => {
    let hasAnyError = false;

    // Validate all emails first
    const validatedGroups = vendorGroups.map((group) => {
      if (!group.email.trim()) {
        hasAnyError = true;
        return {
          ...group,
          hasError: true,
          errorMessage: 'Vendor email is missing. Please update vendor details.',
        };
      }
      if (!validateEmail(group.email)) {
        hasAnyError = true;
        return {
          ...group,
          hasError: true,
          errorMessage: 'Please enter a valid email address.',
        };
      }
      return { ...group, hasError: false, errorMessage: '' };
    });

    setVendorGroups(validatedGroups);

    if (hasAnyError) {
      return;
    }

    setSending(true);
    let successCount = 0;
    let failCount = 0;

    // Send emails one by one
    for (let i = 0; i < validatedGroups.length; i++) {
      const group = validatedGroups[i];
      
      updateVendorGroup(i, { sendStatus: 'sending' });

      try {
        const { html } = generateBulkEmailContent(group.vendor.name, group.pos, getProductById);

        const { error } = await supabase.functions.invoke('send-po-email', {
          body: {
            to: group.email,
            toName: group.vendor.name,
            subject: group.subject,
            htmlContent: html,
            textContent: group.message,
            fromEmail: fromEmail,
            fromName: 'Purchase Order System',
            ccEmail: fromEmail,
          },
        });

        if (error) {
          throw error;
        }

        updateVendorGroup(i, { sendStatus: 'sent' });
        successCount++;
      } catch (error: any) {
        console.error(`Failed to send email to ${group.vendor.name}:`, error);
        updateVendorGroup(i, { 
          sendStatus: 'failed',
          hasError: true,
          errorMessage: error.message || 'Failed to send'
        });
        failCount++;
      }
    }

    setSending(false);

    if (successCount > 0) {
      toast({
        title: "Emails Sent",
        description: `Successfully sent ${successCount} email${successCount > 1 ? 's' : ''}${failCount > 0 ? `. ${failCount} failed.` : '.'}`,
      });
    }

    if (failCount === 0) {
      setTimeout(() => onOpenChange(false), 1500);
    }
  };

  const validGroupsCount = vendorGroups.filter(
    (g) => validateEmail(g.email) && g.sendStatus !== 'sent'
  ).length;

  const sentCount = vendorGroups.filter(g => g.sendStatus === 'sent').length;

  return (
    <Dialog open={open} onOpenChange={sending ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            Bulk Email - Review Messages
          </DialogTitle>
          <DialogDescription>
            {vendorGroups.length} vendor{vendorGroups.length > 1 ? 's' : ''} will receive
            emails. Review and edit before sending.
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
                    {group.sendStatus === 'sent' && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                    {group.sendStatus === 'failed' && (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    {group.sendStatus === 'sending' && (
                      <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                    )}
                    {group.hasError && group.sendStatus === 'pending' && (
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

                    {/* Email Address */}
                    <div className="space-y-1">
                      <Label className="text-sm">Email Address</Label>
                      <Input
                        type="email"
                        value={group.email}
                        onChange={(e) =>
                          updateVendorGroup(index, {
                            email: e.target.value,
                            hasError: false,
                            errorMessage: '',
                          })
                        }
                        placeholder="vendor@example.com"
                        className={group.hasError ? 'border-destructive' : ''}
                        disabled={sending || group.sendStatus === 'sent'}
                      />
                      {group.hasError && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {group.errorMessage}
                        </p>
                      )}
                    </div>

                    {/* Subject */}
                    <div className="space-y-1">
                      <Label className="text-sm">Subject</Label>
                      <Input
                        value={group.subject}
                        onChange={(e) =>
                          updateVendorGroup(index, { subject: e.target.value })
                        }
                        disabled={sending || group.sendStatus === 'sent'}
                      />
                    </div>

                    {/* Message Preview */}
                    <div className="space-y-1">
                      <Label className="text-sm">Message Preview</Label>
                      <Textarea
                        value={group.message}
                        onChange={(e) =>
                          updateVendorGroup(index, { message: e.target.value })
                        }
                        rows={6}
                        className="font-mono text-xs"
                        disabled={sending || group.sendStatus === 'sent'}
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
            {sentCount > 0 
              ? `${sentCount}/${vendorGroups.length} emails sent.`
              : 'Emails will be sent using Brevo (300/day free tier).'}
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            {sentCount === vendorGroups.length ? 'Close' : 'Cancel'}
          </Button>
          {sentCount < vendorGroups.length && (
            <Button
              onClick={handleSendEmails}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
              disabled={validGroupsCount === 0 || sending}
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Send Emails ({validGroupsCount})
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
