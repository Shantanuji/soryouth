
'use client';
import React, { useState, useMemo, useEffect, useTransition, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { LeadsTable } from '@/app/(app)/leads/leads-table'; // Reusing this for consistent display
import { CLIENT_TYPES } from '@/lib/constants';
import { Filter, Search, PlusCircle, Settings2, ListFilter, Rows, Briefcase, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClientForm } from '@/app/(app)/clients/client-form';
import { useToast } from "@/hooks/use-toast";
import type { Client, ClientStatusFilterItem, ClientSortConfig, ClientStatusType, CreateClientData, ClientType, User, CustomSetting } from '@/types';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, startOfDay, isSameDay } from 'date-fns';
import { getActiveClients, createClient, updateClient, deleteClient, bulkUpdateClients } from './actions';
import { getUsers } from '@/app/(app)/users/actions';
import { getClientStatuses, getLeadSources } from '@/app/(app)/settings/actions';
import { SettingsDialog } from '@/app/(app)/settings/settings-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const allColumns: Record<string, string> = {
    email: 'Email',
    phone: 'Mobile No.',
    status: 'Stage',
    source: 'Source',
    lastCommentText: 'Last Comment',
    nextFollowUpDate: 'Next Follow-up',
    followupCount: 'Followups',
    kilowatt: 'Kilowatt',
    priority: 'Priority',
    assignedTo: 'Assigned To',
};

