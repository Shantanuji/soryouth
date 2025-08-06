
'use client';
import React, { useState, useMemo, useEffect, useTransition } from 'react';
import { PageHeader } from '@/components/page-header';
import { LeadsTable } from '@/app/(app)/leads/leads-table';
import { DROP_REASON_OPTIONS } from '@/lib/constants';
import { Settings2, UserX, ChevronDown, Repeat, Filter, Search, ListFilter, Rows } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DroppedLead, DropReasonType, DropReasonFilterItem, DroppedLeadSortConfig, User, CustomSetting } from '@/types';
import { Badge } from '@/components/ui/badge';
import { getDroppedLeads, bulkReactivateLeads } from './actions';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getUsers } from '@/app/(app)/users/actions';
import { getLeadSources } from '@/app/(app)/settings/actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const allColumns: Record<string, string> = {
    email: 'Email',
    phone: 'Mobile No.',
    status: 'Stage',
    dropReason: 'Drop Reason',
    lastCommentText: 'Last Comment',
    kilowatt: 'Kilowatt',
    priority: 'Priority',
    assignedTo: 'Assigned To',
};


export default function DroppedLeadsListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [droppedLeads, setDroppedLeads] = useState<DroppedLead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sources, setSources] = useState<CustomSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<DropReasonType | 'all'>('all');
  const [sortConfig, setSortConfig] = useState<DroppedLeadSortConfig | null>(null);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  
  const [userFilter, setUserFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [pageSize, setPageSize] = useState(10);
  const currentPage = Number(searchParams.get('page')) || 1;
  
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    email: true, phone: true, status: true, dropReason: true, lastCommentText: false,
    kilowatt: true, priority: true, assignedTo: true,
  });

  const refreshData = async () => {
    const [leads, allUsers, allSources] = await Promise.all([
      getDroppedLeads(),
      getUsers(),
      getLeadSources()
    ]);
    setDroppedLeads(leads);
    setUsers(allUsers);
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

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleBulkReactivate = () => {
    startTransition(async () => {
        const result = await bulkReactivateLeads(selectedLeadIds);
        if (result.success) {
            toast({ title: "Leads Reactivated", description: `${result.count} leads have been moved back to the active leads list.` });
            await refreshData();
            setSelectedLeadIds([]);
        } else {
            toast({ title: "Error", description: result.message || "Failed to reactivate leads.", variant: "destructive" });
        }
    });
  };

  const dropReasonFilters = useMemo((): DropReasonFilterItem[] => {
    const counts: Record<string, number> = {};
    DROP_REASON_OPTIONS.forEach(reason => counts[reason] = 0);
    
    droppedLeads.forEach(lead => {
      if (counts[lead.dropReason] !== undefined) {
        counts[lead.dropReason]++;
      }
    });

    const filters: DropReasonFilterItem[] = [{ label: 'Show all', count: droppedLeads.length, value: 'all' }];
    DROP_REASON_OPTIONS.forEach(reason => {
      if (counts[reason] > 0 || droppedLeads.some(l => l.dropReason === reason)) {
        filters.push({ label: reason, count: counts[reason] || 0, value: reason });
      }
    });
    return filters;
  }, [droppedLeads]);

  const allFilteredLeads = useMemo(() => {
    let leadsToDisplay = [...droppedLeads];
    
    if (activeFilter !== 'all') {
      leadsToDisplay = leadsToDisplay.filter(lead => lead.dropReason === activeFilter);
    }
    
    if (userFilter !== 'all') {
        leadsToDisplay = leadsToDisplay.filter(lead => lead.assignedTo === userFilter);
    }
    if (sourceFilter !== 'all') {
        leadsToDisplay = leadsToDisplay.filter(lead => lead.source === sourceFilter);
    }

    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      leadsToDisplay = leadsToDisplay.filter(lead => 
        lead.name.toLowerCase().includes(lowercasedTerm) ||
        (lead.email && lead.email.toLowerCase().includes(lowercasedTerm)) ||
        (lead.phone && lead.phone.includes(lowercasedTerm))
      );
    }

    if (sortConfig !== null) {
      leadsToDisplay.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        if (String(aValue).toLowerCase() < String(bValue).toLowerCase()) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (String(aValue).toLowerCase() > String(bValue).toLowerCase()) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return leadsToDisplay;
  }, [droppedLeads, activeFilter, sortConfig, searchTerm, userFilter, sourceFilter]);
  
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return allFilteredLeads.slice(start, end);
  }, [allFilteredLeads, currentPage, pageSize]);

  const totalPages = Math.ceil(allFilteredLeads.length / pageSize);


  const requestSort = (key: keyof DroppedLead) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  if (isLoading) {
    return <PageHeader title="Dropped Leads" description="Loading dropped leads..." icon={UserX} />;
  }

  return (
    <>
      <PageHeader
        title="Dropped Leads"
        description="View leads that have been marked as lost."
        icon={UserX}
        actions={
          <div className="flex items-center gap-2">
            {selectedLeadIds.length > 0 ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Repeat className="mr-2 h-4 w-4" /> Activate Leads ({selectedLeadIds.length})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reactivate {selectedLeadIds.length} lead(s) and move them back to the active leads list.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkReactivate} disabled={isPending}>
                        {isPending ? "Reactivating..." : "Yes, Reactivate"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
                <>
                  <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="mr-2 h-4 w-4" /> Filter
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                     <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Assigned To</DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                            <DropdownMenuRadioGroup value={userFilter} onValueChange={setUserFilter}>
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
                             <DropdownMenuRadioGroup value={sourceFilter} onValueChange={setSourceFilter}>
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
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Settings2 className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>View Options</DropdownMenuLabel>
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
                                <DropdownMenuRadioGroup value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); handlePageChange(1); }}>
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
          {dropReasonFilters.map(filter => (
            <Button
              key={filter.value}
              variant={activeFilter === filter.value ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveFilter(filter.value)}
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
        items={paginatedLeads} 
        viewType="dropped"
        sortConfig={sortConfig}
        requestSort={requestSort}
        columnVisibility={columnVisibility}
        selectedIds={selectedLeadIds}
        setSelectedIds={setSelectedLeadIds}
        allFilteredIds={allFilteredLeads.map(l => l.id)}
        currentPage={currentPage}
      />
      <div className="flex items-center justify-between pt-4">
        <div className="text-sm text-muted-foreground">
          Showing {paginatedLeads.length} of {allFilteredLeads.length} dropped leads.
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages}>
            Next
          </Button>
        </div>
      </div>

       {isSearchOpen && (
        <AlertDialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Search Dropped Leads</AlertDialogTitle>
              <AlertDialogDescription>
                Search by name, email, or phone number.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="search-input" className="sr-only">Search</Label>
              <Input 
                id="search-input"
                placeholder="e.g. Lost Cause Inc, old@example.com, 987..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {setSearchTerm(''); setIsSearchOpen(false);}}>Clear & Close</AlertDialogCancel>
              <AlertDialogAction onClick={() => setIsSearchOpen(false)}>Apply</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
