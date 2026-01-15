import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { mockVendors } from '@/lib/mockData';
import { Vendor } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Pencil, Trash2, Building2 } from 'lucide-react';

const Vendors = () => {
  const { hasPermission } = useAuth();
  const canManageVendors = hasPermission('manage_vendors');

  const [vendors, setVendors] = useState<Vendor[]>(mockVendors);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    gst: '',
    address: '',
    contact_person_name: '',
    contact_person_email: '',
  });

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.gst.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenModal = (vendor?: Vendor) => {
    if (vendor) {
      setEditingVendor(vendor);
      setFormData({
        id: vendor.id,
        name: vendor.name,
        gst: vendor.gst,
        address: vendor.address,
        contact_person_name: vendor.contact_person_name,
        contact_person_email: vendor.contact_person_email,
      });
    } else {
      setEditingVendor(null);
      const nextId = `V${String(vendors.length + 1).padStart(3, '0')}`;
      setFormData({ 
        id: nextId, 
        name: '', 
        gst: '', 
        address: '', 
        contact_person_name: '', 
        contact_person_email: '' 
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (editingVendor) {
      setVendors(vendors.map(v => 
        v.id === editingVendor.id ? { ...v, ...formData } : v
      ));
    } else {
      const newVendor: Vendor = {
        ...formData,
      };
      setVendors([...vendors, newVendor]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setVendors(vendors.filter(v => v.id !== id));
  };

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Vendors</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your vendor directory</p>
          </div>
          {canManageVendors && (
            <Button onClick={() => handleOpenModal()} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Vendor
            </Button>
          )}
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

        {/* Vendors Table */}
        <Card>
          <div className="overflow-x-auto">
            {filteredVendors.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vendor ID</th>
                    <th>Vendor Name</th>
                    <th className="max-w-[200px]">Address</th>
                    <th>GST Number</th>
                    <th>Contact Person</th>
                    <th>Contact Email</th>
                    {canManageVendors && <th className="text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map((vendor) => (
                    <tr key={vendor.id}>
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
                      {canManageVendors && (
                        <td className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenModal(vendor)}
                              className="h-8 w-8"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(vendor.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
                <Label htmlFor="id">Vendor ID</Label>
                <Input
                  id="id"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="e.g., V001"
                  disabled={!!editingVendor}
                />
              </div>
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
                  placeholder="Enter contact person name"
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
              <Button onClick={handleSave}>
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
