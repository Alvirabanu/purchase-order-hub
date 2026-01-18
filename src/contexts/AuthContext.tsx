import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, UserRole } from '@/types';

export type Permission = 
  | 'view_dashboard'
  | 'view_products'
  | 'view_vendors'
  | 'view_po_register'
  | 'view_po_download'
  | 'view_create_po'
  | 'view_approvals'
  | 'view_rejected'
  // Main Admin permissions (master data only)
  | 'manage_products'
  | 'manage_vendors'
  | 'bulk_upload_products'
  | 'bulk_upload_vendors'
  | 'bulk_delete_products'
  | 'bulk_delete_vendors'
  | 'download_product_template'
  | 'download_vendor_template'
  // PO Creator permissions
  | 'create_po'
  | 'add_single_product'
  | 'add_single_vendor'
  | 'add_to_po_queue'
  | 'edit_po_quantity'
  // Approval Admin permissions
  | 'approve_po'
  | 'reject_po'
  | 'bulk_approve_po'
  | 'download_po'
  | 'bulk_download_po'
  | 'delete_po';

// Updated role permissions per requirements:
// Main Admin: Dashboard, Products, Vendors, Create PO, PO Register, Approvals, Rejected, PO Download
// PO Creator: Dashboard, Products, Create PO, PO Register, PO Download (hide Vendors management UI but page can exist read-only)
// Approval Admin: Dashboard, PO Register, Approvals, Rejected, PO Download (hide Products/Vendors/Create PO)
const rolePermissions: Record<UserRole, Permission[]> = {
  main_admin: [
    'view_dashboard',
    'view_products',
    'view_vendors',
    'view_create_po',
    'view_po_register',
    'view_approvals',
    'view_rejected',
    'view_po_download',
    'manage_products',
    'manage_vendors',
    'bulk_upload_products',
    'bulk_upload_vendors',
    'bulk_delete_products',
    'bulk_delete_vendors',
    'download_product_template',
    'download_vendor_template',
    'create_po',
    'add_to_po_queue',
    'edit_po_quantity',
    'approve_po',
    'reject_po', // Added: Main Admin can also reject
    'bulk_approve_po',
    'download_po',
    'bulk_download_po',
    'delete_po',
  ],
  po_creator: [
    'view_dashboard',
    'view_products',
    'view_vendors', // read-only access
    'view_create_po',
    'view_po_register',
    'view_po_download',
    'create_po',
    'add_single_product',
    'add_single_vendor',
    'add_to_po_queue',
    'edit_po_quantity',
    'download_po',
    'bulk_download_po',
  ],
  approval_admin: [
    'view_dashboard',
    'view_po_register',
    'view_approvals',
    'view_rejected',
    'view_po_download',
    'approve_po',
    'reject_po',
    'bulk_approve_po',
    'download_po',
    'bulk_download_po',
  ]
};

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (name: string, role: UserRole, password?: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  hasPermission: (permission: Permission) => boolean;
}

const AUTH_STORAGE_KEY = 'po_manager_auth';

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
  hasPermission: () => false,
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.role && parsed.name) {
          setUser({
            id: parsed.id || 'local-user',
            email: parsed.email || '',
            name: parsed.name,
            role: parsed.role as UserRole,
          });
        }
      }
    } catch (error) {
      console.error('Error loading auth from localStorage:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback((name: string, role: UserRole, password?: string) => {
    // Password is optional and not validated for local mock auth
    const newUser: User = {
      id: 'local-user-' + Date.now(),
      email: '',
      name,
      role,
    };
    
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
  }, []);

  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!user) return false;
    return rolePermissions[user.role]?.includes(permission) ?? false;
  }, [user]);

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
