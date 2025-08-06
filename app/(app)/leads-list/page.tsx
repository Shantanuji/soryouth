
'use client';
import React, { useState, useMemo, useEffect, useTransition, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { LeadsTable } from '@/app/(app)/leads/leads-table';
import { DROP_REASON_OPTIONS } from '@/lib/constants';
import { Loader2, Filter, Search, Upload, PlusCircle, Settings2, ListChecks, ListFilter, Rows, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LeadForm } from '@/app/(app)/leads/lead-form';
import { SettingsDialog } from '@/app/(app)/settings/settings-dialog';
import { useToast } from "@/hooks/use-toast";
import type { Lead, User, LeadStatusType, StatusFilterItem, LeadSortConfig, CreateLeadData, UserOptionType, LeadSourceOptionType, DropReasonType, CustomSetting } from '@/types';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, startOfDay, isSameDay } from 'date-fns';
import { getLeads, createLead, updateLead, deleteLead, bulkUpdateLeads, bulkDropLeads, importLeads } from './actions';
import { getUsers } from '@/app/(app)/users/actions';
import { getLeadStatuses, getLeadSources } from '@/app/(app)/settings/actions';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormMessage, FormField, FormItem } from '@/components/ui/form';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';


const allColumns: Record<string, string> = {
    email: 'Email',
    phone: 'Mobile No.',
    status: 'Stage',
    lastCommentText: 'Last Comment',
    nextFollowUpDate: 'Next Follow-up',
    followupCount: 'Followups',
    calls: 'Calls',
    kilowatt: 'Kilowatt',
    source: 'Source',
    priority: 'Priority',
    assignedTo: 'Assigned To',
};

const dropLeadSchema = z.object({
  dropReason: z.enum(DROP_REASON_OPTIONS, { required_error: "Drop reason is required." }),
  dropComment: z.string().optional(),
});
type DropLeadFormValues = z.infer<typeof dropLeadSchema>;

