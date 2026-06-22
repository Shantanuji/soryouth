
'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useSidebar } from '@/components/ui/sidebar';
import { logout } from '@/app/(auth)/actions';
import { useState } from 'react';
import { getCurrentUserAttendanceStatus, punchOut } from '@/app/(app)/attendance/actions';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';

type User = {
  userId: string;
  name: string;
  email: string;
  role: string;
} | null;

export function SidenavUserClient({ user }: { user: User }) {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const { toast } = useToast();
  
  const [showPunchOutDialog, setShowPunchOutDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLogoutClick = async () => {
    setIsProcessing(true);
    try {
      const status = await getCurrentUserAttendanceStatus();
      if (status.isPunchedIn) {
        setShowPunchOutDialog(true);
        setIsProcessing(false);
      } else {
        await logout();
      }
    } catch (e) {
      await logout(); // Default to direct logout on error
    }
  };

  const handleJustLogout = async () => {
    setIsProcessing(true);
    await logout();
  };

  const handlePunchOutAndLogout = () => {
    setIsProcessing(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
             await punchOut({ latitude, longitude });
          } catch(e) {
             console.error("Failed to punch out before logout", e);
          }
          await logout();
        },
        async (error) => {
          console.error('Error getting location:', error);
          toast({ title: 'Location Error', description: 'Could not get location to punch out.', variant: 'destructive' });
          await logout(); // Still log out
        }
      );
    } else {
      toast({ title: 'Location Error', description: 'Geolocation not supported.', variant: 'destructive' });
      logout();
    }
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`
            w-full flex items-center gap-2.5 px-4 py-3.5 
            hover:bg-sidebar-accent/50 transition-colors cursor-pointer
            focus-visible:outline-none text-left
            ${isCollapsed ? 'justify-center px-2' : ''}
          `}
        >
          {/* Avatar */}
          <Avatar className="h-8 w-8 ring-2 ring-primary/20 shrink-0">
            <AvatarFallback className="bg-primary text-white text-xs font-extrabold">
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Name + Role — hidden when collapsed */}
          {!isCollapsed && (
            <>
              <div className="flex flex-col leading-none flex-1 min-w-0">
                <span className="text-xs font-bold text-sidebar-foreground truncate">
                  {user.name}
                </span>
                <span className="text-[10px] text-muted-foreground capitalize font-semibold">
                  {user.role}
                </span>
              </div>
              <i className="ri ri-arrow-down-s-line text-muted-foreground shrink-0" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="right" align="start" className="w-56 ml-2">
        {/* Welcome header — Dhonu dropdown-header style */}
        <div className="px-3 py-2 border-b border-border/60">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Welcome back!</p>
          <p className="text-sm font-semibold text-foreground truncate mt-0.5">{user.name}</p>
          <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
        </div>

        <DropdownMenuItem className="gap-2 mt-1">
          <i className="ri ri-user-line text-base text-primary" />
          <span>Profile</span>
        </DropdownMenuItem>

        <DropdownMenuItem className="gap-2">
          <i className="ri ri-settings-line text-base text-muted-foreground" />
          <span>Account Settings</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={(e) => { e.preventDefault(); handleLogoutClick(); }}
          className="gap-2 text-rose-600 dark:text-rose-400 font-semibold focus:text-rose-600 cursor-pointer"
          disabled={isProcessing}
        >
          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <i className="ri ri-logout-box-line text-base" />}
          <span>{isProcessing ? "Logging out..." : "Log Out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>

      <AlertDialog open={showPunchOutDialog} onOpenChange={setShowPunchOutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>You are still punched in!</AlertDialogTitle>
            <AlertDialogDescription>
              Would you like to punch out before logging out of your session?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-between">
            <AlertDialogCancel onClick={handleJustLogout} disabled={isProcessing}>Just Log Out</AlertDialogCancel>
            <div className="flex gap-2 mt-2 sm:mt-0">
               <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
               <AlertDialogAction onClick={(e) => { e.preventDefault(); handlePunchOutAndLogout(); }} disabled={isProcessing}>
                 {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                 Punch Out & Log Out
               </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DropdownMenu>
  );
}
