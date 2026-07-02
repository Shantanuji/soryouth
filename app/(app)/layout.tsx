import type { ReactNode } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { Toaster } from '@/components/ui/toaster';
import { UserNav } from '@/components/user-nav';
import { ClientSidebarMenu } from './client-sidebar-menu';
import { TaskNotifications } from '@/components/task-notifications';
import { UniversalSearch } from '@/components/universal-search';
import { OverdueTaskToast } from '@/components/overdue-task-toast';
import { DarkModeToggle, FullscreenToggle } from '@/components/topbar-actions';
import { TopbarSettings } from '@/components/topbar-settings';
import { AttendanceTopbar } from '@/components/attendance-topbar';
import { PresenceTracker } from '@/components/presence-tracker';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      {/* Dhonu-style sidebar: white bg, border-right, no rounded corners */}
      <Sidebar
        collapsible="icon"
        className="border-r border-sidebar-border bg-sidebar shadow-none"
        style={{ borderRadius: 0 }}
      >
        {/* Sidebar header — logo area with bottom border */}
        <SidebarHeader className="h-16 flex items-center justify-center px-4 border-b border-sidebar-border bg-sidebar">
          <Logo className="w-full justify-center" />
        </SidebarHeader>

        {/* Scrollable nav menu */}
        <SidebarContent className="overflow-y-auto py-3 scrollbar-none">
          <ClientSidebarMenu />
        </SidebarContent>

        {/* Footer — copyright line */}
        <SidebarFooter className="border-t border-sidebar-border p-3">
          <div className="text-[10px] text-muted-foreground/50 text-center select-none">
            © {new Date().getFullYear()} Soryouth CRM
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex flex-col min-h-screen overflow-hidden bg-background">
        {/* Topbar — white background with bottom border, Dhonu app-topbar style */}
        <header
          className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-card px-4 sm:px-6 flex-shrink-0"
          style={{ boxShadow: '0 1px 4px 0 rgba(0,0,0,0.06)' }}
        >
          {/* Left: hamburger trigger + search + loot/mega menu */}
          <div className="flex items-center gap-2 flex-grow min-w-0">
            <SidebarTrigger className="h-9 w-9 text-muted-foreground hover:bg-muted rounded-lg shrink-0" />
            <UniversalSearch />
          </div>

          {/* Right: settings + dark toggle + fullscreen + notifications + user avatar */}
          <div className="flex items-center gap-1 shrink-0">
            <AttendanceTopbar />
            <div className="flex items-center gap-0.5">
              <TopbarSettings />
              <DarkModeToggle />
              <FullscreenToggle />
            </div>
            <div className="h-8 flex items-center border-l border-border/60 pl-2 ml-1 gap-1.5">
              <TaskNotifications />
              <UserNav />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6 bg-background">
          {children}
        </main>

        <Toaster />
        <OverdueTaskToast />
        <PresenceTracker />
      </SidebarInset>
    </SidebarProvider>
  );
}
