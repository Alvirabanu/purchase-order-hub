import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { mockPurchaseOrders, mockSuppliers, getSupplierById } from '@/lib/mockData';
import { PurchaseOrder } from '@/types';
import { Search, Eye, Download, ClipboardList, Calendar } from 'lucide-react';

const PORegister = () => {
  const navigate = useNavigate();
  const [purchaseOrders] = useState<PurchaseOrder[]>(mockPurchaseOrders);
  const [searchQuery, setSearchQuery] = useState('');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch = po.po_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSupplier = supplierFilter === 'all' || po.supplier_id === supplierFilter;
    
    let matchesDate = true;
    if (dateFrom) {
      matchesDate = matchesDate && po.date >= dateFrom;
    }
    if (dateTo) {
      matchesDate = matchesDate && po.date <= dateTo;
    }
    
    return matchesSearch && matchesSupplier && matchesDate;
  });

  const getStatusClass = (status: PurchaseOrder['status']) => {
    const statusClasses = {
      draft: 'status-badge status-draft',
      pending: 'status-badge status-pending',
      approved: 'status-badge status-approved',
      completed: 'status-badge status-completed',
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
              
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {mockSuppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
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

        {/* PO Table */}
        <Card>
          <div className="overflow-x-auto">
            {filteredPOs.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>PO Number</th>
                    <th>Supplier</th>
                    <th>Date</th>
                    <th className="text-center">Total Items</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPOs.map((po) => {
                    const supplier = getSupplierById(po.supplier_id);
                    return (
                      <tr key={po.id}>
                        <td>
                          <span className="font-mono font-medium">{po.po_number}</span>
                        </td>
                        <td>{supplier?.name || '-'}</td>
                        <td>{formatDate(po.date)}</td>
                        <td className="text-center">{po.total_items}</td>
                        <td>
                          <span className={getStatusClass(po.status)}>
                            {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/po/${po.id}`)}
                              className="gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              <span className="hidden sm:inline">View</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1"
                            >
                              <Download className="h-4 w-4" />
                              <span className="hidden sm:inline">PDF</span>
                            </Button>
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
                  {searchQuery || supplierFilter !== 'all' || dateFrom || dateTo
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
      </div>
    </AppLayout>
  );
};

export default PORegister;
