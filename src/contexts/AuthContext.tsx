import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { User, UserRole } from '@/types';

export type Permission = 
  | 'view_dashboard'
  | 'create_po'
  | 'view_po_register'
  | 'approve_po'
  | 'reject_po'
  | 'bulk_approve_po'
  | 'download_pdf'
  | 'send_mail'
  | 'manage_vendors'
  | 'manage_products'
  | 'bulk_upload'
  | 'bulk_delete_products'
  | 'toggle_include_in_po'
  | 'view_products'
  | 'view_vendors'
  | 'view_approvals'
  | 'add_single_product'
  | 'add_single_vendor';

const rolePermissions: Record<UserRole, Permission[]> = {
  main_admin: [
    'view_dashboard',
    'view_po_register',
    'view_products',
    'view_vendors',
    'view_approvals',
    'manage_vendors',
    'manage_products',
    'bulk_upload',
    'bulk_delete_products',
    'toggle_include_in_po',
    'download_pdf',
  ],
  po_creator: [
    'view_dashboard',
    'create_po',
    'view_po_register',
    'view_products',
    'view_vendors',
    'add_single_product',
    'add_single_vendor',
  ],
  approval_admin: [
    'view_dashboard',
    'view_po_register',
    'approve_po',
    'reject_po',
    'bulk_approve_po',
    'view_approvals',
    'download_pdf',
    'send_mail',
  ]
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasPermission: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  login: async () => {},
  signUp: async () => {},
  logout: async () => {},
  isAuthenticated: false,
  hasPermission: () => false,
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = useCallback(async (supabaseUser: SupabaseUser): Promise<User | null> => {
    try {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      // Fetch role from user_roles table
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', supabaseUser.id)
        .maybeSingle();

      if (roleError) {
        console.error('Error fetching role:', roleError);
      }

      const role = (roleData?.role as UserRole) || 'po_creator';
      const name = profile?.name || supabaseUser.email?.split('@')[0] || 'User';

      return {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name,
        role,
      };
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        
        if (currentSession?.user) {
          // Use setTimeout to avoid potential race conditions with Supabase
          setTimeout(async () => {
            const userProfile = await fetchUserProfile(currentSession.user);
            setUser(userProfile);
            setIsLoading(false);
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // Then get initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      
      if (initialSession?.user) {
        const userProfile = await fetchUserProfile(initialSession.user);
        setUser(userProfile);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          name,
        },
      },
    });
    
    if (error) {
      throw error;
    }

    // Create profile and user_role if signup was successful
    if (data.user) {
      // Insert profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          name,
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
      }

      // Insert default role (po_creator)
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: data.user.id,
          role: 'po_creator',
        });

      if (roleError) {
        console.error('Error creating user role:', roleError);
      }
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    setUser(null);
    setSession(null);
  };

  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!user) return false;
    return rolePermissions[user.role]?.includes(permission) ?? false;
  }, [user]);

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    login,
    signUp,
    logout,
    isAuthenticated: !!user && !!session,
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
