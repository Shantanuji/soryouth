
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { NAV_ITEMS } from '@/lib/constants';
import { useEffect, useState } from 'react';
import type { RolePermission } from '@/types';
import { getUserPermissions } from './users/actions';
import { useSession } from '@/hooks/use-sessions';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LayoutDashboard, ListChecks, History, ClipboardCheck, MapPinned, UsersRound, Briefcase, Handshake, FileText, UserX, Archive, BarChart3, Users, ClipboardPaste } from 'lucide-react';

const dashboardTabs = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Day Report', href: '/dashboard/day-report', icon: ListChecks },
  { name: 'Activity', href: '/dashboard/activity', icon: History },
  { name: 'Tasks', href: '/dashboard/tasks', icon: ClipboardCheck },
  { name: 'Survey Reports', href: '/survey-reports', icon: MapPinned },
];

// Group definitions for Dhonu-style sidebar sections
const SIDEBAR_GROUPS = [
  {
    label: 'MAIN',
    hrefs: ['/dashboard'],
  },
  {
    label: 'CRM',
    hrefs: ['/leads-list', '/clients-list', '/deals', '/proposals', '/dropped-leads-list', '/inactive-clients', '/tasks', '/reports'],
  },
  {
    label: 'MANAGEMENT',
    hrefs: ['/users', '/manage-templates'],
  },
];

export function ClientSidebarMenu() {
  const pathname = usePathname();
  const session = useSession();
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPermissions() {
      if (session?.role) {
        setIsLoading(true);
        const userPermissions = await getUserPermissions(session.role);
        setPermissions(userPermissions);
        setIsLoading(false);
      } else if (session === null) {
        setIsLoading(false);
      }
    }
    fetchPermissions();
  }, [session]);

  const allowedNavPaths = permissions.map(p => p.navPath);

  const filteredNavItems = NAV_ITEMS.filter(item =>
    item.href === '/dashboard' ||
    allowedNavPaths.includes(item.href)
  );

  return (
    <>
      {SIDEBAR_GROUPS.map((group) => {
        const groupItems = filteredNavItems.filter(item => group.hrefs.includes(item.href));
        if (groupItems.length === 0) return null;

        return (
          <SidebarGroup key={group.label} className="px-2 py-1">
            <SidebarGroupLabel className="text-[9px] font-extrabold tracking-[0.15em] uppercase text-muted-foreground/60 px-2 mb-1 select-none">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {groupItems.map((item) => {
                  const isDashboard = item.href === '/dashboard';
                  const isActive = isDashboard
                    ? pathname.startsWith('/dashboard') || pathname === '/survey-reports'
                    : pathname.startsWith(item.href) && item.href !== '/dashboard';

                  if (isDashboard) {
                    return (
                      <DropdownMenu key={item.label}>
                        <DropdownMenuTrigger asChild>
                          <SidebarMenuButton
                            isActive={isActive}
                            tooltip={item.label}
                            className="w-full h-9 rounded-none text-sm font-medium"
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="start" className="ml-2 w-56">
                          {dashboardTabs.map(tab => (
                            <DropdownMenuItem key={tab.name} asChild>
                              <Link href={tab.href}>
                                <tab.icon className="mr-2 h-4 w-4" />
                                <span>{tab.name}</span>
                              </Link>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );
                  }

                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                        className="h-9 rounded-none text-sm font-medium"
                      >
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        );
      })}
    </>
  );
}
