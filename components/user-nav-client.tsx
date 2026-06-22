'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { logout } from '@/app/(auth)/actions';

type User = {
  userId: string;
  name: string;
  email: string;
  role: string;
} | null;

export function UserNavClient({ user }: { user: User }) {
  const handleLogout = async () => {
    await logout();
  };

  if (!user) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors text-sm font-medium"
      >
        <i className="ri ri-user-line text-lg" />
        <span className="hidden md:inline">Login</span>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* Dhonu nav-user style: avatar + name + chevron */}
        <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors focus-visible:outline-none">
          <Avatar className="h-8 w-8 ring-2 ring-border">
            <AvatarFallback className="bg-primary text-white text-xs font-extrabold">
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col items-start leading-none">
            <span className="font-bold text-xs text-foreground">{user.name}</span>
            <span className="text-[10px] text-muted-foreground capitalize">{user.role}</span>
          </div>
          <i className="ri ri-arrow-down-s-line text-muted-foreground hidden md:inline" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="bottom" align="end" className="w-56 mt-2">
        {/* Dhonu dropdown header — "Welcome back!" */}
        <div className="px-3 py-2 border-b border-border/60">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Welcome back!</p>
          <p className="text-sm font-semibold text-foreground truncate mt-0.5">{user.name}</p>
          <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
        </div>

        {/* Profile */}
        <DropdownMenuItem className="gap-2 mt-1">
          <i className="ri ri-user-line text-base text-primary" />
          <span>Profile</span>
        </DropdownMenuItem>

        {/* Notifications */}
        <DropdownMenuItem className="gap-2">
          <i className="ri ri-notification-3-line text-base text-amber-500" />
          <span>Notifications</span>
        </DropdownMenuItem>

        {/* Settings */}
        <DropdownMenuItem className="gap-2">
          <i className="ri ri-settings-line text-base text-muted-foreground" />
          <span>Account Settings</span>
        </DropdownMenuItem>

        {/* Logout — Dhonu puts this with danger color */}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="gap-2 text-rose-600 dark:text-rose-400 font-semibold focus:text-rose-600"
        >
          <i className="ri ri-logout-box-line text-base" />
          <span>Log Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
