
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenuSeparator, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ProposalForm } from '../proposal-form';
import { ProposalPreviewDialog } from '../proposal-preview-dialog';
import type { Proposal, Client, Lead, DroppedLead } from '@/types';
import { FileText, IndianRupee, Loader2, ArrowLeft, MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import { getProposalsForClient, getProposalsForLead, createOrUpdateProposal, deleteProposal } from '../actions';
import { getClientById } from '@/app/(app)/clients-list/actions';
import { getLeadById } from '@/app/(app)/leads-list/actions';
import { getDroppedLeadById } from '@/app/(app)/dropped-leads-list/actions';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

type Customer = Client | Lead | DroppedLead;

export default function CustomerProposalsPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = typeof params.clientId === 'string' ? params.clientId : '';
  const { toast } = useToast();

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, startDeleteTransition] = useTransition();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFormSubmitting, startFormTransition] = useTransition();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    let cust: Customer | null = await getClientById(customerId);
    let fetchedProposals: Proposal[] = [];

    if (cust) {
      fetchedProposals = await getProposalsForClient(customerId);
    } else {
      cust = await getLeadById(customerId);
      if (cust) {
        fetchedProposals = await getProposalsForLead(customerId);
      } else {
        cust = await getDroppedLeadById(customerId);
        // Note: Dropped lead proposals are fetched via droppedLeadId field in proposal
        // This might require a new action or updating `getProposalsForLead`
      }
    }
    setCustomer(cust);
    setProposals(fetchedProposals);
    setIsLoading(false);
  };

  useEffect(() => {
    if (customerId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const handleEdit = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setIsFormOpen(true);
  };

  const handleView = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setIsPreviewOpen(true);
  };
  
  const handleDelete = (proposalId: string) => {
    startDeleteTransition(async () => {
        const result = await deleteProposal(proposalId);
        if (result.success) {
            toast({ title: 'Proposal Deleted', description: 'The proposal and its files have been deleted.' });
            fetchData();
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
    });
  };

  const handleFormSubmit = async (data: Partial<Proposal>) => {
    startFormTransition(async () => {
        const result = await createOrUpdateProposal(data);
        if(result) {
            toast({ title: 'Success', description: `Proposal ${result.proposalNumber} has been updated.` });
            setIsFormOpen(false);
            fetchData();
            if(result.pdfUrl) {
                handleView(result);
            }
        } else {
            toast({ title: 'Error', description: 'Failed to save the proposal.', variant: 'destructive' });
        }
    });
  };
  
  const getCustomerDetailLink = () => {
      if (!customer) return '#';
      if ('dropReason' in customer) return `/dropped-leads/${customer.id}`; // Dropped Lead has dropReason
      if ('source' in customer) return `/leads/${customer.id}`; // Lead has source
      return `/clients/${customer.id}`; // Client
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!customer) {
    return (
        <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">Customer Not Found</h2>
            <p className="text-muted-foreground mb-4">Could not find details for this customer.</p>
            <Button onClick={() => router.push('/proposals')}>Back to All Proposals</Button>
        </div>
    )
  }

  return (
    <>
      <PageHeader
        title={`Proposals for ${customer.name}`}
        description={
            <div className="flex items-center gap-2">
                <span>{proposals.length} proposal(s) found.</span>
                <Link href={getCustomerDetailLink()} className={buttonVariants({ variant: 'link', size: 'sm' })}>
                    View Customer Details
                </Link>
            </div>
        }
        icon={FileText}
        actions={
          <Button variant="outline" onClick={() => router.push('/proposals')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
          </Button>
        }
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proposal No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No proposals found for this customer.
                  </TableCell>
                </TableRow>
              ) : (
                proposals.map(proposal => (
                  <TableRow key={proposal.id}>
                    <TableCell className="font-medium">{proposal.proposalNumber}</TableCell>
                    <TableCell>{format(parseISO(proposal.proposalDate), 'dd MMM, yyyy')}</TableCell>
                    <TableCell>{proposal.capacity} kW</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <IndianRupee className="h-4 w-4 mr-0.5" />
                        {proposal.finalAmount.toLocaleString('en-IN')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(proposal)}>
                                <Eye className="mr-2 h-4 w-4" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(proposal)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit & Regenerate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator/>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete proposal "{proposal.proposalNumber}" and its associated files.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(proposal.id)} disabled={isDeleting} className={buttonVariants({ variant: 'destructive'})}>
                                            {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                       </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {isFormOpen && (
        <ProposalForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleFormSubmit}
          proposal={selectedProposal}
          clients={'source' in customer ? [] : [customer as Client]}
          leads={'source' in customer ? [customer as Lead] : []}
        />
      )}
      {/* Note: 'source' is a Lead property. So 'source' in customer => Lead; otherwise => Client */}

      {isPreviewOpen && selectedProposal && (
        <ProposalPreviewDialog
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          pdfUrl={selectedProposal.pdfUrl || null}
          docxUrl={selectedProposal.docxUrl || null}
        />
      )}
    </>
  );
}
