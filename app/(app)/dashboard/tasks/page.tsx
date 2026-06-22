
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
  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Tasks ({filteredTasks.length})</h2>
      </div>

      {/* Top Filter Bar */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        {/* Status Quick Filters */}
        <div className="flex items-center p-1.5 bg-muted/50 rounded-xl border border-border/50">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setStatusFilter('all')} 
            className={cn("rounded-lg px-4", statusFilter === 'all' ? "bg-background shadow-sm hover:bg-background" : "hover:bg-transparent text-muted-foreground")}
          >
            All
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setStatusFilter('Open')} 
            className={cn("rounded-lg px-4", statusFilter === 'Open' ? "bg-background shadow-sm hover:bg-background" : "hover:bg-transparent text-muted-foreground")}
          >
            Open <Badge variant="outline" className="ml-2 bg-transparent">{allTasks.filter(t => t.taskStatus === 'Open').length}</Badge>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setStatusFilter('Closed')} 
            className={cn("rounded-lg px-4", statusFilter === 'Closed' ? "bg-background shadow-sm hover:bg-background" : "hover:bg-transparent text-muted-foreground")}
          >
            Closed <Badge variant="outline" className="ml-2 bg-transparent">{allTasks.filter(t => t.taskStatus === 'Closed').length}</Badge>
          </Button>
        </div>

        {/* Other Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
            <Button
                id="date"
                variant={"outline"}
                className={cn("w-[240px] justify-start text-left font-normal rounded-xl bg-card border-border/50", !dateRange && "text-muted-foreground")}
            >
                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                {dateRange?.from ? ( dateRange.to ? (<> {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")} </>) : (format(dateRange.from, "LLL dd, y"))) : (<span>Filter by date</span>)}
            </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="rounded-xl bg-card border-border/50">
                <Briefcase className="mr-2 h-4 w-4 text-primary" />
                {dataTypeFilter === 'all' ? 'All Data Types' : dataTypeFilter.charAt(0).toUpperCase() + dataTypeFilter.slice(1)}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[200px] p-2">
              <div className="space-y-1">
                <div className={cn("flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer text-sm font-medium", dataTypeFilter === 'all' && 'bg-primary/10 text-primary')} onClick={() => setDataTypeFilter('all')}><Users className="h-4 w-4"/><span>All types</span></div>
                <div className={cn("flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer text-sm font-medium", dataTypeFilter === 'lead' && 'bg-primary/10 text-primary')} onClick={() => setDataTypeFilter('lead')}><Users className="h-4 w-4"/><span>Lead</span></div>
                <div className={cn("flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer text-sm font-medium", dataTypeFilter === 'client' && 'bg-primary/10 text-primary')} onClick={() => setDataTypeFilter('client')}><Briefcase className="h-4 w-4"/><span>Client</span></div>
                <div className={cn("flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer text-sm font-medium", dataTypeFilter === 'deal' && 'bg-primary/10 text-primary')} onClick={() => setDataTypeFilter('deal')}><Handshake className="h-4 w-4"/><span>Deal</span></div>
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="rounded-xl bg-card border-border/50">
                <UserCircle className="mr-2 h-4 w-4 text-primary" />
                {userFilter === 'all' ? 'All Team Members' : userFilter}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[240px] p-2">
              <div className="space-y-1 max-h-60 overflow-y-auto">
                <div className={cn("flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer text-sm font-medium", userFilter === 'all' && 'bg-primary/10 text-primary')} onClick={() => setUserFilter('all')}>
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"><Users className="h-4 w-4" /></div>
                  <span>All team members</span>
                </div>
                {users.map(user => (
                  <div key={user.id} className={cn("flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer", userFilter === user.name && 'bg-primary/10')} onClick={() => setUserFilter(user.name)}>
                    <img src={`https://placehold.co/32x32.png?text=${user.name.charAt(0)}`} className="h-8 w-8 rounded-full" alt={user.name} />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{user.name}</span>
                      <span className="text-xs text-muted-foreground">{user.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-xl shadow-sm p-4">
        <TasksTable tasks={paginatedTasks} onStatusChange={handleStatusUpdate} isLoading={isLoading || isUpdating} />
        
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/50">
          <div className="text-sm text-muted-foreground font-medium">
            Showing {paginatedTasks.length} of {filteredTasks.length} tasks
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground font-medium mr-2">
              Page {currentPage} of {totalPages || 1}
            </span>
            <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage <= 1}>
              Previous
            </Button>
            <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage >= totalPages || totalPages === 0}>
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
