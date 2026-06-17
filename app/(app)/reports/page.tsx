
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3, Phone, ListChecks, Users, ChevronRight, Ticket, ClipboardCheck, ShieldCheck, Handshake, Download } from 'lucide-react'; // Assuming a generic icon for reports

const reportItems = [
  { title: 'Export Prospects Report', description: 'Export Leads or Clients data to an Excel file.', href: '/reports/prospects-report', icon: Download, bgClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { title: 'Follow-up report', description: 'Follow-up calls report in selected period of time', href: '/reports/follow-up-report', icon: ListChecks, bgClass: "bg-primary/10 text-primary" },
  { title: 'Follow-up dispositions', description: 'Follow-up calls disposition in selected period of time', href: '/reports/follow-up-dispositions', icon: Users, bgClass: "bg-primary/10 text-primary" },
  { title: 'Task report', description: 'Task report in selected period of time', href: '/reports/task-report', icon: ClipboardCheck, bgClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" },
  { title: 'Deals report', description: 'Deals report in selected period of time', href: '/reports/deals-report', icon: Handshake, bgClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { title: 'All tickets', description: 'List of all tickets', href: '/tickets', icon: Ticket, bgClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
  { title: 'Open tickets', description: 'List of open tickets', href: '/tickets?status=Open', icon: Ticket, bgClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
  { title: 'Closed tickets', description: 'List of closed tickets', href: '/tickets?status=Closed', icon: Ticket, bgClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
  { title: 'Service day report', description: 'Service day report', href: '/reports/service-day-report', icon: ShieldCheck, bgClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
];

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Reports"
        description="Select a report to view detailed information and analytics."
        icon={BarChart3}
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reportItems.map((item) => (
          <Link href={item.href} key={item.title} className="block hover:no-underline group">
              <Card className="h-full flex flex-col border border-border/80 shadow-sm group-hover:shadow-md transition-all duration-200 group-hover:border-primary/40 rounded-xl overflow-hidden">
                <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-3">
                    <div className={`${item.bgClass} p-2.5 rounded-full flex-shrink-0`}>
                         <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-base font-bold mb-1 group-hover:text-primary transition-colors">{item.title}</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground leading-normal">{item.description}</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow" />
                <div className="p-4 pt-0 flex justify-end">
                    <div className="h-7 w-7 rounded-full bg-muted/40 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                </div>
              </Card>
          </Link>
        ))}
      </div>
    </>
  );
}

    
