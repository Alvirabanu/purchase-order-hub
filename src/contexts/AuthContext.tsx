import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
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
  | 'toggle_include_in_po';

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
    'toggle_include_in_po'
  ],
  po_creator: [
    'view_dashboard',
    'create_po',
    'view_po_register',
    'download_pdf' // Only if approved - checked separately
  ],
  approval_admin: [
    'view_dashboard',
    'view_po_register',
    'approve_po',
    'bulk_approve_po'
  ]
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo users for testing different roles
const demoUsers: Record<string, User> = {
  'admin@demo.com': { id: '1', email: 'admin@demo.com', name: 'Main Admin', role: 'main_admin' },
  'creator@demo.com': { id: '2', email: 'creator@demo.com', name: 'PO Creator', role: 'po_creator' },
  'approver@demo.com': { id: '3', email: 'approver@demo.com', name: 'Approval Admin', role: 'approval_admin' }
};

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
      // Check if demo user, otherwise default to main_admin
      const demoUser = demoUsers[email.toLowerCase()];
      const userData: User = demoUser || {
        id: '1',
        email,
        name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
        role: 'main_admin' // Default role
      };
      setUser(userData);
      localStorage.setItem('po_app_user', JSON.stringify(userData));
      setIsLoading(false);
    } else {
      setIsLoading(false);
      throw new Error('Invalid credentials');
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
