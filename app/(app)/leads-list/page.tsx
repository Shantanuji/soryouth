
'use client';
import React, { useState, useMemo, useEffect, useTransition, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { LeadsTable } from '@/app/(app)/leads/leads-table';
import { DROP_REASON_OPTIONS } from '@/lib/constants';
import { Loader2, ListChecks, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LeadForm } from '@/app/(app)/leads/lead-form';
import { SettingsDialog } from '@/app/(app)/settings/settings-dialog';
import { useToast } from "@/hooks/use-toast";
import type { Lead, User, LeadStatusType, StatusFilterItem, LeadSortConfig, CreateLeadData, UserOptionType, LeadSourceOptionType, DropReasonType, CustomSetting } from '@/types';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, startOfDay, isSameDay, isValid } from 'date-fns';
import { getLeads, createLead, updateLead, deleteLead, bulkUpdateLeads, bulkDropLeads, importLeads } from './actions';
import { getUsers } from '@/app/(app)/users/actions';
import { getLeadStatuses, getLeadSources } from '@/app/(app)/settings/actions';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormMessage, FormField, FormItem } from '@/components/ui/form';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const formatDate = (dateString?: string | null) => {
  if (!dateString) return '-';
  try {
    const date = parseISO(dateString);
    if (isValid(date)) {
      return format(date, 'dd-MM-yyyy');
    }
    return dateString;
  } catch (e) {
    return dateString;
  }
};

