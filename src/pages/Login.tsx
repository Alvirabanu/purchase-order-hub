import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, FileText, AlertCircle } from 'lucide-react';
import { UserRole } from '@/types';

const Login = () => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('main_admin');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { loginWithRole } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!role) {
      setError('Please select a role');
      return;
    }

    setIsLoading(true);

    try {
      await loginWithRole(name, role);
      navigate('/create-po');
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-xl bg-primary flex items-center justify-center mb-4 shadow-lg">
            <FileText className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">PO Manager</h1>
          <p className="text-muted-foreground text-sm mt-1">Purchase Order Management System</p>
        </div>

        <Card className="shadow-lg border-border/50">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Welcome</CardTitle>
            <CardDescription>Enter your details and select a role to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="animate-fade-in">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Name / Username</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password (optional)</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Select Role</Label>
                <Select
                  value={role}
                  onValueChange={(value: UserRole) => setRole(value)}
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main_admin">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Main Admin</span>
                        <span className="text-xs text-muted-foreground">Full access to everything</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="po_creator">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">PO Creator</span>
                        <span className="text-xs text-muted-foreground">Create POs, view register</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="approval_admin">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Approval Admin</span>
                        <span className="text-xs text-muted-foreground">Approve POs, view register</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;