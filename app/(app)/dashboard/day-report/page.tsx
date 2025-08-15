
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, subDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { CalendarIcon, Users, UserX, FileText, Award, Phone, BellRing, LineChart as LineChartIcon, Filter, Loader2 } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Lead, Proposal, Client, DroppedLead, User, FollowUp } from '@/types';
import { getLeads , getAllFollowUps} from '@/app/(app)/leads-list/actions';
import { getDroppedLeads } from '@/app/(app)/dropped-leads-list/actions';
import { getAllProposals } from '@/app/(app)/proposals/actions';
import { getActiveClients } from '@/app/(app)/clients-list/actions';
import { getUsers } from '@/app/(app)/users/actions';


const initialDateRange: DateRange = {
  from: subDays(new Date(), 7),
  to: new Date(),
};

interface UserReportRow {
  userId: string;
  userName: string;
  avatarUrl?: string;
  leadsCreated: number;
  leadsDropped: number;
  dealsCreated: number;
  dealsWon: number;
  dealsLost: number;
  followUps: number;
}

interface DayReportStats {
  leadsCreated: number;
  leadsDropped: number;
  proposalsCreated: number;
  dealsWon: number;
  dealsLost: number;
  tasks: number;
  followUps: number;
  calls: number;
  chartData: { date: string; created: number; dropped: number }[];
  droppedLeadsDetails: DroppedLead[];
  wonDealsDetails: Client[];
  userWiseSummary: UserReportRow[];
}

