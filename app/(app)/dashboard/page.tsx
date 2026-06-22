
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  UsersRound, 
  Briefcase, 
  Award, 
  UserX, 
  Clock, 
  BarChart3, 
  TrendingUp, 
  PieChart as PieChartIcon,
  Loader2,
  IndianRupee,
  LineChart as LineChartIcon,
  Phone,
  ClipboardCheck,
  Ticket,
} from 'lucide-react';
import { DhonuStatCard } from '@/components/dhonu/stat-card';
import { PageHeader } from '@/components/page-header';
import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, PieChart, Pie, Cell, Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import type { Lead, Client, DroppedLead, User, Deal } from '@/types';
import { getLeads } from '@/app/(app)/leads-list/actions';
import { getDroppedLeads } from '@/app/(app)/dropped-leads-list/actions';
import { getActiveClients, getInactiveClients } from '@/app/(app)/clients-list/actions';
import { getUsers } from '@/app/(app)/users/actions';
import { getAllDeals } from '@/app/(app)/deals/actions';
import { getDashboardAggregates } from '@/app/(app)/dashboard/data-actions';
import { useToast } from '@/hooks/use-toast';
import { punchIn, punchOut, getCurrentUserAttendanceStatus } from '@/app/(app)/attendance/actions';
import { format, parseISO, startOfMonth, getYear, getMonth } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const chartConfig: ChartConfig = {
  value: { label: "Value (₹)", color: "hsl(var(--chart-1))" },
  count: { label: "Count", color: "hsl(var(--chart-2))" },
};

