import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mockProducts, mockSuppliers, mockPurchaseOrders } from '@/lib/mockData';
import { 
  Package, 
  Users, 
  FileText, 
  FilePlus, 
  ClipboardList, 
  ArrowRight,
  TrendingUp 
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();

  const stats = [
    {
      title: 'Total Products',
      value: mockProducts.length,
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Total Suppliers',
      value: mockSuppliers.length,
      icon: Users,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'POs This Month',
      value: mockPurchaseOrders.length,
      icon: FileText,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  const quickActions = [
    { label: 'Create PO', icon: FilePlus, path: '/create-po', variant: 'default' as const },
    { label: 'Products', icon: Package, path: '/products', variant: 'outline' as const },
    { label: 'Suppliers', icon: Users, path: '/suppliers', variant: 'outline' as const },
    { label: 'PO Register', icon: ClipboardList, path: '/po-register', variant: 'outline' as const },
  ];

  const lowStockProducts = mockProducts.filter(p => p.current_stock <= p.reorder_level);

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">Overview of your purchase order system</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {stats.map((stat) => (
            <Card key={stat.title} className="stat-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`h-12 w-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant={action.variant}
                  onClick={() => navigate(action.path)}
                  className="gap-2"
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <Card className="border-warning/30 bg-warning/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-warning" />
                Low Stock Alert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {lowStockProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 bg-card rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        Stock: <span className="font-semibold text-destructive">{product.current_stock}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">Reorder at: {product.reorder_level}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                className="w-full mt-4 text-warning hover:text-warning hover:bg-warning/10"
                onClick={() => navigate('/create-po')}
              >
                Create Purchase Order
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
