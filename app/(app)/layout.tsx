
import type { ReactNode } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
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
import { TopbarActions, LootBoxDropdown, MegaMenuDropdown } from '@/components/topbar-actions';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
        <SidebarHeader className="h-16 flex items-center justify-center px-4 border-b border-sidebar-border">
          <Logo />
        </SidebarHeader>
        <SidebarContent className="py-2">
          <ClientSidebarMenu />
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="flex flex-col h-screen overflow-hidden bg-background">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-border bg-card px-4 sm:px-6 py-4 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3 flex-grow max-w-2xl">
            <SidebarTrigger className="h-9 w-9 text-muted-foreground hover:bg-muted" />
            <UniversalSearch />
            <div className="hidden xl:flex items-center gap-1">
              <LootBoxDropdown />
              <MegaMenuDropdown />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <TopbarActions />
            <div className="h-9 flex items-center border-l border-border/80 pl-3 gap-3">
              <TaskNotifications />
              <UserNav />
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:px-6 sm:py-6 md:gap-8 bg-muted/5">
          {children}
        </main>
        <Toaster />
        <OverdueTaskToast />
      </SidebarInset>
    </SidebarProvider>
  );
}
