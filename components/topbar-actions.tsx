'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';

// ============================================================
// DarkModeToggle — wires into localStorage + html class
// ============================================================
export function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = useCallback(() => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
      html.classList.remove('dark');
      localStorage.setItem('dhonu-theme', 'light');
      setIsDark(false);
    } else {
      html.classList.add('dark');
      localStorage.setItem('dhonu-theme', 'dark');
      setIsDark(true);
    }
  }, []);

  return (
    <button
      onClick={toggle}
      className="topbar-icon-btn"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle dark mode"
    >
      {isDark ? (
        <i className="ri ri-sun-line text-lg" />
      ) : (
        <i className="ri ri-moon-line text-lg" />
      )}
    </button>
  );
}

// ============================================================
// FullscreenToggle
// ============================================================
export function FullscreenToggle() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => console.log(err));
    } else {
      document.exitFullscreen?.();
    }
  };

  return (
    <button
      onClick={toggleFullscreen}
      className="topbar-icon-btn hidden sm:flex"
      title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
      aria-label="Toggle fullscreen"
    >
      {isFullscreen ? (
        <i className="ri ri-fullscreen-exit-line text-lg" />
      ) : (
        <i className="ri ri-fullscreen-line text-lg" />
      )}
    </button>
  );
}

// Removed TopbarActions wrapper, the layout will call DarkModeToggle and FullscreenToggle directly.

// ============================================================
// LootBoxDropdown
// ============================================================
export function LootBoxDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 gap-1 px-2.5 text-muted-foreground hover:bg-muted text-xs font-bold tracking-wide uppercase"
        >
          Loot Box
          <ChevronDown className="h-3 w-3 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">
          Loot Actions
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-xs font-semibold gap-2">
          <i className="ri ri-user-line text-primary" />
          Secret Identity
        </DropdownMenuItem>
        <DropdownMenuItem className="text-xs font-semibold gap-2">
          <i className="ri ri-settings-line text-secondary" />
          Control Panel
        </DropdownMenuItem>
        <DropdownMenuItem className="text-xs font-semibold gap-2">
          <i className="ri ri-customer-service-line text-primary" />
          Help Squad
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================
// MegaMenuDropdown
// ============================================================
export function MegaMenuDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 gap-1 px-2.5 text-muted-foreground hover:bg-muted text-xs font-bold tracking-wide uppercase"
        >
          Mega Menu
          <ChevronDown className="h-3 w-3 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[500px] p-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <h5 className="font-extrabold text-[10px] tracking-wider uppercase text-primary mb-2">
              Dashboard & Analytics
            </h5>
            <ul className="space-y-1.5 text-xs text-muted-foreground font-semibold">
              <li>
                <Link href="/dashboard" className="flex items-center gap-1 hover:text-foreground">
                  <i className="ri ri-arrow-right-s-line" />Sales Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="flex items-center gap-1 hover:text-foreground">
                  <i className="ri ri-arrow-right-s-line" />Marketing Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="flex items-center gap-1 hover:text-foreground">
                  <i className="ri ri-arrow-right-s-line" />Finance Overview
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-extrabold text-[10px] tracking-wider uppercase text-primary mb-2">
              Project Management
            </h5>
            <ul className="space-y-1.5 text-xs text-muted-foreground font-semibold">
              <li>
                <Link href="/deals" className="flex items-center gap-1 hover:text-foreground">
                  <i className="ri ri-subtract-line" />Kanban Workflow
                </Link>
              </li>
              <li>
                <Link href="/tasks" className="flex items-center gap-1 hover:text-foreground">
                  <i className="ri ri-subtract-line" />Task Management
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-extrabold text-[10px] tracking-wider uppercase text-primary mb-2">
              User Management
            </h5>
            <ul className="space-y-1.5 text-xs text-muted-foreground font-semibold">
              <li>
                <Link href="/users" className="flex items-center gap-1 hover:text-foreground">
                  <i className="ri ri-arrow-right-s-line" />Staff List
                </Link>
              </li>
              <li>
                <Link href="/users" className="flex items-center gap-1 hover:text-foreground">
                  <i className="ri ri-arrow-right-s-line" />Role Assignments
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
