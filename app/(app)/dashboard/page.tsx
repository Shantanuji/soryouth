
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Users, 
  CalendarRange, 
  Sigma,
  Loader2,
  AlertCircle,
  IndianRupee,
  LineChart as LineChartIcon,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, PieChart, Pie, Cell, Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import type { Lead, Client, DroppedLead, User, Deal } from '@/types';
import { getLeads } from '@/app/(app)/leads-list/actions';
import { getDroppedLeads } from '@/app/(app)/dropped-leads-list/actions';
import { getActiveClients, getInactiveClients } from '@/app/(app)/clients-list/actions';
import { getUsers } from '@/app/(app)/users/actions';
import { getAllDeals } from '@/app/(app)/deals/actions';
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
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  // Attendance State
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [punchInTime, setPunchInTime] = useState<string | null>(null);

  const refreshAttendanceStatus = async () => {
    const status = await getCurrentUserAttendanceStatus();
    setIsPunchedIn(status.isPunchedIn);
    setPunchInTime(status.punchInTime || null);
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [activeLeads, droppedLeads, activeClients, inactiveClients, users, allDeals] = await Promise.all([
            getLeads({ ignorePermissions: true }),
            getDroppedLeads({ ignorePermissions: true }),
            getActiveClients({ ignorePermissions: true }),
            getInactiveClients({ ignorePermissions: true }),
            getUsers(),
            getAllDeals({ ignorePermissions: true }),
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
        });

        await refreshAttendanceStatus();
        
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handlePunchInOut = () => {
    setIsProcessing(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const location = { latitude, longitude };
          
          const action = isPunchedIn ? punchOut : punchIn;
          const result = await action(location);

          if (result && result.success) {
            toast({ title: 'Success', description: `You have successfully punched ${isPunchedIn ? 'out' : 'in'}.` });
            await refreshAttendanceStatus();
          } else {
            toast({ title: 'Error', description: result?.error || 'An unknown error occurred.', variant: 'destructive' });
          }
        } catch (e) {
            console.error("Punch in/out failed:", e);
            toast({ title: 'Error', description: 'An unexpected server error occurred.', variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
      },
      (error) => {
        toast({
          title: 'Location Error',
          description: `Could not get your location: ${error.message}. Please enable location services.`,
          variant: 'destructive',
        });
        setIsProcessing(false);
      }
    );
  };
  
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
  }  const topStats = [
    { title: 'Active Leads', value: dashboardData.totalLeads.toString(), icon: UsersRound, bgClass: "bg-primary/10 text-primary", iconColor: "text-primary" },
    { title: 'Total Clients', value: dashboardData.totalClients.toString(), icon: Briefcase, bgClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", iconColor: "text-emerald-600 dark:text-emerald-400" },
    { title: 'Deals Won', value: dashboardData.dealsWon.toString(), icon: Award, bgClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400", iconColor: "text-amber-600 dark:text-amber-400" },
    { title: 'Leads Dropped', value: dashboardData.leadsDropped.toString(), icon: UserX, bgClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400", iconColor: "text-rose-600 dark:text-rose-400" },
  ];

  return (
    <>
      <div className="mb-6 flex flex-col gap-1 w-full">
        <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-1">
          <div>
            <h1 className="text-base font-extrabold text-foreground tracking-tight">Welcome</h1>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-muted-foreground/80 uppercase tracking-wider">
            <span>Soryouth</span>
            <span>&gt;</span>
            <span>Dashboard</span>
            <span>&gt;</span>
            <span className="text-foreground/85">Welcome</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Welcome to Soryouth Overview.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {topStats.map((stat) => {
          let borderClass = "border-l-primary";
          let percentageChange = "▲ 5.42%";
          if (stat.title.includes('Clients')) {
            borderClass = "border-l-emerald-500";
            percentageChange = "▲ 8.76%";
          } else if (stat.title.includes('Won')) {
            borderClass = "border-l-amber-500";
            percentageChange = "▲ 12.5%";
          } else if (stat.title.includes('Dropped')) {
            borderClass = "border-l-rose-500";
            percentageChange = "▼ 0.00%";
          }

          return (
            <Card key={stat.title} className={`overflow-hidden border-0 border-l-[3.5px] ${borderClass} bg-card shadow-sm rounded-xl p-4 hover:shadow-md transition-all duration-200`}>
              <div className="flex flex-col justify-between h-full">
                <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">{stat.title}</span>
                <div className="flex items-center gap-3.5 mt-2.5">
                  <div className={`h-11 w-11 rounded-full flex items-center justify-center ${stat.bgClass} flex-shrink-0`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-2xl font-extrabold tracking-tight text-foreground">{stat.value}</h3>
                </div>
                <div className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1.5 font-medium">
                  <span className={`${stat.title.includes('Dropped') ? 'text-rose-500' : 'text-emerald-500'} font-extrabold`}>
                    {percentageChange}
                  </span>
                  <span>Since last month</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3 mb-8">
        <Card className="lg:col-span-1 border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Clock className="h-5 w-5 text-primary" />
              Attendance
            </CardTitle>
            <CardDescription className="text-xs">Track your work hours</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4 pt-2">
             {isPunchedIn ? (
                <div className="w-full rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
                    <h5 className="font-bold text-sm text-emerald-600 dark:text-emerald-400">You are Punched In</h5>
                    <p className="text-xs text-emerald-500/90 mt-1">
                        Punched in at: <span className="font-semibold">{punchInTime}</span>
                    </p>
                </div>
             ) : (
                <div className="w-full rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-center">
                    <h5 className="font-bold text-sm text-rose-600 dark:text-rose-400">You are Punched Out</h5>
                    <p className="text-xs text-rose-500/90 mt-1">Punch in to start tracking work hours</p>
                </div>
             )}
            <Button onClick={handlePunchInOut} className="w-full font-semibold" disabled={isProcessing}>
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                {isPunchedIn ? 'Punch Out' : 'Punch In'}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <BarChart3 className="h-5 w-5 text-primary" />
              Deals Won Leaderboard
            </CardTitle>
            <CardDescription className="text-xs">Top performers by number of deals closed.</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {topSalesPerformers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="py-2 pb-1" style={{ width: '10%' }}>#</th>
                      <th className="py-2 pb-1">Name</th>
                      <th className="py-2 pb-1 text-right">Deals Won</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 text-xs">
                    {topSalesPerformers.map((user, index) => (
                      <tr key={user.name} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2">{index + 1}</td>
                        <td className="py-2 font-medium">{user.name}</td>
                        <td className="py-2 text-right font-semibold text-primary">{user.value} Deals</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-xs text-muted-foreground">No deal data available.</p>}
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-1 border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <TrendingUp className="h-5 w-5 text-primary" />
               Lead Assignment Leaderboard
            </CardTitle>
            <CardDescription className="text-xs">Top users by number of assigned active leads.</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
             {topLeadHandlers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="py-2 pb-1" style={{ width: '10%' }}>#</th>
                      <th className="py-2 pb-1">Name</th>
                      <th className="py-2 pb-1 text-right">Leads</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 text-xs">
                    {topLeadHandlers.map((user, index) => (
                      <tr key={user.name} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2">{index + 1}</td>
                        <td className="py-2 font-medium">{user.name}</td>
                        <td className="py-2 text-right font-semibold text-primary">{user.value} Leads</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
             ) : <p className="text-xs text-muted-foreground">No lead assignment data available.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 mb-8">
        <Card className="border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <PieChartIcon className="h-5 w-5 text-primary" />
              Deals by User
            </CardTitle>
            <CardDescription className="text-xs">Distribution of deals closed by each user.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
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
        <Card className="border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Users className="h-5 w-5 text-primary" />
              Active Leads by User
            </CardTitle>
            <CardDescription className="text-xs">Distribution of active leads assigned to each user.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
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
      </div>
      
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <IndianRupee className="h-5 w-5 text-primary" />
              Yearly Sales (Value) - Total: Rs. {dashboardData.totalSalesValue.toLocaleString('en-IN')}
            </CardTitle>
            <CardDescription className="text-xs">Total sales value over the financial year (Apr-Mar).</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
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
        <Card className="border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
             <LineChartIcon className="h-5 w-5 text-primary" />
              Yearly Sales (Count) - Total: {dashboardData.totalSalesCount}
            </CardTitle>
            <CardDescription className="text-xs">Total number of deals closed over the financial year (Apr-Mar).</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
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
    </>
  );
}
