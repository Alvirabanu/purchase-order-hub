import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDataStore } from '@/contexts/DataStoreContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { UserRole } from '@/types';
import { UserPlus, Trash2, Shield, Users } from 'lucide-react';
import { toast } from 'sonner';

const AccessManager = () => {
  const { user } = useAuth();
  const { appUsers, addAppUser, deleteAppUser } = useDataStore();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    username: '',
    password: '',
    role: '' as UserRole | '',
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Only Main Admin can access this page
  if (user?.role !== 'main_admin') {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive">Access Denied</CardTitle>
              <CardDescription>
                Only Main Admin can access the Access Manager.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const getRoleLabel = (role: UserRole) => {
    const labels: Record<UserRole, string> = {
      main_admin: 'Main Admin',
      po_creator: 'PO Creator',
      approval_admin: 'Approval Admin',
    };
    return labels[role];
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'main_admin': return 'bg-primary text-primary-foreground';
      case 'po_creator': return 'bg-green-500 text-white';
      case 'approval_admin': return 'bg-amber-500 text-white';
      default: return 'bg-secondary';
    }
  };

  const handleAddUser = () => {
    if (!newUser.name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    if (!newUser.username.trim()) {
      toast.error('Please enter a username');
      return;
    }
    if (!newUser.password.trim()) {
      toast.error('Please enter a password');
      return;
    }
    if (!newUser.role) {
      toast.error('Please select a role');
      return;
    }

    // Check if username already exists
    const usernameExists = appUsers.some(
      u => u.username.toLowerCase() === newUser.username.trim().toLowerCase()
    );
    if (usernameExists) {
      toast.error('Username already exists');
      return;
    }

    // Check if trying to use admin username
    if (newUser.username.trim().toLowerCase() === 'thofik') {
      toast.error('This username is reserved for Main Admin');
      return;
    }

    addAppUser({
      name: newUser.name.trim(),
      username: newUser.username.trim(),
      password: newUser.password,
      role: newUser.role,
    });

    toast.success(`User "${newUser.name}" created successfully`);
    setNewUser({ name: '', username: '', password: '', role: '' });
    setIsAddDialogOpen(false);
  };

  const handleDeleteUser = (id: string) => {
    const userToDelete = appUsers.find(u => u.id === id);
    if (userToDelete) {
      deleteAppUser(id);
      toast.success(`User "${userToDelete.name}" deleted`);
    }
    setDeleteConfirmId(null);
  };

  // Filter out main_admin users from the list (they can't be managed here)
  const managedUsers = appUsers.filter(u => u.role !== 'main_admin');

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Access Manager
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage user accounts for PO Creator and Approval Admin roles
            </p>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new user account for PO Creator or Approval Admin role.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter full name"
                    value={newUser.name}
                    onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="Enter username"
                    value={newUser.username}
                    onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select 
                    value={newUser.role} 
                    onValueChange={(value: UserRole) => setNewUser(prev => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="po_creator">
                        <div className="flex flex-col">
                          <span className="font-medium">PO Creator</span>
                          <span className="text-xs text-muted-foreground">Create purchase orders</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="approval_admin">
                        <div className="flex flex-col">
                          <span className="font-medium">Approval Admin</span>
                          <span className="text-xs text-muted-foreground">Approve/reject POs</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddUser}>
                  Create User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{managedUsers.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                PO Creators
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {managedUsers.filter(u => u.role === 'po_creator').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Approval Admins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {managedUsers.filter(u => u.role === 'approval_admin').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Accounts
            </CardTitle>
            <CardDescription>
              Manage user credentials for system access
            </CardDescription>
          </CardHeader>
          <CardContent>
            {managedUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users created yet.</p>
                <p className="text-sm">Click "Add User" to create a new user account.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {managedUsers.map((appUser) => (
                    <TableRow key={appUser.id}>
                      <TableCell className="font-medium">{appUser.name}</TableCell>
                      <TableCell>{appUser.username}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(appUser.role)}`}>
                          {getRoleLabel(appUser.role)}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(appUser.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog 
                          open={deleteConfirmId === appUser.id} 
                          onOpenChange={(open) => !open && setDeleteConfirmId(null)}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirmId(appUser.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Delete User</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to delete "{appUser.name}"? This action cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                                Cancel
                              </Button>
                              <Button 
                                variant="destructive" 
                                onClick={() => handleDeleteUser(appUser.id)}
                              >
                                Delete
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AccessManager;
