
'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { LayoutDashboard, ListChecks, History, Phone, ClipboardCheck, MapPinned } from 'lucide-react';

const dashboardTabs = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Day Report', href: '/dashboard/day-report', icon: ListChecks },
  { name: 'Activity', href: '/dashboard/activity', icon: History },
  { name: 'Tasks', href: '/dashboard/tasks', icon: ClipboardCheck },
  { name: 'Survey Reports', href: '/survey-reports', icon: MapPinned },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const activeTab = dashboardTabs.find(tab => pathname === tab.href || (tab.href !== '/dashboard' && pathname.startsWith(tab.href)));
  const pageTitle = activeTab ? activeTab.name : 'Dashboard';
  const pageIcon = activeTab ? activeTab.icon : LayoutDashboard;



  return (
    <>
      <PageHeader
        title={pageTitle}
        description={`Welcome to Soryouth ${pageTitle}.`}
        icon={pageIcon}
      />
      {children}
    </>
  );
}
