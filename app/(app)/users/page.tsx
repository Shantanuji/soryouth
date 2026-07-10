

'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, PlusCircle, Loader2, MoreVertical, Trash2, Edit, UserX, UserCheck, Settings, ShieldCheck, Eye, ListFilter } from 'lucide-react';
import type { User, CustomSetting } from '@/types';
import { getUsers, deleteUser, updateUser, toggleUserStatus, toggleUserViewPermission } from './actions';
import { getUserRoles } from '@/app/(app)/settings/actions';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { UserForm } from './user-form';
import { SettingsDialog } from '@/app/(app)/settings/settings-dialog';
import { UserAttendanceHistoryDialog } from '@/components/user-attendance-history-dialog';
import { useRouter } from 'next/navigation';

export default function ManageUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<CustomSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, startTransition] = useTransition();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const [isHRMSOpen, setIsHRMSOpen] = useState(false);
  const [hrmsUserId, setHrmsUserId] = useState<string | null>(null);
  const [hrmsUserName, setHrmsUserName] = useState<string>('');

  const fetchData = async () => {
      try {
          setIsLoading(true);
          const [fetchedUsers, fetchedRoles] = await Promise.all([
            getUsers(),
            getUserRoles(),
          ]);
          setUsers(fetchedUsers || []);
          setRoles(fetchedRoles || []);
      } catch (error) {
          console.error("Error fetching users:", error);
          toast({ title: "Error", description: "Failed to load users data.", variant: "destructive" });
      } finally {
          setIsLoading(false);
      }
  };
  
  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenEditDialog = (user: User) => {
    setSelectedUser(user);
    setIsFormOpen(true);
  };
  
  const closeForm = () => {
    setSelectedUser(null);
    setIsFormOpen(false);
  }

  const handleFormSubmit = (formData: FormData) => {
    if (!selectedUser) return;
    startTransition(async () => {
        const result = await updateUser(selectedUser.id, formData);
        if (result.success) {
            toast({ title: "User Updated", description: `${selectedUser.name}'s details have been updated.` });
            closeForm();
            fetchData();
        } else {
            toast({ title: "Error", description: result.error || "Failed to update user.", variant: "destructive" });
        }
    });
  };

  const handleDeleteUser = (userId: string) => {
    startTransition(async () => {
        const result = await deleteUser(userId);
        if (result.success) {
            toast({
                title: "User Deleted",
                description: "The user has been successfully deleted.",
            });
            fetchData();
        } else {
            toast({
                title: "Error",
                description: result.error || "Failed to delete user.",
                variant: "destructive",
            });
        }
    });
  };
  
  const handleToggleStatus = (user: User) => {
    startTransition(async () => {
      const result = await toggleUserStatus(user.id, user.isActive);
      if (result.success) {
        toast({ title: "Status Updated", description: `${user.name}'s status has been changed.` });
        fetchData();
      } else {
        toast({ title: "Error", description: result.error || "Failed to update status.", variant: "destructive" });
      }
    });
  };

  const handleToggleViewPermission = (user: User) => {
    startTransition(async () => {
        const result = await toggleUserViewPermission(user.id, user.viewPermission);
        if(result.success) {
            toast({ title: 'Permission Updated', description: `${user.name}'s view permission has been updated.`});
            fetchData();
        } else {
            toast({ title: 'Error', description: result.error || 'Failed to update permission.', variant: 'destructive'});
        }
    });
  }

  return (
    <>
      <PageHeader
        title="Manage Users"
        description="Add, view, and manage user accounts and their roles."
        icon={Users}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
              <Settings className="mr-2 h-4 w-4" /> Manage Roles
            </Button>
            <Button variant="outline" onClick={() => router.push('/users/roles')}>
              <ShieldCheck className="mr-2 h-4 w-4" /> Manage Role Permissions
            </Button>
            <Button asChild>
              <Link href="/users/add">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New User
              </Link>
            </Button>
          </div>
        }
      />
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
             <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             </div>
          ) : (
          <div className="overflow-x-auto">
            <Table className="w-full align-middle mb-0">
              <TableHeader className="bg-muted/15 border-b border-border/60">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap py-3">Name</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap py-3">Email</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap py-3">Phone</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap py-3">Role</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap py-3">Status</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap py-3">View Permission</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap py-3">Date Joined</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap py-3">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/40">
                {users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/10 border-b border-border/40 transition-colors">
                    <TableCell className="font-semibold py-3.5 text-sm">{user.name}</TableCell>
                    <TableCell className="py-3.5 text-xs text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="py-3.5 text-xs text-muted-foreground font-medium">{user.phone}</TableCell>
                    <TableCell className="py-3.5">
                      <Badge variant={user.role === 'Admin' ? 'softDestructive' : 'softSecondary' as any} className="text-[10px] font-semibold tracking-wide py-0.5 px-2.5">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <Badge variant={user.isActive ? 'softSuccess' : 'softDestructive' as any} className="text-[10px] font-semibold tracking-wide py-0.5 px-2.5">
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <Badge variant={user.viewPermission === 'ALL' ? 'softSuccess' : 'softInfo' as any} className="text-[10px] font-semibold tracking-wide py-0.5 px-2.5">
                         {user.viewPermission === 'ALL' ? 'All Data' : 'Assigned Only'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3.5 text-xs text-muted-foreground">{format(new Date(user.createdAt), 'dd MMM, yyyy')}</TableCell>
                     <TableCell className="text-right py-3.5">
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-7 w-7 p-0 rounded-circle hover:bg-muted">
                                  <span className="sr-only">Open menu</span>
                                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                   setHrmsUserId(user.id);
                                   setHrmsUserName(user.name);
                                   setIsHRMSOpen(true);
                               }}>
                                   <Eye className="mr-2 h-3.5 w-3.5" />
                                   View HRMS Report
                               </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenEditDialog(user)}>
                                  <Edit className="mr-2 h-3.5 w-3.5" />
                                  Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                                  {user.isActive ? <UserX className="mr-2 h-3.5 w-3.5 text-rose-500" /> : <UserCheck className="mr-2 h-3.5 w-3.5 text-primary" />}
                                  <span>{user.isActive ? 'Make Inactive' : 'Make Active'}</span>
                              </DropdownMenuItem>
                               <DropdownMenuItem onClick={() => handleToggleViewPermission(user)}>
                                  {user.viewPermission === 'ALL' ? <ListFilter className="mr-2 h-3.5 w-3.5" /> : <Eye className="mr-2 h-3.5 w-3.5" />}
                                  <span>{user.viewPermission === 'ALL' ? 'Set to Assigned View' : 'Set to All View'}</span>
                              </DropdownMenuItem>
                             <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/20">
                                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                                          Delete
                                      </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                      <AlertDialogHeader>
                                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                              This action cannot be undone. This will permanently delete the user account for "{user.name}".
                                          </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                              className={buttonVariants({ variant: 'destructive' })}
                                              onClick={() => handleDeleteUser(user.id)}
                                              disabled={isProcessing}
                                          >
                                              {isProcessing ? 'Deleting...' : 'Delete'}
                                          </AlertDialogAction>
                                      </AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                          </DropdownMenuContent>
                       </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          )}
        </CardContent>
      </Card>
      
      {isFormOpen && (
        <UserForm
            isEditMode
            user={selectedUser}
            roles={roles}
            isOpen={isFormOpen}
            onClose={closeForm}
            formAction={handleFormSubmit}
        />
      )}
      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => {
            setIsSettingsOpen(false);
            fetchData();
        }}
        settingTypes={[{ title: 'User Roles', type: 'USER_ROLE' }]}
      />
      {hrmsUserId && (
        <UserAttendanceHistoryDialog
          userId={hrmsUserId}
          userName={hrmsUserName}
          isOpen={isHRMSOpen}
          onClose={() => {
            setIsHRMSOpen(false);
            setHrmsUserId(null);
          }}
        />
      )}
    </>
  );
}

