
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
            getAllDeals(),
        ]);
        
        const userNames = users.map(u => u.name);

        const leadsByUser = userNames.map((user, index) => ({
            name: user,
            value: activeLeads.filter(lead => lead.assignedTo === user).length,
            fill: COLORS[index % COLORS.length],
        })).filter(item => item.value > 0);

        const dealsByUser = userNames.map((user, index) => ({
            name: user,
            value: allDeals.filter(deal => deal.createdBy === user).length,
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

        allDeals.forEach(deal => {
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
            dealsWon: activeClients.length, // This might need clarification if "Deals Won" means something else
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
  }

  const topStats = [
    { title: 'Active Leads', value: dashboardData.totalLeads.toString(), icon: UsersRound, dataAiHint: "total leads count" },
    { title: 'Total Clients', value: dashboardData.totalClients.toString(), icon: Briefcase, dataAiHint: "total clients count" },
    { title: 'Deals Won', value: dashboardData.dealsWon.toString(), icon: Award, dataAiHint: "deals won count" },
    { title: 'Leads Dropped', value: dashboardData.leadsDropped.toString(), icon: UserX, dataAiHint: "leads dropped count" },
  ];

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {topStats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3 mb-8">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Attendance
            </CardTitle>
            <CardDescription>Track your work hours</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-3">
             {isPunchedIn ? (
                <Alert variant="default" className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-center">
                    <AlertTitle className="text-green-800 dark:text-green-300">You are Punched In</AlertTitle>
                    <AlertDescription className="text-green-700 dark:text-green-400">
                        Punched in at: <span className="font-semibold">{punchInTime}</span>
                    </AlertDescription>
                </Alert>
             ) : (
                 <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-center">
                    <AlertCircle className="h-4 w-4 !left-1/2 -translate-x-1/2 !top-2"/>
                    <AlertTitle className="text-red-800 dark:text-red-300 pt-4">You are Punched Out</AlertTitle>
                </Alert>
             )}
            <Button onClick={handlePunchInOut} className="w-full" disabled={isProcessing}>
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                {isPunchedIn ? 'Punch Out' : 'Punch In'}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Deals Won Leaderboard
            </CardTitle>
            <CardDescription>Top performers by number of deals closed.</CardDescription>
          </CardHeader>
          <CardContent>
            {topSalesPerformers.length > 0 ? (
                <ul className="space-y-2 text-sm">
                    {topSalesPerformers.map((user, index) => (
                         <li key={user.name} className="flex justify-between"><span>{index + 1}. {user.name}</span> <span className="font-semibold">{user.value} Deals</span></li>
                    ))}
                </ul>
            ) : <p className="text-sm text-muted-foreground">No deal data available.</p>}
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
               Lead Assignment Leaderboard
            </CardTitle>
            <CardDescription>Top users by number of assigned active leads.</CardDescription>
          </CardHeader>
          <CardContent>
             {topLeadHandlers.length > 0 ? (
                <ul className="space-y-2 text-sm">
                    {topLeadHandlers.map((user, index) => (
                        <li key={user.name} className="flex justify-between"><span>{index + 1}. {user.name}</span> <span className="font-semibold">{user.value} Leads</span></li>
                    ))}
                </ul>
             ) : <p className="text-sm text-muted-foreground">No lead assignment data available.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              Deals by User
            </CardTitle>
            <CardDescription>Distribution of deals closed by each user.</CardDescription>
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
              <div className="flex items-center justify-center h-full text-muted-foreground">No deal data to display.</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Active Leads by User
            </CardTitle>
            <CardDescription>Distribution of active leads assigned to each user.</CardDescription>
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
               <div className="flex items-center justify-center h-full text-muted-foreground">No lead assignment data to display.</div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-primary" />
              Yearly Sales (Value) - Total: ₹{dashboardData.totalSalesValue.toLocaleString('en-IN')}
            </CardTitle>
            <CardDescription>Total sales value over the financial year (Apr-Mar).</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
             <ChartContainer config={chartConfig} className="w-full h-full">
                 <ResponsiveContainer>
                  <LineChart data={dashboardData.yearlySales} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickFormatter={(value) => `₹${Number(value) / 1000}k`} />
                    <Tooltip content={<ChartTooltipContent indicator="line" />} />
                    <Line type="monotone" dataKey="value" stroke="var(--color-value)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
             <LineChartIcon className="h-5 w-5 text-primary" />
              Yearly Sales (Count) - Total: {dashboardData.totalSalesCount}
            </CardTitle>
            <CardDescription>Total number of deals closed over the financial year (Apr-Mar).</CardDescription>
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
