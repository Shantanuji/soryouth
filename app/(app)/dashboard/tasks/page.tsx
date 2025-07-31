
'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { TasksTable } from './tasks-table';
import { ClipboardCheck, CalendarIcon, Loader2, UserCircle, Users, Briefcase } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getUsers } from '@/app/(app)/users/actions';
import { getAllFollowUps, updateTaskStatus } from '@/app/(app)/leads-list/actions';
import type { User, FollowUp, ClientType } from '@/types';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

type TaskStatusFilter = 'Open' | 'Closed' | 'all';
type DataTypeFilter = 'lead' | 'client' | 'all';
type CustomerTypeFilter = ClientType | 'all';

export default function TasksPage() {
  const router = useRouter();
  const [allTasks, setAllTasks] = useState<FollowUp[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, startUpdateTransition] = useTransition();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 30), to: new Date() });
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>('Open');
  const [dataTypeFilter, setDataTypeFilter] = useState<DataTypeFilter>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<CustomerTypeFilter>('all');

  const fetchData = async () => {
    setIsLoading(true);
    const [fetchedUsers, fetchedTasks] = await Promise.all([getUsers(), getAllFollowUps()]);
    setUsers(fetchedUsers);
    setAllTasks(fetchedTasks.filter(t => t.followupOrTask === 'Task'));
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusUpdate = (taskId: string, newStatus: 'Open' | 'Closed') => {
      startUpdateTransition(async () => {
          await updateTaskStatus(taskId, newStatus);
          fetchData();
      });
  }

  const filteredTasks = useMemo(() => {
    const fromDate = dateRange?.from ? startOfDay(dateRange.from) : undefined;
    const toDate = dateRange?.to ? endOfDay(dateRange.to) : undefined;
    const dateInterval = fromDate && toDate ? { start: fromDate, end: toDate } : null;

    const filtered = allTasks.filter(task => {
      if (statusFilter !== 'all' && task.taskStatus !== statusFilter) return false;
      
      const customer = task.lead || task.client;
      if (dataTypeFilter !== 'all') {
        const isLead = !!task.leadId;
        const isClient = !!task.clientId;
        if (dataTypeFilter === 'lead' && !isLead) return false;
        if (dataTypeFilter === 'client' && !isClient) return false;
      }

      if (userFilter !== 'all' && task.taskForUser !== userFilter) return false;

      if (task.taskDate && dateInterval) {
        if (!isWithinInterval(parseISO(task.taskDate), dateInterval)) return false;
      }
      
      if (customerTypeFilter !== 'all') {
        const customerType = customer?.clientType;
        if (customerType !== customerTypeFilter) {
            return false;
        }
      }

      return true;
    });
    
    // Return only top 25 results
    return filtered.slice(0, 25);

  }, [allTasks, dateRange, statusFilter, dataTypeFilter, userFilter, customerTypeFilter]);
  
  const customerTypeCounts = useMemo(() => {
    const counts: Record<ClientType, number> = {
      Commercial: 0,
      Industrial: 0,
      'Housing Society': 0,
      'Individual/Bungalow': 0,
      Other: 0
    };
    allTasks.forEach(task => {
        const type = task.lead?.clientType || task.client?.clientType;
        if (type && type in counts) {
            counts[type]++;
        }
    });
    return counts;
  }, [allTasks]);


  return (
    <div className="flex gap-6 h-full">
      <main className="flex-1 space-y-4">
        <PageHeader title={`Tasks (${filteredTasks.length})`} icon={ClipboardCheck} />
         <div className="flex justify-between items-center">
            <div className="flex flex-wrap gap-2 items-center">
                <Button variant={customerTypeFilter === 'all' ? 'secondary' : 'ghost'} size="sm" onClick={() => setCustomerTypeFilter('all')}>Show all</Button>
                <Button variant={customerTypeFilter === 'Commercial' ? 'secondary' : 'ghost'} size="sm" onClick={() => setCustomerTypeFilter('Commercial')}>Commercial <Badge variant="outline" className="ml-2">{customerTypeCounts.Commercial}</Badge></Button>
                <Button variant={customerTypeFilter === 'Industrial' ? 'secondary' : 'ghost'} size="sm" onClick={() => setCustomerTypeFilter('Industrial')}>Industrial <Badge variant="outline" className="ml-2">{customerTypeCounts.Industrial}</Badge></Button>
                <Button variant={customerTypeFilter === 'Housing Society' ? 'secondary' : 'ghost'} size="sm" onClick={() => setCustomerTypeFilter('Housing Society')}>Housing Society <Badge variant="outline" className="ml-2">{customerTypeCounts['Housing Society']}</Badge></Button>
                <Button variant={customerTypeFilter === 'Individual/Bungalow' ? 'secondary' : 'ghost'} size="sm" onClick={() => setCustomerTypeFilter('Individual/Bungalow')}>Individual/Bungalow <Badge variant="outline" className="ml-2">{customerTypeCounts['Individual/Bungalow']}</Badge></Button>
            </div>
             <div className="flex items-center gap-2">
                 <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn("w-[260px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? ( dateRange.to ? (<> {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")} </>) : (format(dateRange.from, "LLL dd, y"))) : (<span>Pick a date range</span>)}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/>
                    </PopoverContent>
                </Popover>
            </div>
         </div>
        <TasksTable tasks={filteredTasks} onStatusChange={handleStatusUpdate} isLoading={isLoading || isUpdating} />
      </main>

       <aside className="w-64 flex-shrink-0">
          <Card>
            <CardContent className="pt-6 space-y-6">
               <div>
                  <h4 className="font-semibold text-sm mb-2">Status</h4>
                  <div className="space-y-1 text-sm">
                     <div className={cn("flex justify-between items-center cursor-pointer p-1 rounded-md hover:bg-muted", statusFilter === 'Open' && 'bg-primary/10')} onClick={() => setStatusFilter('Open')}><p>Open</p><Badge variant="outline">{allTasks.filter(t => t.taskStatus === 'Open').length}</Badge></div>
                     <div className={cn("flex justify-between items-center cursor-pointer p-1 rounded-md hover:bg-muted", statusFilter === 'Closed' && 'bg-primary/10')} onClick={() => setStatusFilter('Closed')}><p>Closed</p><Badge variant="outline">{allTasks.filter(t => t.taskStatus === 'Closed').length}</Badge></div>
                  </div>
               </div>
               <div>
                  <h4 className="font-semibold text-sm mb-2">Data type</h4>
                  <div className="space-y-1 text-sm">
                      <div className={cn("flex items-center gap-2 p-1 rounded-md hover:bg-muted cursor-pointer", dataTypeFilter === 'all' && 'bg-primary/10')} onClick={() => setDataTypeFilter('all')}><Users className="h-4 w-4"/><span>Show all</span></div>
                      <div className={cn("flex items-center gap-2 p-1 rounded-md hover:bg-muted cursor-pointer", dataTypeFilter === 'lead' && 'bg-primary/10')} onClick={() => setDataTypeFilter('lead')}><Users className="h-4 w-4"/><span>Lead</span></div>
                      <div className={cn("flex items-center gap-2 p-1 rounded-md hover:bg-muted cursor-pointer", dataTypeFilter === 'client' && 'bg-primary/10')} onClick={() => setDataTypeFilter('client')}><Briefcase className="h-4 w-4"/><span>Client</span></div>
                  </div>
               </div>
               <div>
                  <h4 className="font-semibold text-sm mb-2">Team</h4>
                   <div className="space-y-1 text-sm max-h-60 overflow-y-auto">
                     <div className={cn("flex items-center gap-2 p-1 rounded-md hover:bg-muted cursor-pointer", userFilter === 'all' && 'bg-primary/10')} onClick={() => setUserFilter('all')}><UserCircle className="h-5 w-5"/><span>All users</span></div>
                     {users.map(user => (
                         <div key={user.id} className={cn("flex items-center gap-2 p-1 rounded-md hover:bg-muted cursor-pointer", userFilter === user.name && 'bg-primary/10')} onClick={() => setUserFilter(user.name)}>
                             <UserCircle className="h-5 w-5"/>
                             <div>
                                <p>{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.role}</p>
                             </div>
                         </div>
                     ))}
                   </div>
               </div>
            </CardContent>
          </Card>
      </aside>
    </div>
  );
}