export default function DayReportPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialDateRange);
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
  const [reportStats, setReportStats] = useState<DayReportStats | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [allDroppedLeads, setAllDroppedLeads] = useState<DroppedLead[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allProposals, setAllProposals] = useState<Proposal[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allFollowUps, setAllFollowUps] = useState<FollowUp[]>([]);

  const handleApplyFilters = useCallback(() => {
    const fromDate = dateRange?.from ? startOfDay(dateRange.from) : undefined;
    const toDate = dateRange?.to ? endOfDay(dateRange.to) : undefined;
    const dateInterval = fromDate && toDate ? { start: fromDate, end: toDate } : null;

    const userMatches = (item: { assignedTo?: string | null; createdBy?: string | null }) => {
        if (selectedUserFilter === 'all') return true;
        // Check if assignedTo or createdBy matches. Adjust based on what 'user' filter should mean.
        // For now, let's assume it checks against who the item is assigned to.
        return item.assignedTo === selectedUserFilter;
    };
    const dateMatches = (dateStr: string) => dateInterval ? isWithinInterval(parseISO(dateStr), dateInterval) : true;
    // Filter followups
    const pageFilteredFollowUps = allFollowUps.filter(followUp => {
        const userFollowUpMatches = selectedUserFilter === 'all' || followUp.createdBy === allUsers.find(u => u.name === selectedUserFilter)?.name;
        return dateMatches(followUp.createdAt) && userFollowUpMatches;
    });

    const callsMade = pageFilteredFollowUps.filter(f => f.type === 'Call').length;
    const tasksMade = pageFilteredFollowUps.filter(f => f.followupOrTask === 'Followup').length

    const pageFilteredLeads = allLeads.filter(lead => userMatches(lead) && dateMatches(lead.createdAt));
    const pageFilteredDroppedLeads = allDroppedLeads.filter(lead => userMatches(lead) && dateMatches(lead.droppedAt));
    const pageFilteredWonDeals = allClients.filter(client => userMatches(client) && dateMatches(client.updatedAt));
    const pageFilteredProposals = allProposals.filter(proposal => {
        const customer = allLeads.find(l => l.id === proposal.leadId) || allClients.find(c => c.id === proposal.clientId);
        return userMatches(customer || {}) && dateMatches(proposal.createdAt);
    });

    const leadsCreated = pageFilteredLeads.length;
    const leadsDropped = pageFilteredDroppedLeads.length;
    const dealsWon = pageFilteredWonDeals.length;
    
    const followUps = allLeads.filter(lead => {
        if (!lead.nextFollowUpDate || !dateInterval) return false;
        return userMatches(lead) && isWithinInterval(parseISO(lead.nextFollowUpDate), dateInterval);
    }).length;

    const dailyChartData: { [date: string]: { created: number; dropped: number } } = {};
    if(dateInterval) {
        for (let d = new Date(dateInterval.start); d <= dateInterval.end; d.setDate(d.getDate() + 1)) {
            const dateStr = format(d, 'MMM dd');
            dailyChartData[dateStr] = { created: 0, dropped: 0 };
        }
    }

    allLeads.forEach(lead => {
        if (!dateMatches(lead.createdAt)) return;
        const createdDateStr = format(parseISO(lead.createdAt), 'MMM dd');
        if (dailyChartData[createdDateStr]) {
            dailyChartData[createdDateStr].created++;
        }
    });

    allDroppedLeads.forEach(lead => {
        if (!dateMatches(lead.droppedAt)) return;
        const droppedDateStr = format(parseISO(lead.droppedAt), 'MMM dd');
        if (dailyChartData[droppedDateStr]) {
            dailyChartData[droppedDateStr].dropped++;
        }
    });
    
    const chartDataFinal = Object.entries(dailyChartData).map(([date, counts]) => ({ date, ...counts })).sort((a, b) => new Date(a.date + ' ' + new Date().getFullYear()).getTime() - new Date(b.date + ' ' + new Date().getFullYear()).getTime());

    const userWiseSummaryData: UserReportRow[] = allUsers.map(user => {
      const userAssignedLeads = allLeads.filter(lead => lead.assignedTo === user.name);
      const userCreatedLeads = allLeads.filter(lead => lead.createdBy === user.name) ;

      const userDroppedLeads = allDroppedLeads.filter(lead => lead.createdBy === user.name);
      const userAssignedClients = allClients.filter(client => client.assignedTo === user.name);
      const userFollowUps = allFollowUps.filter(fu => fu.createdBy === user.name);
      const userProposals = allProposals.filter(p => p.createdBy === user.name);
      
      const userLeadsCreatedInRange = userCreatedLeads.filter(lead => dateMatches(lead.createdAt)).length;
      const userLeadsDroppedInRange = userDroppedLeads.filter(lead => dateMatches(lead.droppedAt)).length;
      const userDealsWonInRange = userAssignedClients.filter(client => dateMatches(client.updatedAt)).length;
      
      const userProposalsCreatedInRange = userProposals.filter(proposal => (
          dateMatches(proposal.createdAt)
      )).length;

      const userFollowUpsInRange = userFollowUps.filter(followup => 
        followup.createdAt && dateMatches(followup.createdAt)
      ).length;


      return {
          userId: user.id,
          userName: user.name,
          avatarUrl: `https://placehold.co/32x32.png?text=${user.name.charAt(0)}`,
          leadsCreated: userLeadsCreatedInRange,
          leadsDropped: userLeadsDroppedInRange,
          dealsCreated: userProposalsCreatedInRange,
          dealsWon: userDealsWonInRange,
          dealsLost: userLeadsDroppedInRange,
          followUps: userFollowUpsInRange,
      };
    });
    
    setReportStats({
      leadsCreated,
      leadsDropped,
      proposalsCreated: pageFilteredProposals.length,
      dealsWon,
      dealsLost: leadsDropped,
      followUps,
      tasks: tasksMade,
      calls: callsMade, 
      chartData: chartDataFinal,
      droppedLeadsDetails: pageFilteredDroppedLeads.slice(0, 5),
      wonDealsDetails: pageFilteredWonDeals.slice(0, 5),
      userWiseSummary: userWiseSummaryData,
    });
  }, [dateRange, selectedUserFilter, allLeads, allDroppedLeads, allClients, allProposals, allUsers, allFollowUps]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [leads, droppedLeads, clients, proposals, users, followUps] = await Promise.all([
        getLeads(),
        getDroppedLeads(),
        getActiveClients(),
        getAllProposals(),
        getUsers(),
        getAllFollowUps(),
      ]);
      setAllLeads(leads);
      setAllDroppedLeads(droppedLeads);
      setAllClients(clients);
      setAllProposals(proposals);
      setAllUsers(users);
      setAllFollowUps(followUps);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      handleApplyFilters();
    }
  }, [isLoading, handleApplyFilters]);

  const statCards = reportStats ? [
    { title: 'Leads Created', value: reportStats.leadsCreated, icon: Users, trend: 'neutral' },
    { title: 'Leads Dropped', value: reportStats.leadsDropped, icon: UserX, trend: 'neutral' },
    { title: 'Proposals Created', value: reportStats.proposalsCreated, icon: FileText, trend: 'neutral' },
    { title: 'Deals Won', value: reportStats.dealsWon, icon: Award, trend: 'positive' },
    { title: 'Follow-ups Scheduled', value: reportStats.tasks, icon: BellRing, trend: 'neutral' },
    { title: 'Calls Made', value: reportStats.calls, icon: Phone, trend: 'neutral' },
  ] : [];

  const lineChartConfig: ChartConfig = {
    created: { label: 'Leads Created', color: 'hsl(var(--chart-1))' },
    dropped: { label: 'Leads Dropped', color: 'hsl(var(--chart-5))' },
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Select date range and user to generate the report.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="grid gap-2">
            <label htmlFor="date-range" className="text-sm font-medium">Date Range</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date-range"
                  variant={"outline"}
                  className={cn(
                    "w-[260px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  showOutsideDays={false}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-2">
            <label htmlFor="user-select" className="text-sm font-medium">User</label>
            <Select value={selectedUserFilter} onValueChange={setSelectedUserFilter}>
              <SelectTrigger id="user-select" className="w-[180px]">
                <SelectValue placeholder="Select User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {allUsers.map(user => (
                  <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleApplyFilters} className="sm:ml-auto">
             <Filter className="mr-2 h-4 w-4" /> Apply Filters
          </Button>
        </CardContent>
      </Card>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : reportStats ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {statCards.map(stat => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChartIcon className="h-5 w-5 text-primary" />
                Leads Created vs. Dropped
              </CardTitle>
              <CardDescription>Trend of leads created and dropped over the selected period.</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
              <ChartContainer config={lineChartConfig} className="w-full h-full">
                <ResponsiveContainer>
                  <LineChart data={reportStats.chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                    <RechartsTooltip content={<ChartTooltipContent indicator="line" />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line type="monotone" dataKey="created" stroke="var(--color-created)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="dropped" stroke="var(--color-dropped)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recently Dropped Leads</CardTitle>
                <CardDescription>Details of the latest leads marked as 'Lost'.</CardDescription>
              </CardHeader>
              <CardContent>
                {reportStats.droppedLeadsDetails.length > 0 ? (
                  <ul className="space-y-3">
                    {reportStats.droppedLeadsDetails.map(lead => (
                      <li key={lead.id} className="text-sm p-2 border rounded-md bg-muted/30">
                        <p className="font-medium">{lead.name} <span className="text-xs text-muted-foreground">({lead.phone || 'N/A'})</span></p>
                        <p>Dropped on: {format(parseISO(lead.droppedAt), 'dd MMM, yyyy')}</p>
                        <p>Reason: {lead.dropReason || 'Not specified'}</p>
                        <p className="text-xs text-muted-foreground">Assigned to: {lead.assignedTo || 'N/A'}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No leads dropped in this period/filter.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Recently Won Deals</CardTitle>
                <CardDescription>Details of the latest clients converted from leads.</CardDescription>
              </CardHeader>
              <CardContent>
                 {reportStats.wonDealsDetails.length > 0 ? (
                  <ul className="space-y-3">
                    {reportStats.wonDealsDetails.map(client => (
                      <li key={client.id} className="text-sm p-2 border rounded-md bg-muted/30">
                        <p className="font-medium">{client.name} <span className="text-xs text-muted-foreground">({client.phone || 'N/A'})</span></p>
                        <p>Won on: {format(parseISO(client.updatedAt), 'dd MMM, yyyy')}</p>
                        <p>Kilowatt: {client.kilowatt || 'N/A'} kW</p>
                         <p className="text-xs text-muted-foreground">Assigned to: {client.assignedTo || 'N/A'}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No deals won in this period/filter.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>User-wise report</CardTitle>
              <CardDescription>Performance summary for each user in the selected period.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-center">Leads Created</TableHead>
                    <TableHead className="text-center">Leads Dropped</TableHead>
                    <TableHead className="text-center">Proposals Created</TableHead>
                    <TableHead className="text-center">Deals Won</TableHead>
                    <TableHead className="text-center">Follow-ups</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportStats.userWiseSummary.length > 0 ? reportStats.userWiseSummary.map(userStat => (
                    <TableRow key={userStat.userId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={userStat.avatarUrl} data-ai-hint="user avatar" alt={userStat.userName} />
                            <AvatarFallback>{userStat.userName.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{userStat.userName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {userStat.leadsCreated > 0 ? <Badge variant="default">{userStat.leadsCreated}</Badge> : userStat.leadsCreated}
                      </TableCell>
                      <TableCell className="text-center">
                        {userStat.leadsDropped > 0 ? <Badge variant="destructive">{userStat.leadsDropped}</Badge> : userStat.leadsDropped}
                      </TableCell>
                       <TableCell className="text-center">
                        {userStat.dealsCreated > 0 ? <Badge variant="default">{userStat.dealsCreated}</Badge> : userStat.dealsCreated}
                      </TableCell>
                      <TableCell className="text-center">
                        {userStat.dealsWon > 0 ? <Badge variant="default">{userStat.dealsWon}</Badge> : userStat.dealsWon}
                      </TableCell>
                      <TableCell className="text-center">
                        {userStat.followUps > 0 ? <Badge variant="default">{userStat.followUps}</Badge> : userStat.followUps}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground">
                            No user data to display for the selected filters.
                        </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <p>Select filters and click "Apply" to view the report.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
