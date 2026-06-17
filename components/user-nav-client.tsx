
'use client';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SunMedium, Moon, Settings, LogOut, UserCircle, ChevronDown } from 'lucide-react';
import { TOOLS_NAV_ITEMS } from '@/lib/constants';
import Link from 'next/link';
import { logout } from '@/app/(auth)/actions';
import { useEffect, useState } from 'react';
import type { RolePermission } from '@/types';
import { getUserPermissions } from '@/app/(app)/users/actions';

type User = {
  userId: string;
  name: string;
  email: string;
  role: string;
} | null;

export function UserNavClient({ user }: { user: User }) {
  const [permissions, setPermissions] = useState<RolePermission[]>([]);

  useEffect(() => {
    async function fetchPermissions() {
      if (user?.role) {
        const userPermissions = await getUserPermissions(user.role);
        setPermissions(userPermissions);
      }
    }
    fetchPermissions();
  }, [user]);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
  };

  const handleLogout = async () => {
    await logout();
  };

  const allowedToolsPaths = permissions.map(p => p.navPath);
  const filteredToolsItems = TOOLS_NAV_ITEMS.filter(item => allowedToolsPaths.includes(item.href));


  if (!user) {
    return (
        <Button variant="ghost" className="w-full justify-start gap-2 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0" asChild>
          <Link href="/login">
            <UserCircle className="h-8 w-8" />
            <span className="truncate group-data-[collapsible=icon]:hidden">Login</span>
          </Link>
        </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-2.5 py-1.5 h-auto hover:bg-muted/50 rounded-lg">
          <Avatar className="h-8 w-8">
            <AvatarImage src={`https://placehold.co/40x40.png?text=${user.name.charAt(0)}`} data-ai-hint="user avatar" alt={user.name} />
            <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="hidden md:inline font-bold text-xs text-foreground/85">{user.name}</span>
          <ChevronDown className="hidden md:inline h-3.5 w-3.5 opacity-60 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" className="w-56 mt-2 mr-2">
        <DropdownMenuLabel>
            <div className="font-semibold">{user.name}</div>
            <div className="text-xs text-muted-foreground font-normal">{user.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={toggleTheme}>
           <SunMedium className="mr-2 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
           <Moon className="absolute mr-2 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span>Toggle theme</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Tools & Sections</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {filteredToolsItems.map((item) => (
          <DropdownMenuItem key={item.label} asChild>
            <Link href={item.href}>
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
