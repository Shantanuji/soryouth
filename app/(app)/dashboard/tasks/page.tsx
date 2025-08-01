
'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { TasksTable } from './tasks-table';
import { ClipboardCheck, CalendarIcon, Loader2, UserCircle, Users, Briefcase, Handshake } from 'lucide-react';
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
type DataTypeFilter = 'lead' | 'client' | 'deal' | 'all';

export default function TasksPage() {
  const router = useRouter();
  const [allTasks, setAllTasks] = useState<FollowUp[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, startUpdateTransition] = useTransition();

  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 30), to: new Date() });
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>('Open');
  const [dataTypeFilter, setDataTypeFilter] = useState<DataTypeFilter>('all');
  const [userFilter, setUserFilter] = useState<string>('all');

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
      
      if (dataTypeFilter !== 'all') {
        const isLead = !!task.leadId;
        const isClient = !!task.clientId;
        const isDeal = !!task.dealId;
        if (dataTypeFilter === 'lead' && !isLead) return false;
        if (dataTypeFilter === 'client' && !isClient) return false;
        if (dataTypeFilter === 'deal' && !isDeal) return false;
      }

      if (userFilter !== 'all' && task.taskForUser !== userFilter) return false;

      if (task.taskDate && dateInterval) {
        if (!isWithinInterval(parseISO(task.taskDate), dateInterval)) return false;
      }

      return true;
    });
    
    return filtered;

  }, [allTasks, dateRange, statusFilter, dataTypeFilter, userFilter]);
  
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredTasks.slice(start, end);
  }, [filteredTasks, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredTasks.length / pageSize);


  return (
    <div className="flex gap-6 h-full">
      <main className="flex-1 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight">Tasks ({filteredTasks.length})</h2>
        </div>
        <TasksTable tasks={paginatedTasks} onStatusChange={handleStatusUpdate} isLoading={isLoading || isUpdating} />
         <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              Showing {paginatedTasks.length} of {filteredTasks.length} tasks.
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage >= totalPages}>
                Next
              </Button>
            </div>
         </div>
      </main>

       <aside className="w-64 flex-shrink-0">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div>
                  <h4 className="font-semibold text-sm mb-2">Filter by Date</h4>
                  <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
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
               <div>
                  <h4 className="font-semibold text-sm mb-2">Status</h4>
                  <div className="space-y-1 text-sm">
                     <div className={cn("flex justify-between items-center cursor-pointer p-1 rounded-md hover:bg-muted", statusFilter === 'Open' && 'bg-primary/10')} onClick={() => setStatusFilter('Open')}><p>Open</p><Badge variant="outline">{allTasks.filter(t => t.taskStatus === 'Open').length}</Badge></div>
                     <div className={cn("flex justify-between items-center cursor-pointer p-1 rounded-md hover:bg-muted", statusFilter === 'Closed' && 'bg-primary/10')} onClick={() => setStatusFilter('Closed')}><p>Closed</p><Badge variant="outline">{allTasks.filter(t => t.taskStatus === 'Closed').length}</Badge></div>
                     <div className={cn("flex justify-between items-center cursor-pointer p-1 rounded-md hover:bg-muted", statusFilter === 'all' && 'bg-primary/10')} onClick={() => setStatusFilter('all')}><p>Show all</p></div>
                  </div>
               </div>
               <div>
                  <h4 className="font-semibold text-sm mb-2">Data type</h4>
                  <div className="space-y-1 text-sm">
                      <div className={cn("flex items-center gap-2 p-1 rounded-md hover:bg-muted cursor-pointer", dataTypeFilter === 'all' && 'bg-primary/10')} onClick={() => setDataTypeFilter('all')}><Users className="h-4 w-4"/><span>Show all</span></div>
                      <div className={cn("flex items-center gap-2 p-1 rounded-md hover:bg-muted cursor-pointer", dataTypeFilter === 'lead' && 'bg-primary/10')} onClick={() => setDataTypeFilter('lead')}><Users className="h-4 w-4"/><span>Lead</span></div>
                      <div className={cn("flex items-center gap-2 p-1 rounded-md hover:bg-muted cursor-pointer", dataTypeFilter === 'client' && 'bg-primary/10')} onClick={() => setDataTypeFilter('client')}><Briefcase className="h-4 w-4"/><span>Client</span></div>
                      <div className={cn("flex items-center gap-2 p-1 rounded-md hover:bg-muted cursor-pointer", dataTypeFilter === 'deal' && 'bg-primary/10')} onClick={() => setDataTypeFilter('deal')}><Handshake className="h-4 w-4"/><span>Deal</span></div>
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