export default function DashboardOverviewPage() {
  const [dashboardData, setDashboardData] = useState({
    totalLeads: 0,
    totalClients: 0,
    dealsWon: 0,
    leadsDropped: 0,
    dealsByUser: [] as { name: string; value: number; fill: string }[],
    leadsByUser: [] as { name: string; value: number; fill: string }[],
    yearlySales: [] as { month: string; value: number; count: number }[],
    totalSalesValue: 0,
    totalSalesCount: 0,
    callsMade: 0,
    pendingTasks: 0,
    openTickets: 0,
    pipelineValue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);



  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [activeLeads, droppedLeads, activeClients, inactiveClients, users, allDeals, aggregates] = await Promise.all([
            getLeads({ ignorePermissions: true }),
            getDroppedLeads({ ignorePermissions: true }),
            getActiveClients({ ignorePermissions: true }),
            getInactiveClients({ ignorePermissions: true }),
            getUsers(),
            getAllDeals({ ignorePermissions: true }),
            getDashboardAggregates(),
        ]);
        
        const userNames = users.map(u => u.name);

        const dealsWithValue = allDeals.filter(deal => deal.dealValue > 0);

        const leadsByUser = userNames.map((user, index) => ({
            name: user,
            value: activeLeads.filter(lead => lead.assignedTo === user).length,
            fill: COLORS[index % COLORS.length],
        })).filter(item => item.value > 0);

        const dealsByUser = userNames.map((user, index) => ({
            name: user,
            value: dealsWithValue.filter(deal => deal.createdBy === user).length,
            fill: COLORS[index % COLORS.length],
        })).filter(item => item.value > 0);
        
        // Process data for yearly charts (Financial Year: April - March)
        const monthlyData: Record<string, { value: number, count: number }> = {};
        const now = new Date();
        const currentMonth = getMonth(now); // 0-11
        const currentYear = getYear(now);
        
        // Financial year starts in April. If we are before April, the financial year started last calendar year.
        const financialYearStart = currentMonth < 3 ? currentYear - 1 : currentYear;

        for (let i = 0; i < 12; i++) {
            const monthIndex = (i + 3) % 12; // Start from April (month 3)
            const year = financialYearStart + (monthIndex < 3 ? 1 : 0);
            const monthName = format(new Date(year, monthIndex), 'MMM');
            monthlyData[monthName] = { value: 0, count: 0 };
        }
        
        let totalSalesValue = 0;
        let totalSalesCount = 0;

        dealsWithValue.forEach(deal => {
            const dealDate = parseISO(deal.poWoDate);
            const dealYear = getYear(dealDate);
            const dealMonth = getMonth(dealDate);

            const isCurrentFinancialYear = (dealYear === financialYearStart && dealMonth >= 3) || (dealYear === financialYearStart + 1 && dealMonth < 3);

            if (isCurrentFinancialYear) {
                const month = format(dealDate, 'MMM');
                monthlyData[month].value += deal.dealValue || 0;
                monthlyData[month].count += 1;
                totalSalesValue += deal.dealValue || 0;
                totalSalesCount += 1;
            }
        });
        
        const financialYearMonths = Array.from({length: 12}, (_, i) => {
            const monthIndex = (i + 3) % 12;
            const year = financialYearStart + (monthIndex < 3 ? 1 : 0);
            return format(new Date(year, monthIndex), 'MMM');
        });

        const yearlySales = financialYearMonths.map(month => ({
            month, ...monthlyData[month]
        }));


        setDashboardData({
            totalLeads: activeLeads.length,
            totalClients: activeClients.length + inactiveClients.length,
            dealsWon: dealsWithValue.length, // This might need clarification if "Deals Won" means something else
            leadsDropped: droppedLeads.length,
            leadsByUser,
            dealsByUser,
            yearlySales,
            totalSalesValue,
            totalSalesCount,
            callsMade: aggregates.callsMade || aggregates.totalFollowUps,
            pendingTasks: aggregates.pendingTasks,
            openTickets: aggregates.openTickets,
            pipelineValue: aggregates.pipelineValue,
        });
        
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);


  
  const dealsByUserChartConfig = useMemo(() => {
    const config: ChartConfig = {};
    dashboardData.dealsByUser.forEach(item => {
      config[item.name] = { label: item.name, color: item.fill };
    });
    return config;
  }, [dashboardData.dealsByUser]);

  const leadsByUserChartConfig = useMemo(() => {
    const config: ChartConfig = {};
    dashboardData.leadsByUser.forEach(item => {
      config[item.name] = { label: item.name, color: item.fill };
    });
    return config;
  }, [dashboardData.leadsByUser]);

  const topSalesPerformers = [...dashboardData.dealsByUser].sort((a,b) => b.value - a.value);
  const topLeadHandlers = [...dashboardData.leadsByUser].sort((a,b) => b.value - a.value);

  if (isLoading) {
    return (
        <div className="flex flex-1 items-center justify-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg text-muted-foreground">Loading Dashboard Data...</p>
        </div>
    );
  }

  return (
    <>
      <PageHeader title="Welcome" breadcrumbs={['Dashboard', 'Welcome']} />

      {/* Row 1: Dhonu Original Side-by-Side Layout */}
      <div className="grid gap-6 lg:grid-cols-12 mb-6">
        
        {/* Left Side: 2x2 Stat Cards */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4 lg:h-[360px]">
          <DhonuStatCard
            title="Active Leads"
            value={dashboardData.totalLeads}
            icon={UsersRound}
            variant="primary"
            trend="5.42%"
            trendUp={true}
          />
          <DhonuStatCard
            title="Total Clients"
            value={dashboardData.totalClients}
            icon={Briefcase}
            variant="success"
            trend="8.76%"
            trendUp={true}
          />
          <DhonuStatCard
            title="Deals Won"
            value={dashboardData.dealsWon}
            icon={Award}
            variant="warning"
            trend="12.5%"
            trendUp={true}
          />
          <DhonuStatCard
            title="Leads Dropped"
            value={dashboardData.leadsDropped}
            icon={UserX}
            variant="danger"
            trend="0.00%"
            trendUp={false}
          />
        </div>

        {/* Right Side: Main Chart */}
        <div className="lg:col-span-7 h-[300px] lg:h-[360px]">
          <Card className="border-0 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
            <div className="dhonu-card-header">
              <div>
                <p className="dhonu-card-title flex items-center gap-2">
                  <i className="ri ri-currency-line text-primary" /> Yearly Sales (Value)
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Total: <span className="font-semibold text-foreground">Rs. {dashboardData.totalSalesValue.toLocaleString('en-IN')}</span>
                  {' '} · Financial Year (Apr–Mar)
                </p>
              </div>
            </div>
            <CardContent className="flex-1 pt-3 min-h-0">
               <ChartContainer config={chartConfig} className="w-full h-full">
                    <ResponsiveContainer>
                    <LineChart data={dashboardData.yearlySales} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis tickFormatter={(value) => `Rs ${Number(value) / 1000}k`} />
                      <Tooltip content={<ChartTooltipContent indicator="line" />} />
                      <Line type="monotone" dataKey="value" stroke="var(--color-value)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 1.5: 4 More Stat Cards for deeper CRM metrics */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <DhonuStatCard
          title="Total Calls & Follow-ups"
          value={dashboardData.callsMade}
          icon={Phone}
          variant="info"
        />
        <DhonuStatCard
          title="Pending Tasks"
          value={dashboardData.pendingTasks}
          icon={ClipboardCheck}
          variant="warning"
        />
        <DhonuStatCard
          title="Open Tickets"
          value={dashboardData.openTickets}
          icon={Ticket}
          variant="danger"
        />
        <DhonuStatCard
          title="Pipeline Value"
          value={`₹${(dashboardData.pipelineValue / 1000).toFixed(1)}k`}
          icon={IndianRupee}
          variant="success"
        />
      </div>

      {/* Row 3: Secondary Charts */}
      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <Card className="border-0 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col h-[350px]">
          <div className="dhonu-card-header">
            <div>
              <p className="dhonu-card-title flex items-center gap-2">
                <i className="ri ri-pie-chart-2-line text-primary" /> Deals by User
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Distribution of deals closed by each user.</p>
            </div>
          </div>
          <CardContent className="flex-1 pt-3 min-h-0">
            {dashboardData.dealsByUser.length > 0 ? (
              <ChartContainer config={dealsByUserChartConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie data={dashboardData.dealsByUser} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {dashboardData.dealsByUser.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">No deal data to display.</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col h-[350px]">
          <div className="dhonu-card-header">
            <div>
              <p className="dhonu-card-title flex items-center gap-2">
                <i className="ri ri-group-line text-primary" /> Active Leads by User
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Active leads assigned to each user.</p>
            </div>
          </div>
          <CardContent className="flex-1 pt-3 min-h-0">
             {dashboardData.leadsByUser.length > 0 ? (
              <ChartContainer config={leadsByUserChartConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie data={dashboardData.leadsByUser} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {dashboardData.leadsByUser.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
               <div className="flex items-center justify-center h-full text-xs text-muted-foreground">No lead assignment data to display.</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col h-[350px]">
          <div className="dhonu-card-header">
            <div>
              <p className="dhonu-card-title flex items-center gap-2">
                <i className="ri ri-line-chart-line text-primary" /> Yearly Sales (Count)
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Total: <span className="font-semibold text-foreground">{dashboardData.totalSalesCount} Deals</span>
              </p>
            </div>
          </div>
          <CardContent className="flex-1 pt-3 min-h-0">
             <ChartContainer config={chartConfig} className="w-full h-full">
                  <ResponsiveContainer>
                  <LineChart data={dashboardData.yearlySales} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis allowDecimals={false} />
                    <Tooltip content={<ChartTooltipContent indicator="line" />} />
                    <Line type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
      
      {/* Row 4: Leaderboards */}
      <div className="grid gap-6 lg:grid-cols-12 mb-6">
        {/* Deals Won Leaderboard */}
        <div className="lg:col-span-6">
          <Card className="border-0 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 h-full">
            <div className="dhonu-card-header">
              <div>
                <p className="dhonu-card-title flex items-center gap-2">
                  <i className="ri ri-bar-chart-2-line text-primary" /> Deals Won Leaderboard
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Top performers by number of deals closed.</p>
              </div>
            </div>
            <CardContent className="pt-3">
              {topSalesPerformers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="dhonu-table">
                    <thead>
                      <tr>
                        <th style={{ width: '10%' }}>#</th>
                        <th>Name</th>
                        <th className="text-right">Deals Won</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topSalesPerformers.map((user, index) => (
                        <tr key={user.name}>
                          <td>{index + 1}</td>
                          <td className="font-medium">{user.name}</td>
                          <td className="text-right">
                            <span className="badge-soft-primary">{user.value} Deals</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-xs text-muted-foreground p-2">No deal data available.</p>}
            </CardContent>
          </Card>
        </div>

        {/* Lead Assignment Leaderboard */}
        <div className="lg:col-span-6">
          <Card className="border-0 shadow-sm h-full">
            <div className="dhonu-card-header">
              <div>
                <p className="dhonu-card-title flex items-center gap-2">
                  <i className="ri ri-trending-up-line text-primary" /> Lead Assignment
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Active leads assigned to each user.</p>
              </div>
            </div>
            <CardContent className="pt-3">
               {topLeadHandlers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="dhonu-table">
                    <thead>
                      <tr>
                        <th style={{ width: '10%' }}>#</th>
                        <th>Name</th>
                        <th className="text-right">Leads</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topLeadHandlers.map((user, index) => (
                        <tr key={user.name}>
                          <td>{index + 1}</td>
                          <td className="font-medium">{user.name}</td>
                          <td className="text-right">
                            <span className="badge-soft-success">{user.value}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
               ) : <p className="text-xs text-muted-foreground p-2">No data.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
