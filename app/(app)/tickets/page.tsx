
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
                 {selectedTicketIds.length > 0 ? (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
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
                                <AlertDialogAction onClick={handleBulkDelete} disabled={isDeleting}>
                                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                 ) : (
                    <Button variant="outline" size="sm" onClick={() => setIsFilterSidebarOpen(!isFilterSidebarOpen)}>
                        <Filter className="mr-2 h-4 w-4" />
                        <span>{isFilterSidebarOpen ? 'Hide' : 'Show'} Filters</span>
                    </Button>
                 )}
                <Button size="sm" onClick={() => setIsFormOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Create Ticket
                </Button>
            </div>
        }
      />
      <div className="flex gap-6 h-full">
        <main className="flex-1 space-y-4 transition-all duration-300">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">All Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
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
                        <TableRow><TableCell colSpan={9} className="text-center h-24">No tickets found.</TableCell></TableRow>
                    ) : (
                        filteredTickets.map((ticket) => (
                        <TableRow key={ticket.id} data-state={selectedTicketIds.includes(ticket.id) && "selected"}>
                             <TableCell>
                                <Checkbox
                                    checked={selectedTicketIds.includes(ticket.id)}
                                    onCheckedChange={(checked) => handleSelectOne(ticket.id, !!checked)}
                                    aria-label={`Select ticket ${ticket.id.slice(-6)}`}
                                    disabled={ticket.status !== 'Closed'}
                                />
                            </TableCell>
                            <TableCell className="font-medium">#{ticket.id.slice(-6)}</TableCell>
                            <TableCell>{ticket.subject}</TableCell>
                            <TableCell>
                                <Link href={`/clients/${ticket.clientId}`} className="hover:underline text-primary">{ticket.clientName}</Link>
                            </TableCell>
                            <TableCell>
                                <Badge variant={getPriorityBadgeVariant(ticket.priority)}>{ticket.priority}</Badge>
                            </TableCell>
                            <TableCell>{ticket.status}</TableCell>
                            <TableCell>{format(new Date(ticket.dueDate), 'dd MMM, yyyy')}</TableCell>
                            <TableCell>{ticket.assignedTo?.name || 'Unassigned'}</TableCell>
                             <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleStatusChangeRequest(ticket.id, 'Open')}>Mark as Open</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusChangeRequest(ticket.id, 'On Hold')}>Mark as On Hold</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusChangeRequest(ticket.id, 'Closed')}>Mark as Closed</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>

        <aside className={cn("w-64 flex-shrink-0 transition-all duration-300 ease-in-out", isFilterSidebarOpen ? 'ml-0' : '-ml-72 opacity-0')}>
          <Card>
            <CardHeader><CardTitle className="text-base">Filter tickets by</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Due date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !filters.dueDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dueDate ? format(filters.dueDate, 'PPP') : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={filters.dueDate} onSelect={(d) => handleFilterChange('dueDate', d || undefined)} initialFocus/></PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="space-y-1 text-sm">
                    <div className="flex justify-between items-center cursor-pointer" onClick={() => handleFilterChange('status', 'Open')}><p>Open</p><Badge variant="outline">{statusCounts.Open}</Badge></div>
                    <div className="flex justify-between items-center cursor-pointer" onClick={() => handleFilterChange('status', 'On Hold')}><p>Hold</p><Badge variant="outline">{statusCounts['On Hold']}</Badge></div>
                    <div className="flex justify-between items-center cursor-pointer" onClick={() => handleFilterChange('status', 'Closed')}><p>Closed</p><Badge variant="outline">{statusCounts.Closed}</Badge></div>
                    <div className="cursor-pointer" onClick={() => handleFilterChange('status', 'all')}>Show all</div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="overdue" checked={filters.isOverdue} onCheckedChange={(checked) => handleFilterChange('isOverdue', !!checked)} />
                <Label htmlFor="overdue">Show Overdue</Label>
              </div>

              <div className="space-y-2">
                 <Label>Priority</Label>
                 <Select value={filters.priority} onValueChange={(v) => handleFilterChange('priority', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>
                    <SelectItem value="all">Show all</SelectItem>
                    {TICKET_PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                 </SelectContent></Select>
              </div>

               <div className="space-y-2">
                 <Label>Users</Label>
                 <Select value={filters.assignedToId} onValueChange={(v) => handleFilterChange('assignedToId', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>
                    <SelectItem value="all">
                        <div className="flex items-center gap-2">
                            <UserCircle className="h-5 w-5"/>
                            <div><p>All users</p><p className="text-xs text-muted-foreground">Tickets for all users</p></div>
                        </div>
                    </SelectItem>
                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                 </SelectContent></Select>
              </div>

            </CardContent>
          </Card>
        </aside>
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
