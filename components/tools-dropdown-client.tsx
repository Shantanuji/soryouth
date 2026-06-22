'use client';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TOOLS_NAV_ITEMS } from '@/lib/constants';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { RolePermission } from '@/types';
import { getUserPermissions } from '@/app/(app)/users/actions';

export function ToolsDropdownClient({ userRole }: { userRole?: string }) {
  const [permissions, setPermissions] = useState<RolePermission[]>([]);

  useEffect(() => {
    async function fetchPermissions() {
      if (userRole) {
        const userPermissions = await getUserPermissions(userRole);
        setPermissions(userPermissions);
      }
    }
    fetchPermissions();
  }, [userRole]);

  const allowedToolsPaths = permissions.map(p => p.navPath);
  const filteredToolsItems = TOOLS_NAV_ITEMS.filter(item => allowedToolsPaths.includes(item.href));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="topbar-icon-btn hidden sm:flex" title="Settings & Tools">
          <i className="ri ri-settings-2-line text-lg" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" className="w-56 mt-2">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold px-3 py-2">
          Tools & Sections
        </DropdownMenuLabel>
        {filteredToolsItems.map((item) => (
          <DropdownMenuItem key={item.label} asChild>
            <Link href={item.href} className="gap-2">
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span>{item.label}</span>
            </Link>
          </DropdownMenuItem>
        ))}
        {filteredToolsItems.length === 0 && (
          <div className="px-3 py-2 text-xs text-muted-foreground">No tools available</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
