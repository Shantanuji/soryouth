'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useSidebar } from '@/components/ui/sidebar';
import { logout } from '@/app/(auth)/actions';
import { useState, useEffect } from 'react';
import { getCurrentUserAttendanceStatus, punchIn, punchOut } from '@/app/(app)/attendance/actions';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import { ProfileSettingsDialog } from './profile-settings-dialog';

type User = {
  userId: string;
  name: string;
  email: string;
  role: string;
  profileImage?: string | null;
} | null;

export function SidenavUserClient({ user }: { user: User }) {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [attendance, setAttendance] = useState<{
    isPunchedIn: boolean;
    hasCompletedToday?: boolean;
    punchInTime?: string;
  } | null>(null);

  const fetchStatus = async () => {
    try {
      const status = await getCurrentUserAttendanceStatus();
      setAttendance(status);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStatus();
    }

    const handleUpdate = () => {
      fetchStatus();
    };

    window.addEventListener('attendance-update', handleUpdate);
    return () => {
      window.removeEventListener('attendance-update', handleUpdate);
    };
  }, [user]);

  const handlePunchAction = async () => {
    setIsProcessing(true);
    if (!navigator.geolocation) {
      toast({
        title: 'Error',
        description: 'Geolocation is not supported by your browser.',
        variant: 'destructive',
      });
      setIsProcessing(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const location = { latitude, longitude };
          const action = attendance?.isPunchedIn ? punchOut : punchIn;
          const result = await action(location);

          if (result && result.success) {
            toast({
              title: 'Success',
              description: `Shift successfully punched ${attendance?.isPunchedIn ? 'out' : 'in'}.`,
            });
            window.dispatchEvent(new Event('attendance-update'));
          } else {
            toast({
              title: 'Error',
              description: result?.error || 'Failed to register shift entry.',
              variant: 'destructive',
            });
          }
        } catch (e) {
          console.error(e);
          toast({
            title: 'Error',
            description: 'A server error occurred during punch in/out.',
            variant: 'destructive',
          });
        } finally {
          setIsProcessing(false);
        }
      },
      (error) => {
        toast({
          title: 'Location Required',
          description: `Location access is required: ${error.message}. Please enable location permissions.`,
          variant: 'destructive',
        });
        setIsProcessing(false);
      }
    );
  };

  const handleLogout = async () => {
    setIsProcessing(true);
    const { recordPresenceEvent } = await import('@/app/(app)/attendance/hrms-actions');
    
    const triggerLogout = async (loc?: { latitude: number; longitude: number }) => {
      try {
        await recordPresenceEvent('Logout', loc);
      } catch (e) {
        console.error('Failed to log Logout presence event:', e);
      }
      sessionStorage.removeItem('presence-initialized');
      await logout();
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const loc = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          await triggerLogout(loc);
        },
        async () => {
          await triggerLogout();
        },
        { enableHighAccuracy: true, timeout: 3000 }
      );
    } else {
      await triggerLogout();
    }
  };

  if (!user) return null;

  const isPunchedIn = !!attendance?.isPunchedIn;
  const isCompleted = !!attendance?.hasCompletedToday;

  return (
    <>
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
              {user.profileImage ? (
                <AvatarImage src={user.profileImage} alt={user.name} className="object-cover" />
              ) : null}
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

          {/* Profile */}
          <DropdownMenuItem className="gap-2 mt-1 cursor-pointer" onClick={() => setIsProfileOpen(true)}>
            <i className="ri ri-user-line text-base text-primary" />
            <span>Profile</span>
          </DropdownMenuItem>

          {/* Settings */}
          <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setIsProfileOpen(true)}>
            <i className="ri ri-settings-line text-base text-muted-foreground" />
            <span>Account Settings</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Shift Attendance Action */}
          {!isCompleted ? (
            <DropdownMenuItem
              onClick={handlePunchAction}
              disabled={isProcessing}
              className={`gap-2 font-semibold cursor-pointer ${
                isPunchedIn 
                  ? 'text-rose-600 dark:text-rose-400 focus:text-rose-600' 
                  : 'text-emerald-600 dark:text-emerald-400 focus:text-emerald-600'
              }`}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isPunchedIn ? (
                <i className="ri ri-stop-line text-base" />
              ) : (
                <i className="ri ri-play-line text-base" />
              )}
              <span>{isPunchedIn ? 'Punch Out' : 'Punch In'}</span>
            </DropdownMenuItem>
          ) : (
            <div className="px-3 py-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 select-none">
              <i className="ri ri-checkbox-circle-line text-base" />
              <span>Shift Completed</span>
            </div>
          )}

          <DropdownMenuSeparator />

          {/* Log Out */}
          <DropdownMenuItem
            onClick={handleLogout}
            disabled={isProcessing}
            className="gap-2 text-rose-600 dark:text-rose-400 font-semibold focus:text-rose-600 cursor-pointer"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <i className="ri ri-logout-box-line text-base" />
            )}
            <span>Log Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileSettingsDialog isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  );
}