const allColumns: Record<string, string> = {
    name: 'Contact Info',
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
        if (result.success && result.createdCount !== 0) {
            toast({
                title: "Import Complete",
                description: result.message,
                duration: 10000,
            });
            // If there's a file with skipped rows, trigger download
            if (result.skippedFile) {
                const byteCharacters = atob(result.skippedFile);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'skipped_leads.xlsx';
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
            }
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeadForView, setSelectedLeadForView] = useState<Lead | null>(null);

  const { toast } = useToast();
  
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
        if (result == null) {
          toast({title: "Error", description: "Failed to update lead.", variant: "destructive" })
        } else if ('error' in result) {
          toast({title: "Error", description: result.error, variant: "destructive" })
        } else if (result) {
          await refreshData();
          toast({ title: "Lead Updated", description: `${result.name}'s information has been updated.` });
        } else {
          toast({ title: "Error", description: "Failed to update lead.", variant: "destructive" });
        }
      } else { // New lead
        result = await createLead(leadData as CreateLeadData);
        if ('error' in result) {
          toast({ title: "Error", description: result.error, variant: "destructive" });
        } else if (result) {
          await refreshData();
          toast({ title: "Lead Added", description: `${result.name} has been added to leads.` });
        }
      }
      if (result && !('error' in result)) {
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
    let activeLeads = leads;
    if (userFilter !== 'all') {
        activeLeads = leads.filter(lead => lead.assignedTo === userFilter);
    }
    if (sourceFilter !== 'all'){
      activeLeads = activeLeads.filter(lead => lead.source === sourceFilter);
    }
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
  }, [leads, statuses, userFilter, sourceFilter]);

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
          <div className="flex flex-wrap items-center gap-3">
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
                        <Button variant="outline" size="sm" className="gap-1.5">
                          <i className="ri ri-filter-3-line" /> Filter
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
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setIsSearchOpen(true)}>
                    <i className="ri ri-search-line" /> Search
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setIsImportDialogOpen(true)}>
                    <i className="ri ri-upload-2-line" /> Upload
                    </Button>
                </>
            )}
            <Button size="sm" className="gap-1.5" onClick={handleAddLead} disabled={isPending}>
              <i className="ri ri-add-line" /> Add Lead
            </Button>
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="topbar-icon-btn">
                    <i className="ri ri-settings-3-line text-lg" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>View Options</DropdownMenuLabel>
                     <DropdownMenuItem onSelect={() => setIsSettingsDialogOpen(true)}>Customize Settings</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <i className="ri ri-layout-column-line mr-2" />
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
                            <i className="ri ri-layout-row-line mr-2" />
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
      <div className="mb-6">
        <div className="flex flex-nowrap overflow-x-auto gap-1 bg-muted/50 p-1.5 rounded-xl border hide-scrollbar">
          {statusFilters.map(filter => (
            <button
              key={filter.value}
              onClick={() => handleFilterChange({ status: filter.value })}
              className={`
                flex items-center gap-2 px-4 py-2 text-sm font-semibold whitespace-nowrap rounded-lg transition-all
                ${activeFilter === filter.value
                  ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-900/5'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }
              `}
            >
              {filter.label}
              <span className={`
                text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none
                ${activeFilter === filter.value ? 'bg-white/20 text-white' : 'bg-muted-foreground/15 text-muted-foreground'}
              `}>
                {filter.count}
              </span>
            </button>
          ))}
        </div>
      </div>
      
      <LeadsTable
        items={paginatedLeads}
        onEdit={(item) => { setSelectedLeadForEdit(item as Lead); setIsFormOpen(true); }}
        onViewDetails={(item) => setSelectedLeadForView(item as Lead)}
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

       {/* Pagination — Dhonu style */}
       <div className="flex items-center justify-between pt-4">
        <div className="text-xs text-muted-foreground font-medium">
          Showing {paginatedLeads.length} of {allFilteredLeads.length} leads.
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => handleFilterChange({ page: currentPage - 1 })}
            disabled={currentPage === 1}
            className="topbar-icon-btn disabled:opacity-40"
          >
            <i className="ri ri-arrow-left-s-line text-lg" />
          </button>
          <button
            onClick={() => handleFilterChange({ page: currentPage + 1 })}
            disabled={currentPage >= totalPages}
            className="topbar-icon-btn disabled:opacity-40"
          >
            <i className="ri ri-arrow-right-s-line text-lg" />
          </button>
        </div>
      </div>

      <BulkImportDialog 
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onImportSuccess={refreshData}
      />

      <Dialog open={!!selectedLeadForView} onOpenChange={(open) => !open && setSelectedLeadForView(null)}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Lead Quick View</DialogTitle>
          </DialogHeader>
          {selectedLeadForView && (
            <div className="py-2">
              <h3 className="text-2xl font-bold text-primary mb-1">{selectedLeadForView.name}</h3>
              <div className="flex gap-4 text-sm text-muted-foreground mb-6">
                {selectedLeadForView.phone && <span className="flex items-center gap-1.5"><i className="ri-phone-fill text-primary" /> {selectedLeadForView.phone}</span>}
                {selectedLeadForView.email && <span className="flex items-center gap-1.5"><i className="ri-mail-fill text-primary" /> {selectedLeadForView.email}</span>}
              </div>

              <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline hover:text-primary">Project Requirements</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm p-2 bg-muted/30 rounded-lg border">
                      <div>
                        <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider mb-1">Stage</span>
                        <Badge variant="outline" className="bg-background">{selectedLeadForView.status}</Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider mb-1">Priority</span>
                        <span className="font-medium">{selectedLeadForView.priority || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider mb-1">Source</span>
                        <span className="font-medium">{selectedLeadForView.source || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider mb-1">System Size (kW)</span>
                        <span className="font-medium">{selectedLeadForView.kilowatt ? `${selectedLeadForView.kilowatt} kW` : '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider mb-1">Assigned To</span>
                        <span className="font-medium">{selectedLeadForView.assignedTo || '-'}</span>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline hover:text-primary">Latest Activity</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 text-sm p-2 bg-muted/30 rounded-lg border">
                      <div>
                        <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider mb-1">Next Follow-up</span>
                        <span className="font-medium">{selectedLeadForView.nextFollowUpDate ? `${formatDate(selectedLeadForView.nextFollowUpDate)} ${selectedLeadForView.nextFollowUpTime || ''}` : '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider mb-1">Last Comment</span>
                        <p className="whitespace-pre-wrap font-medium">{selectedLeadForView.lastCommentText || 'No comments yet.'}</p>
                        {selectedLeadForView.lastCommentDate && <span className="text-[10px] text-muted-foreground block mt-1">{formatDate(selectedLeadForView.lastCommentDate)}</span>}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}
          <DialogFooter className="flex sm:justify-between items-center mt-4">
             <Button variant="outline" asChild className="mr-auto">
                <Link href={`/leads/${selectedLeadForView?.id}?${searchParams.toString()}`}>View Full Profile</Link>
             </Button>
             <div className="flex gap-2">
               <Button variant="secondary" onClick={() => setSelectedLeadForView(null)}>Close</Button>
               <Button onClick={() => {
                 const lead = selectedLeadForView;
                 setSelectedLeadForView(null);
                 setTimeout(() => {
                   setSelectedLeadForEdit(lead);
                   setIsFormOpen(true);
                 }, 150);
               }}>Edit Lead</Button>
             </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