function BulkImportDialog({ isOpen, onClose, onImportSuccess }: { isOpen: boolean, onClose: () => void, onImportSuccess: () => void }) {
  const [isUploading, startUploadTransition] = useTransition();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile) {
        if (uploadedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || uploadedFile.type === 'application/vnd.ms-excel') {
            setFile(uploadedFile);
        } else {
            toast({ title: "Invalid File Type", description: "Please upload a .xlsx file.", variant: "destructive" });
        }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({ title: "No File Selected", description: "Please select a file to upload.", variant: "destructive" });
      return;
    }

    startUploadTransition(async () => {
        const formData = new FormData();
        formData.append('file', file);
        
        const result = await importLeads(formData);
        
        if (result.success) {
            toast({
                title: "Import Successful",
                description: result.message,
            });
            onImportSuccess();
            onClose();
        } else {
            toast({
                title: "Import Failed",
                description: result.message,
                variant: "destructive",
            });
        }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Bulk Import Data</DialogTitle>
                <DialogDescription>Select an Excel (.xlsx) file to import leads data.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="import-file">Upload File</Label>
                    <Input id="import-file" type="file" accept=".xlsx" onChange={handleFileChange} />
                </div>
                <a href="/api/leads/download-template" download="lead_import_template.xlsx" className="text-sm text-primary hover:underline">
                    Click here to download excel import format.
                </a>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={onClose} disabled={isUploading}>Cancel</Button>
                <Button onClick={handleUpload} disabled={isUploading || !file}>
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    Upload Data
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}

export default function LeadsListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [statuses, setStatuses] = useState<CustomSetting[]>([]);
  const [sources, setSources] = useState<CustomSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedLeadForEdit, setSelectedLeadForEdit] = useState<Lead | null>(null);
  const { toast } = useToast();
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const [sortConfig, setSortConfig] = useState<LeadSortConfig | null>(null);
  const [isPending, startTransition] = useTransition();

  // Read state from URL
  const currentPage = Number(searchParams.get('page')) || 1;
  const activeFilter = searchParams.get('status') || 'all';
  const quickFilter = searchParams.get('quickFilter') || 'Show all';
  const userFilter = searchParams.get('user') || 'all';
  const sourceFilter = searchParams.get('source') || 'all';
  const searchTerm = searchParams.get('search') || '';
  const pageSize = Number(searchParams.get('pageSize')) || 10;

  // State for bulk actions
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isAssignDialogOpen, setAssignDialogOpen] = useState(false);
  const [isStageDialogOpen, setStageDialogOpen] = useState(false);
  const [isSourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [isDropDialogOpen, setDropDialogOpen] = useState(false);
  const [assignToUser, setAssignToUser] = useState<string>('');
  const [updateStageTo, setUpdateStageTo] = useState<LeadStatusType | ''>('');
  const [updateSourceTo, setUpdateSourceTo] = useState<LeadSourceOptionType | ''>('');

  const dropForm = useForm<DropLeadFormValues>({
    resolver: zodResolver(dropLeadSchema),
  });

  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    email: true,
    phone: true,
    status: true,
    lastCommentText: true,
    nextFollowUpDate: true,
    followupCount: true,
    calls: false,
    kilowatt: true,
    source: false,
    priority: true,
    assignedTo: true,
  });

  const refreshData = async () => {
    const [fetchedLeads, fetchedUsers, fetchedStatuses, fetchedSources] = await Promise.all([
      getLeads(),
      getUsers(),
      getLeadStatuses(),
      getLeadSources()
    ]);
    const activeLeads = fetchedLeads.filter(lead => lead.status !== 'Lost');
    setLeads(activeLeads);
    setUsers(fetchedUsers);
    setStatuses(fetchedStatuses);
    setSources(fetchedSources);
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

  const handleAddLead = () => {
    setSelectedLeadForEdit(null);
    setIsFormOpen(true);
  };
  
  const handleFormSubmit = async (leadData: CreateLeadData | Lead) => {
    startTransition(async () => {
      let result;
      if ('id' in leadData && leadData.id) { // Existing lead
        result = await updateLead(leadData.id, leadData as Partial<Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>>);
        if (result) {
          await refreshData();
          toast({ title: "Lead Updated", description: `${result.name}'s information has been updated.` });
        } else {
          toast({ title: "Error", description: "Failed to update lead.", variant: "destructive" });
        }
      } else { // New lead
        result = await createLead(leadData as CreateLeadData);
        if (result) {
          await refreshData();
          toast({ title: "Lead Added", description: `${result.name} has been added to leads.` });
        } else {
          toast({ title: "Error", description: "Failed to create lead.", variant: "destructive" });
        }
      }
      if (result) {
        setIsFormOpen(false);
        setSelectedLeadForEdit(null);
      }
    });
  };

  const handleDeleteLead = async (leadId: string) => {
    startTransition(async () => {
      const { success } = await deleteLead(leadId);
      if (success) {
        setLeads(prev => prev.filter(l => l.id !== leadId));
        toast({ title: "Lead Deleted" });
      } else {
        toast({ title: "Error", description: "Failed to delete lead.", variant: "destructive" });
      }
    });
  };
  
  const statusFilters = useMemo((): StatusFilterItem[] => {
    const activeLeads = leads;
    const counts: Record<string, number> = {};
    
    statuses.forEach(status => counts[status.name] = 0);
    
    activeLeads.forEach(lead => {
      if (counts[lead.status] !== undefined) {
        counts[lead.status]++;
      }
    });

    const filters: StatusFilterItem[] = [{ label: 'Show all', count: activeLeads.length, value: 'all' }];
    
    statuses.forEach(status => {
       filters.push({ label: status.name, count: counts[status.name] || 0, value: status.name });
    });

    return filters;
  }, [leads, statuses]);

  const allFilteredLeads = useMemo(() => {
    let leadsToDisplay = [...leads];
    
    if (activeFilter !== 'all') {
      leadsToDisplay = leadsToDisplay.filter(lead => lead.status === activeFilter);
    }
    
    const today = startOfDay(new Date());
    switch(quickFilter) {
      case 'Assigned today':
        leadsToDisplay = leadsToDisplay.filter(lead => isSameDay(parseISO(lead.createdAt), today));
        break;
      case 'Followed today':
        leadsToDisplay = leadsToDisplay.filter(lead => {
            if (!lead.lastCommentDate) return false;
            const [day, month, year] = lead.lastCommentDate.split('-').map(Number);
            return isSameDay(new Date(year, month - 1, day), today);
        });
        break;
      case 'Not followed today':
        leadsToDisplay = leadsToDisplay.filter(lead => {
            if (!lead.lastCommentDate) return true;
            const [day, month, year] = lead.lastCommentDate.split('-').map(Number);
            return !isSameDay(new Date(year, month - 1, day), today);
        });
        break;
      case 'Unattended':
        leadsToDisplay = leadsToDisplay.filter(lead => !lead.assignedTo);
        break;
      case 'No stage':
        leadsToDisplay = leadsToDisplay.filter(lead => lead.status === 'Fresher' || lead.status === 'New');
        break;
      case 'Show all':
      default:
        break;
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
        
        if (sortConfig.key === 'nextFollowUpDate') {
          const dateA = aValue ? parseISO(aValue as string).getTime() : 0;
          const dateB = bValue ? parseISO(bValue as string).getTime() : 0;
          if (dateA < dateB) return sortConfig.direction === 'ascending' ? -1 : 1;
          if (dateA > dateB) return sortConfig.direction === 'ascending' ? 1 : -1;
          return 0;
        }
        
        if (sortConfig.key === 'kilowatt') {
           if (Number(aValue) < Number(bValue)) return sortConfig.direction === 'ascending' ? -1 : 1;
           if (Number(aValue) > Number(bValue)) return sortConfig.direction === 'ascending' ? 1 : -1;
           return 0;
        }

        if (String(aValue).toLowerCase() < String(bValue).toLowerCase()) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (String(aValue).toLowerCase() > String(bValue).toLowerCase()) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return leadsToDisplay;
  }, [leads, activeFilter, sortConfig, quickFilter, searchTerm, userFilter, sourceFilter]);

  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return allFilteredLeads.slice(start, end);
  }, [allFilteredLeads, currentPage, pageSize]);

  const totalPages = Math.ceil(allFilteredLeads.length / pageSize);

  const requestSort = (key: keyof Lead) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const handleBulkUpdate = (action: 'assign' | 'stage' | 'source') => {
    startTransition(async () => {
        let data = {};
        let successMessage = '';
        if (action === 'assign' && assignToUser) {
            data = { assignedTo: assignToUser };
            successMessage = `Assigned to ${assignToUser}.`;
        } else if (action === 'stage' && updateStageTo) {
            data = { status: updateStageTo };
            successMessage = `Stage updated to ${updateStageTo}.`;
        } else if (action === 'source' && updateSourceTo) {
            data = { source: updateSourceTo };
            successMessage = `Source updated to ${updateSourceTo}.`;
        } else {
            toast({ title: "No Selection", description: "Please select a value.", variant: "destructive" });
            return;
        }

        const result = await bulkUpdateLeads(selectedLeadIds, data);
        if (result.success) {
            toast({ title: "Bulk Update Successful", description: `${result.count} leads updated. ${successMessage}` });
            await refreshData();
            setSelectedLeadIds([]);
            setAssignDialogOpen(false);
            setStageDialogOpen(false);
            setSourceDialogOpen(false);
        } else {
            toast({ title: "Error", description: result.message || "Failed to update leads.", variant: "destructive" });
        }
    });
  };
  
  const handleBulkDrop = (values: DropLeadFormValues) => {
    startTransition(async () => {
        const result = await bulkDropLeads(selectedLeadIds, values.dropReason, values.dropComment);
        if (result.success) {
            toast({ title: "Bulk Drop Successful", description: `${result.count} leads were dropped.` });
            await refreshData();
            setSelectedLeadIds([]);
            setDropDialogOpen(false);
            dropForm.reset();
        } else {
            toast({ title: "Error", description: result.message || "Failed to drop leads.", variant: "destructive" });
        }
    });
  };

  if (isLoading) {
    return (
      <PageHeader
        title="Active Leads"
        description="Manage all active leads in the pipeline."
        icon={ListChecks}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Active Leads"
        description="Manage all active leads in the pipeline."
        icon={ListChecks}
        actions={
          <div className="flex items-center gap-2">
            {selectedLeadIds.length > 0 ? (
                 <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">{selectedLeadIds.length} selected</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          Actions <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setAssignDialogOpen(true)}>Assign leads</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setStageDialogOpen(true)}>Update stage</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setSourceDialogOpen(true)}>Update source</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setDropDialogOpen(true)}>Drop leads</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled>Send SMS</DropdownMenuItem>
                        <DropdownMenuItem disabled>Send Whatsapp</DropdownMenuItem>
                        <DropdownMenuItem disabled>Send Email</DropdownMenuItem>
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
                        {['Assigned today', 'Followed today', 'Not followed today', 'Unattended', 'No stage', 'Show all'].map(item => (
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
                    <Button variant="outline" size="sm" onClick={() => setIsImportDialogOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" /> Upload
                    </Button>
                </>
            )}
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleAddLead} disabled={isPending}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Lead
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
                                            setColumnVisibility((prev) => ({
                                                ...prev,
                                                [key]: !!value,
                                            }))
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
                                <DropdownMenuRadioGroup 
                                  value={String(pageSize)} 
                                  onValueChange={(value) => handleFilterChange({ pageSize: Number(value) })}>
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
        items={paginatedLeads}
        onEdit={(item) => { setSelectedLeadForEdit(item as Lead); setIsFormOpen(true); }}
        onDelete={handleDeleteLead}
        sortConfig={sortConfig}
        requestSort={requestSort as (key: keyof Lead) => void}
        viewType="active"
        columnVisibility={columnVisibility}
        selectedIds={selectedLeadIds}
        setSelectedIds={setSelectedLeadIds}
        allFilteredIds={allFilteredLeads.map(l => l.id)}
        currentPage={currentPage}
      />

       <div className="flex items-center justify-between pt-4">
        <div className="text-sm text-muted-foreground">
          Showing {paginatedLeads.length} of {allFilteredLeads.length} leads.
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleFilterChange({ page: currentPage - 1 })}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleFilterChange({ page: currentPage + 1 })}
            disabled={currentPage >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      <BulkImportDialog 
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onImportSuccess={refreshData}
      />

      {isFormOpen && (
        <LeadForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleFormSubmit}
          lead={selectedLeadForEdit}
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
            refreshData();
          }}
          settingTypes={[
            { title: 'Lead Stages', type: 'LEAD_STATUS' },
            { title: 'Lead Sources', type: 'LEAD_SOURCE' },
          ]}
        />
       )}
       {isSearchOpen && (
        <AlertDialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Search Leads</AlertDialogTitle>
              <AlertDialogDescription>
                Search by name, email, or phone number.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="search-input" className="sr-only">Search</Label>
              <Input 
                id="search-input"
                placeholder="e.g. John Doe, john@example.com, 987..."
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
                  <DialogTitle>Assign Selected Leads</DialogTitle>
                  <DialogDescription>Assign the {selectedLeadIds.length} selected leads to a user.</DialogDescription>
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
                  <DialogTitle>Update Stage for Selected Leads</DialogTitle>
                  <DialogDescription>Change the stage for the {selectedLeadIds.length} selected leads.</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                  <Label htmlFor="update-stage">New Stage</Label>
                  <Select value={updateStageTo} onValueChange={(v) => setUpdateStageTo(v as LeadStatusType)}>
                      <SelectTrigger><SelectValue placeholder="Select a stage" /></SelectTrigger>
                      <SelectContent>
                          {statuses.map(stage => <SelectItem key={stage.id} value={stage.name}>{stage.name}</SelectItem>)}
                      </SelectContent>
                  </Select>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setStageDialogOpen(false)}>Cancel</Button>
                  <Button onClick={() => handleBulkUpdate('stage')} disabled={isPending || !updateStageTo}>Update</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

       <Dialog open={isSourceDialogOpen} onOpenChange={setSourceDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Update Source for Selected Leads</DialogTitle>
                  <DialogDescription>Change the source for the {selectedLeadIds.length} selected leads.</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                  <Label htmlFor="update-source">New Source</Label>
                  <Select value={updateSourceTo} onValueChange={(v) => setUpdateSourceTo(v as LeadSourceOptionType)}>
                      <SelectTrigger><SelectValue placeholder="Select a source" /></SelectTrigger>
                      <SelectContent>
                          {sources.map(source => <SelectItem key={source.id} value={source.name}>{source.name}</SelectItem>)}
                      </SelectContent>
                  </Select>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setSourceDialogOpen(false)}>Cancel</Button>
                  <Button onClick={() => handleBulkUpdate('source')} disabled={isPending || !updateSourceTo}>Update</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <Dialog open={isDropDialogOpen} onOpenChange={setDropDialogOpen}>
        <DialogContent>
          <Form {...dropForm}>
            <form onSubmit={dropForm.handleSubmit(handleBulkDrop)}>
              <DialogHeader>
                <DialogTitle>Drop Selected Leads</DialogTitle>
                <DialogDescription>
                  You are about to drop {selectedLeadIds.length} leads. Select a reason.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <FormField control={dropForm.control} name="dropReason"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Reason *</Label>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a drop reason" /></SelectTrigger></FormControl>
                        <SelectContent>{DROP_REASON_OPTIONS.map(reason => <SelectItem key={reason} value={reason}>{reason}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={dropForm.control} name="dropComment"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Comment (Optional)</Label>
                      <FormControl><Textarea placeholder="Add an optional comment..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setDropDialogOpen(false)} disabled={isPending}>Cancel</Button>
                <Button type="submit" variant="destructive" disabled={isPending}>Drop Leads</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