export default function ClientsListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [statuses, setStatuses] = useState<CustomSetting[]>([]);
  const [sources, setSources] = useState<CustomSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [selectedClientForEdit, setSelectedClientForEdit] = useState<Client | null>(null);
  const { toast } = useToast();
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<ClientSortConfig | null>(null);
  const [isPending, startTransition] = useTransition();

  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [isAssignDialogOpen, setAssignDialogOpen] = useState(false);
  const [isStageDialogOpen, setStageDialogOpen] = useState(false);
  const [isTypeDialogOpen, setTypeDialogOpen] = useState(false);
  const [assignToUser, setAssignToUser] = useState<string>('');
  const [updateStageTo, setUpdateStageTo] = useState<ClientStatusType | ''>('');
  const [updateTypeTo, setUpdateTypeTo] = useState<ClientType | ''>('');

  // Read state from URL
  const currentPage = Number(searchParams.get('page')) || 1;
  const activeFilter = searchParams.get('status') || 'all';
  const quickFilter = searchParams.get('quickFilter') || 'Show all';
  const userFilter = searchParams.get('user') || 'all';
  const sourceFilter = searchParams.get('source') || 'all';
  const searchTerm = searchParams.get('search') || '';
  const pageSize = Number(searchParams.get('pageSize')) || 10;

  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    email: true, phone: true, status: true, source: true, lastCommentText: false,
    nextFollowUpDate: true,
    followupCount: true, kilowatt: true, priority: true, assignedTo: true,
  });

  const refreshData = async () => {
    const [allClients, allUsers, allStatuses, allSources] = await Promise.all([
      getActiveClients(),
      getUsers(),
      getClientStatuses(),
      getLeadSources()
    ]);
    setClients(allClients);
    setUsers(allUsers);
    setStatuses(allStatuses);
    setSources(allSources);
  };

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      await refreshData();
      setIsLoading(false);
    }
    fetchData();
  }, []);

  const createQueryString = useCallback(
    (paramsToUpdate: Record<string, string | number>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(paramsToUpdate).forEach(([key, value]) => {
        if (value) {
            params.set(key, String(value));
        } else {
            params.delete(key);
        }
      });
      // Reset page to 1 on any filter change except pagination itself
      if (!('page' in paramsToUpdate)) {
          params.set('page', '1');
      }

      return params.toString();
    },
    [searchParams]
  );
  
  const handleFilterChange = (params: Record<string, string | number>) => {
      router.push(`${pathname}?${createQueryString(params)}`);
  };

  const handleAddClient = () => {
    setSelectedClientForEdit(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: CreateClientData | Client) => {
    startTransition(async () => {
      let result;
      if ('id' in data && data.id) { // Existing client
        result = await updateClient(data.id, data as Partial<CreateClientData>);
        if ('error' in result) {
          toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        else if (result !== null) {
          setClients(prev => prev.map(c => c.id === result!.id ? result! : c));
          toast({ title: "Client Updated", description: `${result.name}'s information has been updated.` });
        } else {
          toast({ title: "Error", description: "Failed to update client.", variant: "destructive" });
        }
      } else { // New client
        const newClientData = { ...data, status: data.status || statuses[0]?.name || 'Fresher' };
        result = await createClient(newClientData as CreateClientData);
        if ('error' in result) {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        } else if (result) {
            await refreshData();
            toast({ title: "Client Added", description: `${result.name} has been added to leads.` });
        }
      }
      if (result && !('error' in result)) {
        setIsFormOpen(false);
        setSelectedClientForEdit(null);
      }
    });
  };

  const handleDeleteClient = async (clientId: string) => {
    startTransition(async () => {
      const { success } = await deleteClient(clientId);
      if (success) {
        setClients(prev => prev.filter(l => l.id !== clientId));
        toast({ title: "Client Deleted" });
      } else {
        toast({ title: "Error", description: "Failed to delete client.", variant: "destructive" });
      }
    });
  };
  
  const handleBulkUpdate = (action: 'assign' | 'stage' | 'type') => {
    startTransition(async () => {
        let data = {};
        let successMessage = '';
        if (action === 'assign' && assignToUser) {
            data = { assignedTo: assignToUser };
            successMessage = `Assigned to ${assignToUser}.`;
        } else if (action === 'stage' && updateStageTo) {
            data = { status: updateStageTo };
            successMessage = `Stage updated to ${updateStageTo}.`;
        } else if (action === 'type' && updateTypeTo) {
            data = { clientType: updateTypeTo };
            successMessage = `Client Type updated to ${updateTypeTo}.`;
        } else {
            toast({ title: "No Selection", description: "Please select a value.", variant: "destructive" });
            return;
        }

        const result = await bulkUpdateClients(selectedClientIds, data);
        if (result.success) {
            toast({ title: "Bulk Update Successful", description: `${result.count} clients updated. ${successMessage}` });
            await refreshData();
            setSelectedClientIds([]);
            setAssignDialogOpen(false);
            setStageDialogOpen(false);
            setTypeDialogOpen(false);
        } else {
            toast({ title: "Error", description: result.message || "Failed to update clients.", variant: "destructive" });
        }
    });
  };

  const statusFilters = useMemo((): ClientStatusFilterItem[] => {
    const counts: Record<string, number> = {};
    statuses.forEach(status => counts[status.name] = 0);
    
    clients.forEach(client => {
      if (counts[client.status] !== undefined) {
        counts[client.status]++;
      }
    });

    const filters: ClientStatusFilterItem[] = [{ label: 'Show all', count: clients.length, value: 'all' }];
    statuses.forEach(status => {
       if (status.name !== 'Inactive') {
         filters.push({ label: status.name, count: counts[status.name] || 0, value: status.name as ClientStatusType });
       }
    });
    return filters;
  }, [clients, statuses]);

  const allFilteredClients = useMemo(() => {
    let clientsToDisplay = [...clients];
    
    if (activeFilter !== 'all') {
      clientsToDisplay = clientsToDisplay.filter(client => client.status === activeFilter);
    }
    
    const today = startOfDay(new Date());
    switch(quickFilter) {
      case 'Assigned today':
        clientsToDisplay = clientsToDisplay.filter(client => isSameDay(parseISO(client.createdAt), today));
        break;
      case 'Followed today':
        clientsToDisplay = clientsToDisplay.filter(client => {
            if (!client.lastCommentDate) return false;
            const [day, month, year] = client.lastCommentDate.split('-').map(Number);
            return isSameDay(new Date(year, month - 1, day), today);
        });
        break;
      case 'Not followed today':
        clientsToDisplay = clientsToDisplay.filter(client => {
            if (!client.lastCommentDate) return true;
            const [day, month, year] = client.lastCommentDate.split('-').map(Number);
            return !isSameDay(new Date(year, month - 1, day), today);
        });
        break;
      case 'Unattended':
        clientsToDisplay = clientsToDisplay.filter(client => !client.assignedTo);
        break;
      case 'Show all':
      default:
        break;
    }
    
    if (userFilter !== 'all') {
        clientsToDisplay = clientsToDisplay.filter(client => client.assignedTo === userFilter);
    }
    if (sourceFilter !== 'all') {
        clientsToDisplay = clientsToDisplay.filter(client => client.source === sourceFilter);
    }

    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      clientsToDisplay = clientsToDisplay.filter(client => 
        client.name.toLowerCase().includes(lowercasedTerm) ||
        (client.email && client.email.toLowerCase().includes(lowercasedTerm)) ||
        (client.phone && client.phone.includes(lowercasedTerm))
      );
    }

    if (sortConfig !== null) {
      clientsToDisplay.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        if (String(aValue).toLowerCase() < String(bValue).toLowerCase()) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (String(aValue).toLowerCase() > String(bValue).toLowerCase()) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return clientsToDisplay;
  }, [clients, activeFilter, sortConfig, searchTerm, quickFilter, userFilter, sourceFilter]);

  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return allFilteredClients.slice(start, end);
  }, [allFilteredClients, currentPage, pageSize]);

  const totalPages = Math.ceil(allFilteredClients.length / pageSize);

  const requestSort = (key: keyof Client) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const activeStatusesForBulkUpdate = statuses.filter(s => s.name !== 'Inactive').map(s => s.name);

  if (isLoading) {
    return <PageHeader title="Clients" description="Manage all your existing clients." icon={Briefcase} />;
  }

  return (
    <>
      <PageHeader
        title="Clients"
        description="Manage all your existing clients."
        icon={Briefcase}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {selectedClientIds.length > 0 ? (
                 <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">{selectedClientIds.length} selected</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          Actions <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setAssignDialogOpen(true)}>Assign clients</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setStageDialogOpen(true)}>Update stage</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setTypeDialogOpen(true)}>Update Client Type</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            ) : (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="mr-2 h-4 w-4" /> Filter
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Quick Filters</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {['Assigned today', 'Followed today', 'Not followed today', 'Unattended', 'Show all'].map(item => (
                      <DropdownMenuItem key={item} onSelect={() => handleFilterChange({ quickFilter: item, user: 'all', source: 'all' })}>
                        {item}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                     <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Assigned To</DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                            <DropdownMenuRadioGroup value={userFilter} onValueChange={(value) => handleFilterChange({ user: value, quickFilter: 'Show all', source: 'all' })}>
                                <DropdownMenuRadioItem value="all">All Users</DropdownMenuRadioItem>
                                {users.map(user => (
                                    <DropdownMenuRadioItem key={user.id} value={user.name}>{user.name}</DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Source</DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                             <DropdownMenuRadioGroup value={sourceFilter} onValueChange={(value) => handleFilterChange({ source: value, quickFilter: 'Show all', user: 'all' })}>
                                <DropdownMenuRadioItem value="all">All Sources</DropdownMenuRadioItem>
                                {sources.map(source => (
                                    <DropdownMenuRadioItem key={source.id} value={source.name}>{source.name}</DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm" onClick={() => setIsSearchOpen(true)}>
                  <Search className="mr-2 h-4 w-4" /> Search
                </Button>
              </>
            )}
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white" onClick={handleAddClient} disabled={isPending}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Client
            </Button>
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Settings2 className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>View Options</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => setIsSettingsDialogOpen(true)}>Customize Settings</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <ListFilter className="mr-2 h-4 w-4" />
                            <span>Columns</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {Object.entries(allColumns).map(([key, label]) => (
                                    <DropdownMenuCheckboxItem
                                        key={key}
                                        className="capitalize"
                                        checked={columnVisibility[key]}
                                        onCheckedChange={(value) =>
                                            setColumnVisibility((prev) => ({ ...prev, [key]: !!value }))
                                        }
                                    >
                                        {label}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <Rows className="mr-2 h-4 w-4" />
                            <span>Rows per page</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                              <DropdownMenuRadioGroup value={String(pageSize)} onValueChange={(value) => handleFilterChange({ pageSize: Number(value) })}>
                                  {[10, 20, 50, 100].map(size => (
                                      <DropdownMenuRadioItem key={size} value={String(size)}>{size}</DropdownMenuRadioItem>
                                  ))}
                              </DropdownMenuRadioGroup>
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />
      <div className="mb-4">
        <div className="flex flex-wrap gap-2 items-center">
          {statusFilters.map(filter => (
            <Button
              key={filter.value}
              variant={activeFilter === filter.value ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleFilterChange({ status: filter.value })}
              className={`py-1 px-3 h-auto text-xs rounded-full ${activeFilter === filter.value ? 'border-b-2 border-primary font-semibold' : 'text-muted-foreground'}`}
            >
              {filter.label}
              <Badge variant={activeFilter === filter.value ? 'default' : 'secondary'} className="ml-2 rounded-sm px-1.5 py-0.5 text-[10px] h-4 leading-none">
                {filter.count}
              </Badge>
            </Button>
          ))}
        </div>
      </div>
      
      <LeadsTable
        items={paginatedClients}
        viewType="client"
        onEdit={(client) => { setSelectedClientForEdit(client as Client); setIsFormOpen(true); }}
        onDelete={handleDeleteClient}
        sortConfig={sortConfig}
        requestSort={requestSort as (key: keyof Client) => void}
        columnVisibility={columnVisibility}
        selectedIds={selectedClientIds}
        setSelectedIds={setSelectedClientIds}
        allFilteredIds={allFilteredClients.map(c => c.id)}
        currentPage={currentPage}
      />

       <div className="flex items-center justify-between pt-4">
        <div className="text-sm text-muted-foreground">
          Showing {paginatedClients.length} of {allFilteredClients.length} clients.
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => handleFilterChange({ page: currentPage - 1 })} disabled={currentPage === 1}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleFilterChange({ page: currentPage + 1 })} disabled={currentPage >= totalPages}>
            Next
          </Button>
        </div>
      </div>

      {isFormOpen && (
        <ClientForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleFormSubmit}
          client={selectedClientForEdit}
          users={users}
          statuses={statuses}
          sources={sources}
        />
      )}
      {isSettingsDialogOpen && (
        <SettingsDialog
          isOpen={isSettingsDialogOpen}
          onClose={() => {
            setIsSettingsDialogOpen(false);
            refreshData(); // Refresh data when closing settings
          }}
          settingTypes={[{ title: 'Client Stages', type: 'CLIENT_STATUS' }]}
        />
       )}
       {isSearchOpen && (
        <AlertDialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Search Clients</AlertDialogTitle>
              <AlertDialogDescription>
                Search by name, email, or phone number.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="search-input" className="sr-only">Search</Label>
              <Input 
                id="search-input"
                placeholder="e.g. Green Valley Society, john@example.com, 987..."
                defaultValue={searchTerm}
                onChange={(e) => handleFilterChange({ search: e.target.value })}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {handleFilterChange({ search: '' }); setIsSearchOpen(false);}}>Clear & Close</AlertDialogCancel>
              <AlertDialogAction onClick={() => setIsSearchOpen(false)}>Apply</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Bulk Action Dialogs */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Assign Selected Clients</DialogTitle>
                  <DialogDescription>Assign the {selectedClientIds.length} selected clients to a user.</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                  <Label htmlFor="assign-user">Assign to</Label>
                  <Select value={assignToUser} onValueChange={(v) => setAssignToUser(v)}>
                      <SelectTrigger><SelectValue placeholder="Select a user" /></SelectTrigger>
                      <SelectContent>
                          {users.map(user => <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>)}
                      </SelectContent>
                  </Select>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
                  <Button onClick={() => handleBulkUpdate('assign')} disabled={isPending || !assignToUser}>Update</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      
      <Dialog open={isStageDialogOpen} onOpenChange={setStageDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Update Stage for Selected Clients</DialogTitle>
                  <DialogDescription>Change the stage for the {selectedClientIds.length} selected clients.</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                  <Label htmlFor="update-stage">New Stage</Label>
                  <Select value={updateStageTo} onValueChange={(v) => setUpdateStageTo(v as ClientStatusType)}>
                      <SelectTrigger><SelectValue placeholder="Select a stage" /></SelectTrigger>
                      <SelectContent>
                          {statuses.filter(s => s.name !== 'Inactive').map(stage => <SelectItem key={stage.id} value={stage.name}>{stage.name}</SelectItem>)}
                      </SelectContent>
                  </Select>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setStageDialogOpen(false)}>Cancel</Button>
                  <Button onClick={() => handleBulkUpdate('stage')} disabled={isPending || !updateStageTo}>Update</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

       <Dialog open={isTypeDialogOpen} onOpenChange={setTypeDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Update Client Type</DialogTitle>
                  <DialogDescription>Change the type for the {selectedClientIds.length} selected clients.</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                  <Label htmlFor="update-type">New Client Type</Label>
                  <Select value={updateTypeTo} onValueChange={(v) => setUpdateTypeTo(v as ClientType)}>
                      <SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger>
                      <SelectContent>
                          {CLIENT_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                      </SelectContent>
                  </Select>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setTypeDialogOpen(false)}>Cancel</Button>
                  <Button onClick={() => handleBulkUpdate('type')} disabled={isPending || !updateTypeTo}>Update</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </>
  );
}

