
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { CalendarIcon, Phone, MessageSquare, Mail, Users, UserCircle, Loader2 } from 'lucide-react';
import { format, formatDistanceToNow, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { getAllFollowUps } from '@/app/(app)/leads-list/actions';
import { getUsers } from '@/app/(app)/users/actions';
import type { FollowUp, User } from '@/types';
import { useSession } from '@/hooks/use-sessions';
import { useIsMobile } from '@/hooks/use-mobile';
import { sendCallNotification } from '@/lib/fcm';
import Link from 'next/link';

// Helper to get customer name from a followup
const getCustomerName = (followUp: FollowUp): string | null => {
  if (followUp.lead) return followUp.lead.name;
  if (followUp.client) return followUp.client.name;
  if (followUp.deal) return followUp.deal.clientName;
  return null;
};

// Helper to get customer phone from a followup
const getCustomerPhone = (followUp: FollowUp): string | null => {
    if (followUp.lead) return followUp.lead.phone ?? null;
    if (followUp.client) return followUp.client.phone ?? null;
    if (followUp.deal) return followUp.deal.phone ?? null;
    return null;
};

// Helper to get customer link from a followup
const getCustomerLink = (followUp: FollowUp): string | null => {
    if (followUp.leadId) return `/leads/${followUp.leadId}`;
    if (followUp.clientId) return `/clients/${followUp.clientId}`;
    if (followUp.dealId) return `/deals/${followUp.dealId}`;
    return null;
};


export default function ActivityPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [allFollowUps, setAllFollowUps] = useState<FollowUp[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const { toast } = useToast();
  const session = useSession();
  const isMobile = useIsMobile();
  const [isCalling, setIsCalling] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
        setIsLoading(true);
        const [followUpsData, usersData] = await Promise.all([
            getAllFollowUps(),
            getUsers(),
        ]);
        setAllFollowUps(followUpsData);
        setUsers(usersData);
        setIsLoading(false);
    }
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    if (!selectedDate) return [];
    
    const start = startOfDay(selectedDate);
    const end = endOfDay(selectedDate);
    const dateInterval = { start, end };
    
    return allFollowUps.filter(followUp => {
        const dateMatches = isWithinInterval(parseISO(followUp.createdAt), dateInterval);
        const userMatches = selectedUserId === 'all' || followUp.createdById === selectedUserId;
        return dateMatches && userMatches;
    });
  }, [allFollowUps, selectedDate, selectedUserId]);

  const activityStats = useMemo(() => {
    const stats: Record<string, number> = { Call: 0, SMS: 0, Email: 0, Visit: 0, Meeting: 0 };
    filteredData.forEach(fu => {
        if(stats[fu.type] !== undefined) {
            stats[fu.type]++;
        }
    });
    return [
      { type: 'Calls', count: stats.Call, Icon: Phone, color: 'bg-blue-500 dark:bg-blue-600' },
      { type: 'SMS', count: stats.SMS, Icon: MessageSquare, color: 'bg-primary dark:bg-primary/90' },
      { type: 'Email', count: stats.Email, Icon: Mail, color: 'bg-red-500 dark:bg-red-600' },
      { type: 'Visits', count: stats.Visit, Icon: Users, color: 'bg-yellow-500 dark:bg-yellow-600' },
      { type: 'Meetings', count: stats.Meeting, Icon: Users, color: 'bg-purple-500 dark:bg-purple-600' },
    ].filter(stat => stat.count > 0);
  }, [filteredData]);
  
  const activityTypeChartData = useMemo(() => {
    const counts = activityStats.reduce((acc, stat) => {
        acc[stat.type] = stat.count;
        return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, value], index) => ({ name, value, fill: `hsl(var(--chart-${index + 1}))`}));
  }, [activityStats]);

  const userActivityChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach(u => counts[u.name] = 0);
    
    // Filter by date, but ignore user selection for this chart
     const dateFilteredFollowUps = allFollowUps.filter(followUp => {
        if (!selectedDate) return false;
        return isWithinInterval(parseISO(followUp.createdAt), { start: startOfDay(selectedDate), end: endOfDay(selectedDate) });
     });

    dateFilteredFollowUps.forEach(fu => {
        if(fu.createdBy && counts[fu.createdBy] !== undefined) {
            counts[fu.createdBy]++;
        }
    });
    return Object.entries(counts).map(([name, value], index) => ({ name, value, fill: `hsl(var(--chart-${index + 1}))`})).filter(u => u.value > 0);
  }, [allFollowUps, users, selectedDate]);
  
  const chartConfig = (data: {name: string, fill: string}[]) => useMemo(() => {
    const config: ChartConfig = {};
    data.forEach(item => {
        config[item.name] = { label: item.name, color: item.fill };
    });
    return config;
  }, [data]);
  
  const handleInitiateCall = async (followUp: FollowUp) => {
    const phone = getCustomerPhone(followUp);
    const name = getCustomerName(followUp);

    if (!phone) {
        toast({ title: "Cannot Initiate Call", description: "Customer does not have a phone number.", variant: "destructive" });
        return;
    }
    const loggedInUser = users.find(u => u.id === session?.userId);
    if (!loggedInUser?.deviceId) {
        toast({ title: "Cannot Initiate Call", description: "You do not have a registered mobile device. Please login to the mobile app.", variant: "destructive" });
        return;
    }
    
    setIsCalling(followUp.id);
    toast({ title: "Initiating Call...", description: "Sending notification to your mobile device." });
    const result = await sendCallNotification(loggedInUser.deviceId!, phone!, name || 'Customer');
    if (result.success) {
        toast({ title: "Notification Sent", description: "Check your mobile device to place the call." });
    } else {
        toast({ title: "Failed to Send Notification", description: result.error, variant: "destructive" });
    }
    setIsCalling(null);
  };


  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      <div className="flex-grow lg:w-2/3 space-y-6">
        <div className="flex justify-between items-center">
          <div></div> 
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={"outline"} className="w-[200px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "dd-MM-yyyy") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {activityStats.map((stat) => (
            <Card key={stat.type} className="shadow-md">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`flex-shrink-0 h-12 w-12 rounded-full ${stat.color} flex items-center justify-center text-white font-bold text-lg`}>
                  {stat.count}
                </div>
                <div className="flex items-center">
                  <stat.Icon className="h-5 w-5 mr-2 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">{stat.type}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-md">
            <CardHeader><CardTitle>Activity type</CardTitle></CardHeader>
            <CardContent className="h-[250px] pb-0">
              <ChartContainer config={chartConfig(activityTypeChartData)} className="w-full h-full">
                <ResponsiveContainer>
                <PieChart accessibilityLayer>
                  <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie data={activityTypeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={({ name, value }) => `${name}: ${value}`}>
                    {activityTypeChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardHeader><CardTitle>User</CardTitle></CardHeader>
            <CardContent className="h-[250px] pb-0">
                <ChartContainer config={chartConfig(userActivityChartData)} className="w-full h-full">
                <ResponsiveContainer>
                <PieChart accessibilityLayer>
                  <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie data={userActivityChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={({ name, value }) => `${name}: ${value}`}>
                    {userActivityChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Activity list ({filteredData.length})</CardTitle>
            <CardDescription>List of activities performed on {selectedDate ? format(selectedDate, "dd-MM-yyyy") : 'the selected date'}.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div> :
            <ScrollArea className="h-[400px]">
              <div className="divide-y divide-border">
                {filteredData.length > 0 ? filteredData.map(activity => {
                  const customerName = getCustomerName(activity);
                  const customerPhone = getCustomerPhone(activity);
                  const customerLink = getCustomerLink(activity);
                  
                  const CallButton = () => {
                        if (!customerPhone) return null;
                        if (isMobile) {
                            return <a href={`tel:${customerPhone}`}><Button size="sm">Call</Button></a>;
                        }
                        return <Button size="sm" onClick={() => handleInitiateCall(activity)} disabled={isCalling === activity.id}>{isCalling === activity.id ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Call'}</Button>
                  };

                  return (
                  <div key={activity.id} className="p-4 flex items-center gap-4 hover:bg-muted/50">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={`https://placehold.co/40x40.png?text=${activity.createdBy?.charAt(0) || 'S'}`} data-ai-hint="user avatar" alt={activity.createdBy} />
                        <AvatarFallback>{activity.createdBy?.charAt(0).toUpperCase() || 'S'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-grow">
                      <p className="text-sm font-semibold">{activity.comment}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.createdBy} - {customerLink ? <Link href={customerLink} className="hover:underline text-primary">{customerName}</Link> : customerName} - {format(parseISO(activity.createdAt), 'dd-MM-yyyy p')}
                      </p>
                    </div>
                     <CallButton/>
                  </div>
                )}) : (
                   <div className="p-6 text-center text-muted-foreground">No activities found for this day.</div>
                )}
              </div>
            </ScrollArea>
            }
          </CardContent>
        </Card>

      </div>

      <div className="lg:w-1/3 lg:max-w-xs flex-shrink-0">
        <Card className="shadow-md h-full flex flex-col">
          <CardHeader>
            <CardTitle>Team</CardTitle>
            <CardDescription>Select a user to filter activities.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden p-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-1">
                <div onClick={() => setSelectedUserId('all')} className={`flex items-center gap-3 p-2 rounded-md cursor-pointer ${selectedUserId === 'all' ? 'bg-primary/10' : 'hover:bg-muted/50'}`}>
                    <Avatar className="h-9 w-9"><UserCircle className="h-full w-full"/></Avatar>
                    <div><p className="text-sm font-medium">All Users</p></div>
                </div>
                {users.map(member => (
                  <div key={member.id} onClick={() => setSelectedUserId(member.id)} className={`flex items-center gap-3 p-2 rounded-md cursor-pointer ${selectedUserId === member.id ? 'bg-primary/10' : 'hover:bg-muted/50'}`}>
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={`https://placehold.co/40x40.png?text=${member.name.charAt(0)}`} data-ai-hint="user avatar" alt={member.name} />
                      <AvatarFallback>{member.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

