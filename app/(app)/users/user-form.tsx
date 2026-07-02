
'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import type { User, CustomSetting } from '@/types';

function SubmitButton({ isEditMode }: { isEditMode?: boolean }) {
  const { pending } = useFormStatus();
  const buttonText = isEditMode ? 'Save Changes' : 'Add User';
  const pendingText = isEditMode ? 'Saving...' : 'Adding...';

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {pending ? pendingText : buttonText}
    </Button>
  );
}

interface UserFormProps {
  user?: User | null;
  formAction: (formData: FormData) => void;
  roles: CustomSetting[];
  isEditMode?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export function UserForm({ user, formAction, roles, isEditMode = false, isOpen = true, onClose }: UserFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  const FormContent = (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input id="name" name="name" placeholder="John Doe" required defaultValue={user?.name} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="you@example.com" required defaultValue={user?.email} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Mobile No.</Label>
        <Input id="phone" name="phone" type="tel" placeholder="9876543210" required defaultValue={user?.phone} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{isEditMode ? 'New Password (Optional)' : 'Password'}</Label>
        <div className="relative">
          <Input 
            id="password" 
            name="password" 
            type={showPassword ? 'text' : 'password'} 
            placeholder="••••••••" 
            required={!isEditMode}
            autoComplete="new-password"
          />
          <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
          </Button>
        </div>
        {isEditMode && <p className="text-xs text-muted-foreground">Leave blank to keep the current password.</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select name="role" required defaultValue={user?.role || roles[0]?.name}>
          <SelectTrigger id="role">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map(role => (
              <SelectItem key={role.id} value={role.name}>{role.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="shiftHours">Shift Duration (Hours)</Label>
        <Select name="shiftHours" required defaultValue={(user?.shiftHours || 8).toString()}>
          <SelectTrigger id="shiftHours">
            <SelectValue placeholder="Select shift duration" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2 Hours</SelectItem>
            <SelectItem value="4">4 Hours</SelectItem>
            <SelectItem value="6">6 Hours</SelectItem>
            <SelectItem value="8">8 Hours</SelectItem>
            <SelectItem value="9">9 Hours</SelectItem>
            <SelectItem value="10">10 Hours</SelectItem>
            <SelectItem value="12">12 Hours</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <SubmitButton isEditMode={isEditMode} />
    </form>
  );

  if (isEditMode) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User: {user?.name}</DialogTitle>
            <DialogDescription>Update the user's details below.</DialogDescription>
          </DialogHeader>
          <div className="py-4">{FormContent}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">User Details</CardTitle>
        <CardDescription>Fill out the form to create a new user.</CardDescription>
      </CardHeader>
      <CardContent>{FormContent}</CardContent>
    </Card>
  );
}
