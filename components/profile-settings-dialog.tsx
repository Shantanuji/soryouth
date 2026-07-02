'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUserProfile, updateCurrentUserProfile } from '@/app/(app)/users/actions';
import { Loader2, Eye, EyeOff, User } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

type ProfileSettingsDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ProfileSettingsDialog({ isOpen, onClose }: ProfileSettingsDialogProps) {
  const { toast } = useToast();
  const [profile, setProfile] = useState<{ name: string; email: string; phone: string; profileImage?: string | null } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setImagePreview(null);
      getCurrentUserProfile().then((res) => {
        if (res) {
          setProfile(res);
        } else {
          toast({
            title: 'Error',
            description: 'Could not load your profile details.',
            variant: 'destructive',
          });
        }
        setIsLoading(false);
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await updateCurrentUserProfile(formData);
      if (res.success) {
        toast({
          title: 'Profile Updated',
          description: res.message || 'Your profile was updated successfully!',
        });
        onClose();
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        toast({
          title: 'Error',
          description: res.error || 'Failed to update profile.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6 rounded-xl">
        <DialogHeader className="pb-2 border-b">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <span>Account Profile Settings</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Edit your personal details. Field marked with * are required.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-4" encType="multipart/form-data">
            {/* Profile Image Upload & Preview */}
            <div className="flex flex-col items-center gap-2 pb-2 select-none">
              <div className="relative group">
                <Avatar className="h-20 w-20 ring-4 ring-primary/10">
                  {imagePreview ? (
                    <AvatarImage src={imagePreview} className="object-cover" />
                  ) : profile?.profileImage ? (
                    <AvatarImage src={profile.profileImage} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-primary text-white text-2xl font-extrabold">
                    {(profile?.name || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex flex-col items-center mt-1">
                <Label
                  htmlFor="profile-image-input"
                  className="px-3 py-1.5 border border-border text-[11px] font-bold rounded-lg cursor-pointer hover:bg-muted bg-background transition-colors text-foreground shadow-sm"
                >
                  Upload Profile Image
                </Label>
                <input
                  id="profile-image-input"
                  name="profileImage"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setImagePreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-name" className="text-xs font-bold text-foreground">
                Full Name *
              </Label>
              <Input
                id="profile-name"
                name="name"
                required
                placeholder="John Doe"
                defaultValue={profile?.name}
                className="h-9.5 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-email" className="text-xs font-bold text-foreground">
                Email Address *
              </Label>
              <Input
                id="profile-email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                defaultValue={profile?.email}
                className="h-9.5 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-phone" className="text-xs font-bold text-foreground">
                Mobile Number *
              </Label>
              <Input
                id="profile-phone"
                name="phone"
                type="tel"
                required
                placeholder="9876543210"
                defaultValue={profile?.phone}
                className="h-9.5 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-password" className="text-xs font-bold text-foreground">
                New Password (Optional)
              </Label>
              <div className="relative">
                <Input
                  id="profile-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="h-9.5 text-sm pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Leave password blank if you do not want to change it.
              </p>
            </div>

            <DialogFooter className="pt-4 border-t mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSaving} className="font-bold">
                {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
