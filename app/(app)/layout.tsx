
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
import { NAV_ITEMS } from '@/lib/constants';
import { Logo } from '@/components/logo';
import { Toaster } from '@/components/ui/toaster';
import { UserNav } from '@/components/user-nav';
import { ClientSidebarMenu } from './client-sidebar-menu';
import { TaskNotifications } from '@/components/task-notifications';
import { UniversalSearch } from '@/components/universal-search';
import { OverdueTaskToast } from '@/components/overdue-task-toast';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
            <div className="flex w-full items-center justify-between">
                <Logo />
                <div className="group-data-[collapsible=icon]:hidden">
                    <TaskNotifications />
                </div>
            </div>
        </SidebarHeader>
        <SidebarContent>
          <ClientSidebarMenu />
        </SidebarContent>
        <SidebarFooter>
           <UserNav />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
          <SidebarTrigger className="lg:hidden" />
          <div className="flex-1">
             <UniversalSearch />
          </div>
        </header>
        <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
          {children}
        </main>
        <Toaster />
        <OverdueTaskToast />
      </SidebarInset>
    </SidebarProvider>
  );
}
