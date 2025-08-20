
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3, Phone, ListChecks, Users, ChevronRight, Ticket, ClipboardCheck, ShieldCheck, Handshake, Download } from 'lucide-react'; // Assuming a generic icon for reports

const reportItems = [
  { title: 'Export Prospects Report', description: 'Export Leads or Clients data to an Excel file.', href: '/reports/prospects-report', icon: Download },
  { title: 'Follow-up report', description: 'Follow-up calls report in selected period of time', href: '/reports/follow-up-report', icon: ListChecks },
  { title: 'Follow-up dispositions', description: 'Follow-up calls disposition in selected period of time', href: '/reports/follow-up-dispositions', icon: Users },
  { title: 'Task report', description: 'Task report in selected period of time', href: '/reports/task-report', icon: ClipboardCheck },
  { title: 'Deals report', description: 'Deals report in selected period of time', href: '/reports/deals-report', icon: Handshake },
  { title: 'All tickets', description: 'List of all tickets', href: '/tickets', icon: Ticket }, // Links to existing tickets page
  { title: 'Open tickets', description: 'List of open tickets', href: '/tickets?status=Open', icon: Ticket }, // Links to tickets page with filter
  { title: 'Closed tickets', description: 'List of closed tickets', href: '/tickets?status=Closed', icon: Ticket }, // Links to tickets page with filter
  { title: 'Service day report', description: 'Service day report', href: '/reports/service-day-report', icon: ShieldCheck },
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
              <Card className="h-full flex flex-col group-hover:shadow-lg transition-shadow group-hover:border-primary/50">
                <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                         <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-semibold mb-1">{item.title}</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">{item.description}</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow" />
                <div className="p-4 pt-0 text-right">
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Card>
          </Link>
        ))}
      </div>
       <div className="mt-8">
        <img src="https://placehold.co/1200x300.png" data-ai-hint="reports dashboard overview" alt="Reports Overview" className="w-full rounded-lg object-cover"/>
      </div>
    </>
  );
}

    
