import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
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
    'download_pdf',
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

async function fetchUserRole(userId: string): Promise<UserRole> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (error) {
    console.error('Error fetching user role:', error);
    return 'po_creator'; // Default role
  }
  
  return (data?.role as UserRole) || 'po_creator';
}

async function fetchUserProfile(userId: string): Promise<{ name: string } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', userId)
    .maybeSingle();
  
  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
  
  return data;
}

async function buildUserFromSession(session: Session): Promise<User> {
  const supabaseUser = session.user;
  const [role, profile] = await Promise.all([
    fetchUserRole(supabaseUser.id),
    fetchUserProfile(supabaseUser.id)
  ]);
  
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: profile?.name || supabaseUser.email?.split('@')[0] || 'User',
    role
  };
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          const userData = await buildUserFromSession(session);
          setUser(userData);
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const userData = await buildUserFromSession(session);
        setUser(userData);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      throw new Error(error.message);
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { name }
      }
    });
    
    if (error) {
      throw new Error(error.message);
    }

    // Create profile after signup
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        name
      });
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
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
      signup,
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
