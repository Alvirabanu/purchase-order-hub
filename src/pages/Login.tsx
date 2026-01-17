import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useDataStore } from '@/contexts/DataStoreContext';
import { UserRole } from '@/types';
import { Package, LogIn } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading } = useAuth();
  const { validateCredentials } = useDataStore();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [error, setError] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isLoading, isAuthenticated, navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Please enter your username');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    if (!role) {
      setError('Please select a role');
      return;
    }

    // Validate credentials
    const validUser = validateCredentials(username.trim(), password, role);
    
    if (!validUser) {
      setError('Invalid credentials. Please check your username, password, and role.');
      return;
    }

    // Login with validated user info
    login(validUser.name, role, password);
    navigate('/dashboard');
  };

  const getRoleLabel = (r: UserRole) => {
    const labels: Record<UserRole, string> = {
      main_admin: 'Main Admin',
      po_creator: 'PO Creator',
      approval_admin: 'Approval Admin',
    };
    return labels[r];
  };

  const getRoleDescription = (r: UserRole) => {
    const descriptions: Record<UserRole, string> = {
      main_admin: 'Manage products and vendors (master data)',
      po_creator: 'Create purchase orders',
      approval_admin: 'Approve/reject POs and download',
    };
    return descriptions[r];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
            <Package className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">PO Manager</CardTitle>
          <CardDescription>
            Sign in to access the Purchase Order Management System
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Select Role</Label>
              <Select value={role} onValueChange={(value: UserRole) => setRole(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your role" />
                </SelectTrigger>
                <SelectContent>
                  {(['main_admin', 'po_creator', 'approval_admin'] as UserRole[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      <div className="flex flex-col">
                        <span className="font-medium">{getRoleLabel(r)}</span>
                        <span className="text-xs text-muted-foreground">{getRoleDescription(r)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full gap-2">
              <LogIn className="h-4 w-4" />
              Login
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Main Admin: Use username "thofik" with password "thofik"
            </p>
            <p className="text-xs text-muted-foreground text-center mt-1">
              Other roles: Contact Main Admin to create your account
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
