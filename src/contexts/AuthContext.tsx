import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithRole: (name: string, role: UserRole) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasPermission: (permission: Permission) => boolean;
}

export type Permission = 
  | 'view_dashboard'
  | 'create_po'
  | 'view_po_register'
  | 'approve_po'
  | 'bulk_approve_po'
  | 'download_pdf'
  | 'send_mail'
  | 'manage_vendors'
  | 'manage_products'
  | 'bulk_delete_products'
  | 'toggle_include_in_po'
  | 'view_products'
  | 'view_vendors'
  | 'view_approvals';

const rolePermissions: Record<UserRole, Permission[]> = {
  main_admin: [
    'view_dashboard',
    'create_po',
    'view_po_register',
    'approve_po',
    'bulk_approve_po',
    'download_pdf',
    'send_mail',
    'manage_vendors',
    'manage_products',
    'bulk_delete_products',
    'toggle_include_in_po',
    'view_products',
    'view_vendors',
    'view_approvals'
  ],
  po_creator: [
    'view_dashboard',
    'create_po',
    'view_po_register',
    'download_pdf', // Only if approved - checked separately
    'view_products',
    'view_vendors'
  ],
  approval_admin: [
    'view_dashboard',
    'view_po_register',
    'approve_po',
    'bulk_approve_po',
    'view_approvals',
    'download_pdf'
  ]
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('po_app_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (email && password) {
      const userData: User = {
        id: '1',
        email,
        name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
        role: 'main_admin'
      };
      setUser(userData);
      localStorage.setItem('po_app_user', JSON.stringify(userData));
      setIsLoading(false);
    } else {
      setIsLoading(false);
      throw new Error('Invalid credentials');
    }
  };

  const loginWithRole = async (name: string, role: UserRole) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (name.trim()) {
      const userData: User = {
        id: Date.now().toString(),
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@demo.com`,
        name: name.trim(),
        role
      };
      setUser(userData);
      localStorage.setItem('po_app_user', JSON.stringify(userData));
      setIsLoading(false);
    } else {
      setIsLoading(false);
      throw new Error('Name is required');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('po_app_user');
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    return rolePermissions[user.role]?.includes(permission) ?? false;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      login,
      loginWithRole,
      logout, 
      isAuthenticated: !!user,
      hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};