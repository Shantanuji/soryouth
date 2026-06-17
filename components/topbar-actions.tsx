'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Maximize, Settings, Globe, Shield, HelpCircle, ChevronDown } from 'lucide-react';
import Link from 'next/link';

export function TopbarActions() {
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => console.log(err));
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {/* Fullscreen Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleFullscreen}
        className="h-9 w-9 text-muted-foreground hover:bg-muted"
        title="Toggle Fullscreen"
      >
        <Maximize className="h-4.5 w-4.5" />
      </Button>

      {/* Language Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 gap-1 px-2 text-muted-foreground hover:bg-muted font-medium text-xs">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">EN</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="text-xs font-semibold">🇺🇸 English (US)</DropdownMenuItem>
          <DropdownMenuItem className="text-xs font-semibold">🇪🇸 Español</DropdownMenuItem>
          <DropdownMenuItem className="text-xs font-semibold">🇫🇷 Français</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Settings Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-muted-foreground hover:bg-muted"
        title="Settings"
      >
        <Settings className="h-4.5 w-4.5" />
      </Button>
    </div>
  );
}

export function LootBoxDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-1 px-2.5 text-muted-foreground hover:bg-muted text-xs font-bold tracking-wide uppercase">
          Loot Box
          <ChevronDown className="h-3 w-3 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 ml-2">
        <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Loot Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-xs font-semibold">
          <Shield className="mr-2 h-4 w-4 text-primary" />
          <span>Secret Identity</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="text-xs font-semibold">
          <Settings className="mr-2 h-4 w-4 text-secondary" />
          <span>Control Panel</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="text-xs font-semibold">
          <HelpCircle className="mr-2 h-4 w-4 text-emerald-500" />
          <span>Help Squad</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MegaMenuDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-1 px-2.5 text-muted-foreground hover:bg-muted text-xs font-bold tracking-wide uppercase">
          Mega Menu
          <ChevronDown className="h-3 w-3 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[500px] p-4 ml-2">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <h5 className="font-extrabold text-[10px] tracking-wider uppercase text-primary mb-2">Dashboard & Analytics</h5>
            <ul className="space-y-1.5 text-xs text-muted-foreground font-semibold">
              <li><Link href="/dashboard" className="hover:text-foreground">Sales Dashboard</Link></li>
              <li><Link href="/dashboard" className="hover:text-foreground">Marketing Dashboard</Link></li>
              <li><Link href="/dashboard" className="hover:text-foreground">Finance Overview</Link></li>
              <li><Link href="/dashboard" className="hover:text-foreground">User Analytics</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-extrabold text-[10px] tracking-wider uppercase text-primary mb-2">Project Management</h5>
            <ul className="space-y-1.5 text-xs text-muted-foreground font-semibold">
              <li><Link href="/deals" className="hover:text-foreground">Kanban Workflow</Link></li>
              <li><Link href="/tasks" className="hover:text-foreground">Project Timeline</Link></li>
              <li><Link href="/tasks" className="hover:text-foreground">Task Management</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-extrabold text-[10px] tracking-wider uppercase text-primary mb-2">User Management</h5>
            <ul className="space-y-1.5 text-xs text-muted-foreground font-semibold">
              <li><Link href="/users" className="hover:text-foreground">Staff List</Link></li>
              <li><Link href="/users" className="hover:text-foreground">Role Assignments</Link></li>
              <li><Link href="/users" className="hover:text-foreground">Permissions Map</Link></li>
            </ul>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
