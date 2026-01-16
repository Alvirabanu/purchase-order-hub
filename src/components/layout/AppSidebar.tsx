import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Package,
  Building2,
  FilePlus,
  ClipboardList,
  LogOut,
  FileText,
  ChevronLeft,
  Menu,
  CheckSquare,
} from 'lucide-react';

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'main_admin': return 'Main Admin';
    case 'po_creator': return 'PO Creator';
    case 'approval_admin': return 'Approval Admin';
    default: return role;
  }
};

const getRoleColor = (role: string) => {
  switch (role) {
    case 'main_admin': return 'bg-primary text-primary-foreground';
    case 'po_creator': return 'bg-success text-white';
    case 'approval_admin': return 'bg-warning text-white';
    default: return 'bg-secondary';
  }
};

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  visibleFor: string[];
}

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Define nav items with role-based visibility
  const allNavItems: NavItem[] = [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, visibleFor: ['main_admin', 'po_creator', 'approval_admin'] },
    { title: 'Products', url: '/products', icon: Package, visibleFor: ['main_admin', 'po_creator'] },
    { title: 'Vendors', url: '/vendors', icon: Building2, visibleFor: ['main_admin', 'po_creator'] },
    { title: 'Create PO', url: '/create-po', icon: FilePlus, visibleFor: ['po_creator'] },
    { title: 'PO Register', url: '/po-register', icon: ClipboardList, visibleFor: ['main_admin', 'po_creator', 'approval_admin'] },
    { title: 'Approvals', url: '/approvals', icon: CheckSquare, visibleFor: ['approval_admin'] },
  ];

  // Filter nav items based on user role
  const navItems = allNavItems.filter(item => 
    user?.role && item.visibleFor.includes(user.role)
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-semibold text-sidebar-foreground text-sm">PO Manager</span>
                <span className="text-xs text-sidebar-muted">v1.0.0</span>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent shrink-0"
          >
            {isCollapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <button
                        onClick={() => navigate(item.url)}
                        className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent'
                        }`}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {!isCollapsed && <span className="text-sm font-medium">{item.title}</span>}
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {!isCollapsed && user && (
          <div className="mb-3 px-1">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
            <p className="text-xs text-sidebar-muted truncate mb-2">{user.email}</p>
            <Badge className={`text-xs ${getRoleColor(user.role)}`}>
              {getRoleLabel(user.role)}
            </Badge>
          </div>
        )}
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={`w-full justify-start text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent ${
            isCollapsed ? 'px-0 justify-center' : ''
          }`}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span className="ml-3 text-sm">Sign out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
