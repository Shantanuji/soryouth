
'use client';

import { PageHeader } from '@/components/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useState, useEffect, useMemo, useTransition } from 'react';
import { Ticket, PlusCircle, CalendarIcon, UserCircle, Users, ChevronDown, Loader2, Filter, MoreVertical, Trash2 } from 'lucide-react';
import { format, isBefore, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { getTickets, updateTicketStatus, deleteClosedTickets } from './actions';
import { getUsers } from '../users/actions';
import type { Tickets as TicketsType, User, TicketStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { CreateTicketForm } from '@/components/create-ticket-form';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialogTrigger, AlertDialogFooter, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";


type TicketFilters = {
  dueDate: Date | undefined;
  status: string;
  priority: string;
  assignedToId: string;
  isOverdue: boolean;
};

const TICKET_STATUSES = ['Open', 'On Hold', 'Closed'];
const TICKET_PRIORITIES = ['High', 'Medium', 'Low'];


function RemarkDialog({
    isOpen,
    onClose,
    onSubmit,
    ticketId,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (ticketId: string, remark: string) => void;
    ticketId: string;
}) {
    const [remark, setRemark] = useState('');
    const [isSubmitting, startSubmitTransition] = useTransition();

    const handleSubmit = () => {
        startSubmitTransition(() => {
            onSubmit(ticketId, remark);
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Status Update Remark</DialogTitle>
                    <DialogDescription>
                        Please provide a remark for the status update.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="remark" className="sr-only">Remark</Label>
                    <Textarea
                        id="remark"
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        placeholder="e.g., Client provided necessary documents, waiting for internal review..."
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting || !remark.trim()}>
                        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2"/>}
                        Save Remark
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketsType[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(true);
  const [isRemarkDialogOpen, setIsRemarkDialogOpen] = useState(false);
  const [ticketForRemark, setTicketForRemark] = useState<{ id: string, status: TicketStatus } | null>(null);
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [isDeleting, startDeleteTransition] = useTransition();
  const { toast } = useToast();

  const [filters, setFilters] = useState<TicketFilters>({
    dueDate: undefined,
    status: 'all',
    priority: 'all',
    assignedToId: 'all',
    isOverdue: false,
  });
  
  const refreshTickets = async () => {
    setIsLoading(true);
    const [fetchedTickets, fetchedUsers] = await Promise.all([getTickets(), getUsers()]);
    setTickets(fetchedTickets);
    setUsers(fetchedUsers);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshTickets();
  }, []);

  const handleFilterChange = <K extends keyof TicketFilters>(key: K, value: TicketFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const handleStatusChangeRequest = (ticketId: string, status: TicketStatus) => {
    setTicketForRemark({ id: ticketId, status });
    setIsRemarkDialogOpen(true);
  };

  const handleRemarkSubmit = async (ticketId: string, remark: string) => {
    if (!ticketForRemark) return;
    
    const result = await updateTicketStatus(ticketId, ticketForRemark.status, remark);
    if(result.success) {
      toast({ title: "Status Updated", description: "The ticket status and remark have been updated." });
      refreshTickets();
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setIsRemarkDialogOpen(false);
    setTicketForRemark(null);
  };
  
  const handleBulkDelete = () => {
    startDeleteTransition(async () => {
        const result = await deleteClosedTickets(selectedTicketIds);
        if(result.success) {
            toast({ title: "Tickets Deleted", description: `${result.count} closed ticket(s) have been deleted.` });
            refreshTickets();
            setSelectedTicketIds([]);
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    });
  }

  const statusCounts = useMemo(() => {
    const counts = { Open: 0, 'On Hold': 0, Closed: 0 };
    tickets.forEach(ticket => {
      if (ticket.status in counts) {
        counts[ticket.status as keyof typeof counts]++;
      }
    });
    return counts;
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      if (filters.status !== 'all' && ticket.status !== filters.status) return false;
      if (filters.priority !== 'all' && ticket.priority !== filters.priority) return false;
      if (filters.assignedToId !== 'all' && ticket.assignedToId !== filters.assignedToId) return false;
      if (filters.dueDate && format(new Date(ticket.dueDate), 'yyyy-MM-dd') !== format(filters.dueDate, 'yyyy-MM-dd')) return false;
      
      if (filters.isOverdue) {
        const isTicketOverdue = isBefore(new Date(ticket.dueDate), startOfDay(new Date()));
        if (!isTicketOverdue || ticket.status === 'Closed') {
          return false;
        }
      }

      return true;
    });
  }, [tickets, filters]);
  
  const getPriorityBadgeVariant = (priority: string) => {
    switch(priority) {
      case 'High': return 'destructive';
      case 'Medium': return 'secondary';
      case 'Low': return 'outline';
      default: return 'outline';
    }
  };
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
        const closedTicketIds = filteredTickets.filter(t => t.status === 'Closed').map(t => t.id);
        setSelectedTicketIds(closedTicketIds);
    } else {
        setSelectedTicketIds([]);
    }
  };

  const handleSelectOne = (ticketId: string, checked: boolean) => {
    setSelectedTicketIds(prev => checked ? [...prev, ticketId] : prev.filter(id => id !== ticketId));
  };


  return (
    <>
      <PageHeader
        title="Tickets"
        description="View and manage your support tickets."
        icon={Ticket}
        actions={
            <div className="flex items-center gap-2">
         {selectedTicketIds.length > 0 && (
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="rounded-lg">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete ({selectedTicketIds.length}) Closed
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Selected Tickets?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the {selectedTicketIds.length} selected tickets that are marked as 'Closed'. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkDelete} disabled={isDeleting} className="bg-rose-600 hover:bg-rose-700 text-white">
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
         )}
        <Button size="sm" onClick={() => setIsFormOpen(true)} className="rounded-lg">
            <PlusCircle className="mr-2 h-4 w-4" /> Create Ticket
        </Button>
            </div>
        }
      />
      {/* Top Filter Bar */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 mt-4">
        {/* Status Quick Filters */}
        <div className="flex items-center p-1.5 bg-muted/50 rounded-xl border border-border/50">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleFilterChange('status', 'all')} 
            className={cn("rounded-lg px-4", filters.status === 'all' ? "bg-background shadow-sm hover:bg-background" : "hover:bg-transparent text-muted-foreground")}
          >
            All
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleFilterChange('status', 'Open')} 
            className={cn("rounded-lg px-4", filters.status === 'Open' ? "bg-background shadow-sm hover:bg-background" : "hover:bg-transparent text-muted-foreground")}
          >
            Open <Badge variant="outline" className="ml-2 bg-transparent">{statusCounts.Open}</Badge>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleFilterChange('status', 'On Hold')} 
            className={cn("rounded-lg px-4", filters.status === 'On Hold' ? "bg-background shadow-sm hover:bg-background" : "hover:bg-transparent text-muted-foreground")}
          >
            Hold <Badge variant="outline" className="ml-2 bg-transparent">{statusCounts['On Hold']}</Badge>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleFilterChange('status', 'Closed')} 
            className={cn("rounded-lg px-4", filters.status === 'Closed' ? "bg-background shadow-sm hover:bg-background" : "hover:bg-transparent text-muted-foreground")}
          >
            Closed <Badge variant="outline" className="ml-2 bg-transparent">{statusCounts.Closed}</Badge>
          </Button>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3">
           <Button 
              variant="outline" 
              onClick={() => handleFilterChange('isOverdue', !filters.isOverdue)} 
              className={cn("rounded-xl border-border/50 transition-colors", filters.isOverdue && "bg-rose-500/10 text-rose-600 border-rose-500/30 hover:bg-rose-500/20 hover:text-rose-700")}
           >
             <Filter className="mr-2 h-4 w-4" />
             {filters.isOverdue ? 'Showing Overdue' : 'Show Overdue'}
           </Button>

          <Popover>
            <PopoverTrigger asChild>
            <Button
                id="date"
                variant={"outline"}
                className={cn("w-[180px] justify-start text-left font-normal rounded-xl bg-card border-border/50", !filters.dueDate && "text-muted-foreground")}
            >
                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                {filters.dueDate ? format(filters.dueDate, 'PPP') : "Filter by Date"}
            </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={filters.dueDate} onSelect={(d) => handleFilterChange('dueDate', d || undefined)} initialFocus/>
            </PopoverContent>
          </Popover>

          <Select value={filters.priority} onValueChange={(v) => handleFilterChange('priority', v)}>
             <SelectTrigger className="w-[140px] rounded-xl bg-card border-border/50">
                <SelectValue placeholder="Priority" />
             </SelectTrigger>
             <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {TICKET_PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
             </SelectContent>
          </Select>

          <Select value={filters.assignedToId} onValueChange={(v) => handleFilterChange('assignedToId', v)}>
             <SelectTrigger className="w-[180px] rounded-xl bg-card border-border/50">
                 <div className="flex items-center gap-2"><UserCircle className="h-4 w-4 text-primary"/><span className="truncate">{filters.assignedToId === 'all' ? 'All Users' : filters.assignedToId === 'unassigned' ? 'Unassigned' : users.find(u => u.id === filters.assignedToId)?.name || 'Select'}</span></div>
             </SelectTrigger>
             <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                <SelectItem value="unassigned">Unassigned</SelectItem>
             </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-xl shadow-sm overflow-hidden h-full">
        <div className="p-4 border-b border-border/50 bg-muted/20">
            <h3 className="text-sm font-semibold text-foreground">All Tickets ({filteredTickets.length})</h3>
        </div>
        <div className="p-0">
            {isLoading ? (
            <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
            <Table>
                <TableHeader className="bg-muted/30">
                <TableRow>
                    <TableHead className="w-12 px-4">
                        <Checkbox
                        onCheckedChange={handleSelectAll}
                        checked={selectedTicketIds.length > 0 && selectedTicketIds.length === filteredTickets.filter(t => t.status === 'Closed').length}
                        aria-label="Select all closed tickets"
                    />
                    </TableHead>
                    <TableHead>Ticket ID</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredTickets.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center h-32 text-muted-foreground">No tickets match your filters.</TableCell></TableRow>
                ) : (
                    filteredTickets.map((ticket) => (
                    <TableRow key={ticket.id} data-state={selectedTicketIds.includes(ticket.id) && "selected"} className="hover:bg-muted/40 transition-colors">
                            <TableCell className="px-4">
                            <Checkbox
                                checked={selectedTicketIds.includes(ticket.id)}
                                onCheckedChange={(checked) => handleSelectOne(ticket.id, !!checked)}
                                aria-label={`Select ticket ${ticket.id.slice(-6)}`}
                                disabled={ticket.status !== 'Closed'}
                            />
                        </TableCell>
                        <TableCell className="font-medium text-xs text-muted-foreground">#{ticket.id.slice(-6)}</TableCell>
                        <TableCell className="font-semibold text-foreground max-w-[200px] truncate">{ticket.subject}</TableCell>
                        <TableCell>
                            <Link href={`/clients/${ticket.clientId}`} className="font-medium hover:underline text-primary">{ticket.clientName}</Link>
                        </TableCell>
                        <TableCell>
                            <Badge variant={getPriorityBadgeVariant(ticket.priority)} className="uppercase text-[10px] tracking-wider py-0.5">{ticket.priority}</Badge>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" className={cn("text-[10px] uppercase font-bold tracking-wider py-0.5", ticket.status === 'Open' ? 'text-blue-500 border-blue-200 bg-blue-500/10' : ticket.status === 'On Hold' ? 'text-orange-500 border-orange-200 bg-orange-500/10' : 'text-zinc-500 border-zinc-200 bg-zinc-500/10')}>{ticket.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{format(new Date(ticket.dueDate), 'dd MMM, yyyy')}</TableCell>
                        <TableCell className="text-xs font-medium">{ticket.assignedTo?.name || <span className="text-muted-foreground italic">Unassigned</span>}</TableCell>
                            <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background"><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                    <DropdownMenuItem onClick={() => handleStatusChangeRequest(ticket.id, 'Open')} className="text-xs font-medium">Mark as Open</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleStatusChangeRequest(ticket.id, 'On Hold')} className="text-xs font-medium">Mark as On Hold</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleStatusChangeRequest(ticket.id, 'Closed')} className="text-xs font-medium text-primary">Mark as Closed</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                    ))
                )}
                </TableBody>
            </Table>
            )}
        </div>
      </div>
      <CreateTicketForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onTicketCreated={refreshTickets} />
      {ticketForRemark && (
          <RemarkDialog
            isOpen={isRemarkDialogOpen}
            onClose={() => setIsRemarkDialogOpen(false)}
            onSubmit={handleRemarkSubmit}
            ticketId={ticketForRemark.id}
          />
      )}
    </>
  );
}
