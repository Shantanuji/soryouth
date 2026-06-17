
'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Proposal, Client, Lead, ClientType, DroppedLead } from '@/types';
import { FileText, PlusCircle, User, Building, Home, Briefcase, Rows, IndianRupee, Loader2, Search, UserX, Filter as FilterIcon,  ArrowUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { getActiveClients, getInactiveClients } from '@/app/(app)/clients-list/actions';
import { getLeads } from '@/app/(app)/leads-list/actions';
import { getDroppedLeads } from '@/app/(app)/dropped-leads-list/actions';
import { getAllProposals, createOrUpdateProposal } from './actions';
import { TemplateSelectionDialog } from './template-selection-dialog';
import { Badge } from '@/components/ui/badge';
import { ProposalForm } from './proposal-form';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu';

type Customer = (Client | Lead | DroppedLead) & { isDropped?: boolean; isInactive?: boolean };
type SortOption = 'newest' | 'oldest' | 'value_high' | 'value_low' | 'name_asc';

interface CustomerProposalGroup {
  details: Customer;
  proposals: Proposal[];
  totalValue: number;
  lastProposalDate: string;
}

const CustomerTypeIcon = ({ type, isDropped }: { type: ClientType, isDropped?: boolean }) => {
  if (isDropped) {
    return <UserX className="h-5 w-5 text-destructive" />;
  }
  switch (type) {
    case 'Individual/Bungalow': return <Home className="h-5 w-5 text-muted-foreground" />;
    case 'Housing Society': return <Building className="h-5 w-5 text-muted-foreground" />;
    case 'Commercial': return <Briefcase className="h-5 w-5 text-muted-foreground" />;
    case 'Industrial': return <Briefcase className="h-5 w-5 text-primary" />;
    default: return <User className="h-5 w-5 text-muted-foreground" />;
  }
};

export default function ProposalsListPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [inactiveClients, setInactiveClients] = useState<Client[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [droppedLeads, setDroppedLeads] = useState<DroppedLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isBatchTemplateDialogOpen, setIsBatchTemplateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('newest');

  const [pageSize, setPageSize] = useState(16);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = async () => {
    setIsLoading(true);
    const [fetchedClients, fetchedInactiveClients, fetchedLeads, fetchedProposals, fetchedDroppedLeads] = await Promise.all([
      getActiveClients(),
      getInactiveClients(),
      getLeads(),
      getAllProposals(),
      getDroppedLeads(),
    ]);
    setClients(fetchedClients);
    setInactiveClients(fetchedInactiveClients);
    setLeads(fetchedLeads);
    setProposals(fetchedProposals);
    setDroppedLeads(fetchedDroppedLeads);
    setIsLoading(false);
  };
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const customerProposalGroups = useMemo(() => {
    const customerMap = new Map<string, Customer>();
    clients.forEach(c => customerMap.set(c.id, { ...c, isDropped: false, isInactive: false }));
    inactiveClients.forEach(c => customerMap.set(c.id, { ...c, isDropped: false, isInactive: true }));
    leads.forEach(l => customerMap.set(l.id, { ...l, isDropped: false, isInactive: false }));
    droppedLeads.forEach(d => customerMap.set(d.id, { ...d, isDropped: true, isInactive: false }));

    const groups = new Map<string, CustomerProposalGroup>();

    proposals.forEach(p => {
      const customerId = p.clientId || p.leadId || p.droppedLeadId;
      if (!customerId) return;

      const customerDetails = customerMap.get(customerId);
      if (!customerDetails) return;
      
      // Filtering based on search term
      if (searchTerm && !customerDetails.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return;
      }

      let group = groups.get(customerId);

      if (!group) {
        group = {
          details: customerDetails,
          proposals: [],
          totalValue: 0,
          lastProposalDate: p.createdAt
        };
        groups.set(customerId, group);
      }

      group.proposals.push(p);
      group.totalValue += p.finalAmount;
      if (new Date(p.createdAt) > new Date(group.lastProposalDate)) {
        group.lastProposalDate = p.createdAt;
      }
    });

const sortedGroups = Array.from(groups.values()).sort((a,b) => {
        switch (sortOption) {
            case 'oldest':
                return new Date(a.lastProposalDate).getTime() - new Date(b.lastProposalDate).getTime();
            case 'value_high':
                return b.totalValue - a.totalValue;
            case 'value_low':
                return a.totalValue - b.totalValue;
            case 'name_asc':
                return a.details.name.localeCompare(b.details.name);
            case 'newest':
            default:
                return new Date(b.lastProposalDate).getTime() - new Date(a.lastProposalDate).getTime();
        }
    });
    return sortedGroups;
  }, [proposals, clients, inactiveClients, leads, droppedLeads, searchTerm, sortOption]);

   const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return customerProposalGroups.slice(start, end);
  }, [customerProposalGroups, currentPage, pageSize]);

  const totalPages = Math.ceil(customerProposalGroups.length / pageSize);
  
  const handleCreateNewProposal = () => {
    setIsTemplateDialogOpen(true);
  };

  const handleTemplateSelected = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setIsTemplateDialogOpen(false);
    setIsFormOpen(true);
  };
  
  const handleBatchTemplateSelected = (templateId: string) => {
    setIsBatchTemplateDialogOpen(false);
    router.push(`/proposals/batch?templateId=${templateId}`);
  };

  const handleFormSubmit = async (data: Partial<Proposal>) => {
    const result = await createOrUpdateProposal(data);
    if (result) {
        toast({ title: 'Success', description: `Proposal ${result.proposalNumber} has been created.` });
        setIsFormOpen(false);
        fetchData(); // Refresh all data
    } else {
        toast({ title: 'Error', description: 'Failed to create the proposal.', variant: 'destructive' });
    }
  };

  const getCustomerDetailLink = (details: Customer) => {
      if ('dropReason' in details) return `/dropped-leads/${details.id}`;
      // Check for lead-specific property that isn't on a client
      if ('nextFollowUpDate' in details && !details.isInactive) return `/leads/${details.id}`; 
      return `/clients/${details.id}`;
  };

  return (
    <>
      <PageHeader
        title="Customer Proposals"
        description="View all customers with proposals. Each card summarizes all proposals for that customer."
        icon={FileText}
        actions={
          <div className="flex flex-wrap gap-1 items-center">
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search customers..."
                className="pl-8 sm:w-[250px] lg:w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" >
                        <ArrowUpDown className="mr-2 h-4 w-4" /> Sort
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Sort Customers By</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
                        <DropdownMenuRadioItem value="newest">Latest First</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="oldest">Oldest First</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="value_high">Value (High-Low)</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="value_low">Value (Low-High)</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="name_asc">Name (A-Z)</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>
             <Button variant="outline" onClick={() => setIsBatchTemplateDialogOpen(true)}>
                <Rows className="mr-2 h-4 w-4" /> Batch Proposals
            </Button>
            <Button onClick={handleCreateNewProposal}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Proposal
            </Button>
          </div>
        }
      />
      {isLoading ? (
         <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : customerProposalGroups.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 mb-2" />
            <p>No proposals found.</p>
             <p className="text-sm">{searchTerm ? `No customers match your search for "${searchTerm}".` : "Start by creating a new proposal."}</p>
          </CardContent>
        </Card>
      ) : (
        <>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paginatedGroups.map(({ details, proposals: customerProposals, totalValue, lastProposalDate }) => {
            const customerType = 'dropReason' in details ? 'lead' : 'client';
            const link = `/proposals/${details.id}`;
            
            let badgeVariant: 'softDestructive' | 'softWarning' | 'softPrimary' | 'softInfo' = 'softPrimary';
            if (details.isDropped) badgeVariant = 'softDestructive';
            else if (details.isInactive) badgeVariant = 'softWarning';
            else if (customerType === 'lead') badgeVariant = 'softInfo';

            return (
              <Link href={link} key={details.id}>
                <Card className="flex flex-col border border-border/80 shadow-sm rounded-xl overflow-hidden hover:shadow-md hover:border-primary/40 transition-all duration-200 h-full">
                  <CardHeader className="flex flex-row items-start justify-between pb-3 pt-4 px-4 gap-3">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CustomerTypeIcon type={details.clientType as ClientType} isDropped={details.isDropped} />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-foreground line-clamp-1">{details.name}</CardTitle>
                        <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
                          {customerProposals.length} proposal{customerProposals.length > 1 ? 's' : ''}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={badgeVariant} className="text-[10px] py-0 px-2 font-semibold capitalize shrink-0">
                      {details.isDropped ? 'Dropped' : details.isInactive ? 'Inactive' : customerType === 'client' ? 'Client' : 'Lead'}
                    </Badge>
                  </CardHeader>
                  <CardContent className="flex-grow pt-0 pb-4 px-4 flex flex-col justify-end">
                    <div className="flex items-baseline gap-1">
                      <span className="text-[11px] text-muted-foreground font-medium">Total Value:</span>
                      <span className="text-base font-extrabold text-primary flex items-center">
                        <IndianRupee className="h-3.5 w-3.5 mr-0.5" />
                        {totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Last proposal: {format(parseISO(lastProposalDate), 'dd MMM, yyyy')}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
        <div className="flex items-center justify-between pt-6">
            <div className="text-sm text-muted-foreground">
              Showing {paginatedGroups.length} of {customerProposalGroups.length} customers.
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
      
      <TemplateSelectionDialog
        isOpen={isTemplateDialogOpen}
        onClose={() => setIsTemplateDialogOpen(false)}
        onSelect={handleTemplateSelected}
      />

      <TemplateSelectionDialog
        isOpen={isBatchTemplateDialogOpen}
        onClose={() => setIsBatchTemplateDialogOpen(false)}
        onSelect={handleBatchTemplateSelected}
      />
      
      {isFormOpen && (
         <ProposalForm
          isOpen={isFormOpen}
          onClose={() => { setIsFormOpen(false); setSelectedTemplateId(null); }}
          onSubmit={handleFormSubmit}
          templateId={selectedTemplateId}
          clients={clients}
          leads={leads}
        />
      )}
    </>
  );
}
