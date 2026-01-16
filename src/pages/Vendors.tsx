import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { useDataStore } from '@/contexts/DataStoreContext';
import { Vendor } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Pencil, Trash2, Building2, FileSpreadsheet, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Vendors = () => {
  const location = useLocation();
  const { user, hasPermission } = useAuth();
  const isMainAdmin = user?.role === 'main_admin';
  
  const canManageVendors = hasPermission('manage_vendors');
  const canBulkUpload = hasPermission('bulk_upload_vendors');
  const canBulkDelete = hasPermission('bulk_delete_vendors');
  const canAddSingle = hasPermission('add_single_vendor');

  const { vendors, addVendor, updateVendor, deleteVendor, deleteVendors, refreshVendors } = useDataStore();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: '',
    gst: '',
    address: '',
    phone: '',
    contact_person_name: '',
    contact_person_email: '',
  });

  // Handle prefill from navigation state
  useEffect(() => {
    const state = location.state as { prefillVendorName?: string } | null;
    if (state?.prefillVendorName) {
      setFormData(prev => ({ ...prev, name: state.prefillVendorName }));
      setIsModalOpen(true);
      // Clear state after use
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.gst.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenModal = (vendor?: Vendor) => {
    if (vendor) {
      setEditingVendor(vendor);
      setFormData({
        name: vendor.name,
        gst: vendor.gst,
        address: vendor.address,
        phone: vendor.phone || '',
        contact_person_name: vendor.contact_person_name,
        contact_person_email: vendor.contact_person_email,
      });
    } else {
      setEditingVendor(null);
      setFormData({ 
        name: '', 
        gst: '', 
        address: '', 
        phone: '',
        contact_person_name: '', 
        contact_person_email: '' 
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingVendor) {
        await updateVendor(editingVendor.id, formData);
        toast({
          title: "Vendor Updated",
          description: "Vendor has been updated successfully.",
        });
      } else {
        await addVendor(formData);
        toast({
          title: "Vendor Added",
          description: "New vendor has been added successfully.",
        });
      }
      setIsModalOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save vendor",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVendor(id);
      setSelectedVendors(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      toast({
        title: "Vendor Deleted",
        description: "Vendor has been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete vendor",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      await deleteVendors(Array.from(selectedVendors));
      const count = selectedVendors.size;
      setSelectedVendors(new Set());
      toast({
        title: "Vendors Deleted",
        description: `${count} vendor(s) have been removed.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete vendors",
        variant: "destructive",
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedVendors(new Set(filteredVendors.map(v => v.id)));
    } else {
      setSelectedVendors(new Set());
    }
  };

  const handleSelectVendor = (id: string, checked: boolean) => {
    setSelectedVendors(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleDownloadTemplate = () => {
    const headers = ['Vendor ID', 'Vendor Name', 'Address', 'GST Number', 'Contact Person Name', 'Contact Person Email'];
    const csvContent = headers.join(',') + '\n';
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'vendor_master_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Template Downloaded",
      description: "Blank vendor template has been downloaded.",
    });
  };

  const handleUploadExcel = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({
          title: "Error",
          description: "File is empty or has no data rows",
          variant: "destructive",
        });
        return;
      }

      // Parse and import vendors
      toast({
        title: "Upload Processing",
        description: "Vendors are being imported...",
      });
      
      // TODO: Implement actual import logic
      await refreshVendors();
    };
    reader.readAsText(file);
    
    event.target.value = '';
  };

  // Determine if user can add vendors (Admin can manage, PO Creator can add single)
  const canAddVendor = canManageVendors || canAddSingle;

  const allSelected = filteredVendors.length > 0 && filteredVendors.every(v => selectedVendors.has(v.id));
  const someSelected = selectedVendors.size > 0;

  // Check authorization
  if (!hasPermission('view_vendors')) {
    return (
      <AppLayout>
        <div className="animate-fade-in">
          <Card>
            <CardContent className="py-16 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Not Authorized</h2>
              <p className="text-muted-foreground">
                You don't have permission to view vendors.
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
            <h1 className="page-title">Vendors</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your vendor directory</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Main Admin: Bulk operations */}
            {canBulkUpload && (
              <>
                <Button variant="outline" className="gap-2" onClick={handleDownloadTemplate}>
                  <FileSpreadsheet className="h-4 w-4" />
                  Download Vendor Master Template
                </Button>
                <Button 
                  variant="outline" 
                  className="gap-2" 
                  onClick={handleUploadExcel}
                >
                  <Upload className="h-4 w-4" />
                  Upload Excel
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </>
            )}
            {canAddVendor && (
              <Button 
                onClick={() => handleOpenModal()} 
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Vendor
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID or GST number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 max-w-md"
              />
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions - Only for Main Admin */}
        {someSelected && canBulkDelete && (
          <Card className="mb-4 border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedVendors.size} vendor{selectedVendors.size > 1 ? 's' : ''} selected
              </span>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleBulkDelete}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Vendors Table */}
        <Card>
          <div className="overflow-x-auto">
            {filteredVendors.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    {canBulkDelete && (
                      <th className="w-12">
                        <Checkbox 
                          checked={allSelected}
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                    )}
                    <th>Vendor ID</th>
                    <th>Vendor Name</th>
                    <th className="max-w-[200px]">Address</th>
                    <th>GST Number</th>
                    <th>Contact Person Name</th>
                    <th>Contact Person Email</th>
                    {(canManageVendors || canAddSingle) && <th className="text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map((vendor) => (
                    <tr key={vendor.id}>
                      {canBulkDelete && (
                        <td>
                          <Checkbox 
                            checked={selectedVendors.has(vendor.id)}
                            onCheckedChange={(checked) => handleSelectVendor(vendor.id, !!checked)}
                          />
                        </td>
                      )}
                      <td>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {vendor.id}
                        </code>
                      </td>
                      <td className="font-medium">{vendor.name}</td>
                      <td className="max-w-[200px] truncate text-muted-foreground">
                        {vendor.address}
                      </td>
                      <td>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {vendor.gst}
                        </code>
                      </td>
                      <td>{vendor.contact_person_name}</td>
                      <td className="text-muted-foreground">{vendor.contact_person_email}</td>
                      {(canManageVendors || canAddSingle) && (
                        <td className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenModal(vendor)}
                              className="h-8 w-8"
                              disabled={!canManageVendors && !canAddSingle}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {canManageVendors && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(vendor.id)}
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state py-16">
                <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-1">No vendors found</h3>
                <p className="text-muted-foreground text-sm">
                  {searchQuery ? 'Try adjusting your search' : 'Get started by adding your first vendor'}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Add/Edit Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
              <DialogDescription>
                {editingVendor ? 'Update the vendor details below.' : 'Fill in the details to add a new vendor.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Vendor Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter vendor name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full address including city and PIN code"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gst">GST Number</Label>
                <Input
                  id="gst"
                  value={formData.gst}
                  onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                  placeholder="e.g., 27AABCT1234C1ZV"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_person_name">Contact Person Name</Label>
                <Input
                  id="contact_person_name"
                  value={formData.contact_person_name}
                  onChange={(e) => setFormData({ ...formData, contact_person_name: e.target.value })}
                  placeholder="Contact person's full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_person_email">Contact Person Email</Label>
                <Input
                  id="contact_person_email"
                  type="email"
                  value={formData.contact_person_email}
                  onChange={(e) => setFormData({ ...formData, contact_person_email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!formData.name}>
                {editingVendor ? 'Save Changes' : 'Add Vendor'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Vendors;
