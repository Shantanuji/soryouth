
'use client';

import React, { useEffect, useMemo, useState, useTransition } from 'react';
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/page-header';
import { PlusCircle, Trash2, Rows, Check, ChevronsUpDown, Loader2, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { CLIENT_TYPES, MODULE_TYPES, DCR_STATUSES, MODULE_WATTAGE_OPTIONS } from '@/lib/constants';
import type { Proposal, Client, Lead, ClientType, ModuleType, DCRStatus, ModuleWattage } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormMessage, FormItem } from '@/components/ui/form';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Dialog, DialogHeader, DialogTitle, DialogContent } from '@/components/ui/dialog';
import { ProposalPreviewDialog } from '../proposal-preview-dialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { getActiveClients } from '@/app/(app)/clients-list/actions';
import { getLeads } from '@/app/(app)/leads-list/actions';
import { bulkCreateProposals } from '../actions';
import Link from 'next/link';

const batchRowSchema = z.object({
  id: z.string().optional(),
  customerId: z.string().min(1, { message: 'A customer must be selected.'}),
  customerType: z.enum(['client', 'lead']),
  name: z.string().min(1, 'Name is required.'),
  clientType: z.enum(CLIENT_TYPES),
  contactPerson: z.string().min(1, 'Contact is required.'),
  location: z.string().min(1, 'Location is required.'),
  capacity: z.coerce.number().positive(),
  moduleType: z.enum(MODULE_TYPES),
  moduleWattage: z.enum(MODULE_WATTAGE_OPTIONS),
  dcrStatus: z.enum(DCR_STATUSES),
  inverterRating: z.coerce.number().positive(),
  inverterQty: z.coerce.number().int().positive(),
  ratePerWatt: z.coerce.number().positive(),
  unitRate: z.coerce.number().positive(),
});

const batchProposalsSchema = z.object({
  proposals: z.array(batchRowSchema),
});

type BatchProposalsFormValues = z.infer<typeof batchProposalsSchema>;
type BatchRow = z.infer<typeof batchRowSchema>;
type ProgressState = { name: string; status: 'pending' | 'generating' | 'success' | 'error'; message?: string; generatedProposal?: Partial<Proposal> };

const getDefaultProposalRow = (): Omit<BatchRow, 'customerType' | 'customerId'> => ({
  name: '',
  clientType: CLIENT_TYPES[0],
  contactPerson: '',
  location: '',
  capacity: 0,
  moduleType: MODULE_TYPES[0],
  moduleWattage: MODULE_WATTAGE_OPTIONS[0],
  dcrStatus: DCR_STATUSES[0],
  inverterRating: 0,
  inverterQty: 1,
  ratePerWatt: 0,
  unitRate: 10,
});

const calculateDerivedData = (rowData: BatchRow) => {
    const capacity = parseFloat(String(rowData.capacity)) || 0;
    const ratePerWatt = parseFloat(String(rowData.ratePerWatt)) || 0;
    const clientType = rowData.clientType;
    const unitRate = parseFloat(String(rowData.unitRate)) || 0;
    const inverterQty = parseInt(String(rowData.inverterQty), 10) || 1;
    const dcrStatus = rowData.dcrStatus;
    
    const baseAmount = ratePerWatt * capacity * 1000;
    const cgstAmount = baseAmount * 0.069;
    const sgstAmount = baseAmount * 0.069;
    const finalAmount = baseAmount + cgstAmount + sgstAmount;

    let subsidyAmount = 0;
    if (dcrStatus !== 'Non-DCR') {
        if (clientType === 'Housing Society') subsidyAmount = 18000 * capacity;
        else if (clientType === 'Individual/Bungalow') {
            if (capacity === 1) subsidyAmount = 30000;
            else if (capacity === 2) subsidyAmount = 60000;
            else if (capacity >= 3) subsidyAmount = 78000;
        }
    }
    
    const requiredSpace = capacity * 80;
    const generationPerDay = capacity * 4;
    const generationPerYear = generationPerDay * 365;
    const savingsPerYear = generationPerYear * unitRate;
    const laKitQty = inverterQty * 1;
    const acdbDcdbQty = inverterQty * 1;
    const earthingKitQty = inverterQty * 3;

    return {
        baseAmount, cgstAmount, sgstAmount, subtotalAmount: finalAmount, finalAmount, subsidyAmount,
        requiredSpace, generationPerDay, generationPerYear, unitRate, savingsPerYear, laKitQty, acdbDcdbQty, earthingKitQty,
    };
};

const CustomerCombobox = ({ control, index, customers, onSelect }: { control: any, index: number, customers: (Client | Lead)[], onSelect: (customer: Client | Lead, index: number) => void }) => {
    const [open, setOpen] = useState(false);
    const customerId = useWatch({ control, name: `proposals.${index}.customerId` });
    const selectedCustomer = customers.find(c => c.id === customerId);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <FormControl>
                    <Button variant="outline" role="combobox" className="w-[200px] justify-between h-8 text-xs">
                        {selectedCustomer ? (<span className="truncate">{selectedCustomer.name}</span>) : ("Select Customer...")}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
                <Command>
                    <CommandInput placeholder="Search customer..." />
                    <CommandEmpty>No customer found.</CommandEmpty>
                    <CommandGroup>
                        {customers.map((customer) => (
                            <CommandItem key={customer.id} value={`${customer.name} ${customer.id}`} onSelect={() => { onSelect(customer, index); setOpen(false); }}>
                                <Check className={cn("mr-2 h-4 w-4", customerId === customer.id ? "opacity-100" : "opacity-0")} />
                                <div>
                                    <p>{customer.name}</p>
                                    <p className="text-xs text-muted-foreground">{'dropReason' in customer ? `Lead: ${customer.status}` : `Client: ${customer.status}`}</p>
                                </div>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

const BATCH_PROPOSAL_CACHE_KEY = 'batchProposalFormData';

export default function BatchProposalsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('templateId');
  const { toast } = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isGenerating, startGenerationTransition] = useTransition();
  const [progress, setProgress] = useState<ProgressState[]>([]);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [proposalForPreview, setProposalForPreview] = useState<Partial<Proposal> | null>(null);

  const allCustomers = useMemo(() => [...clients, ...leads].sort((a,b) => a.name.localeCompare(b.name)), [clients, leads]);

  const form = useForm<BatchProposalsFormValues>({
    resolver: zodResolver(batchProposalsSchema),
    defaultValues: { proposals: [] },
  });

  const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: 'proposals' });
  const watchedProposals = useWatch({ control: form.control, name: 'proposals' });
  const watchedClientTypes = useWatch({ control: form.control, name: 'proposals' });
  const overallProgress = progress.length > 0 ? (progress.filter(p => p.status === 'success' || p.status === 'error').length / progress.length) * 100 : 0;

  useEffect(() => {
    if (!templateId) {
      toast({ title: 'No Template Selected', description: 'Please select a template before generating proposals in batch.', variant: 'destructive' });
      router.push('/proposals');
    }
  }, [templateId, router, toast]);

  useEffect(() => {
    async function fetchData() {
        setIsDataLoading(true);
        const [fetchedClients, fetchedLeads] = await Promise.all([getActiveClients(), getLeads()]);
        setClients(fetchedClients);
        setLeads(fetchedLeads);
        
        const cachedData = localStorage.getItem(BATCH_PROPOSAL_CACHE_KEY);
        if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            if (parsedData.proposals && parsedData.proposals.length > 0) {
                 replace(parsedData.proposals);
            }
        } else if (fields.length === 0) {
             append(getDefaultProposalRow() as any);
        }
        setIsDataLoading(false);
    }
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  useEffect(() => {
    if (watchedProposals && !isDataLoading) {
        localStorage.setItem(BATCH_PROPOSAL_CACHE_KEY, JSON.stringify({ proposals: watchedProposals }));
    }
  }, [watchedProposals, isDataLoading]);
  
  useEffect(() => {
    watchedClientTypes.forEach((proposal, index) => {
        const clientType = proposal.clientType;
        let newUnitRate;
        switch (clientType) {
            case 'Individual/Bungalow': newUnitRate = 14; break;
            case 'Housing Society': newUnitRate = 19; break;
            case 'Commercial': case 'Industrial': newUnitRate = 12; break;
            default: newUnitRate = 10; break;
        }
        if (form.getValues(`proposals.${index}.unitRate`) !== newUnitRate) {
            form.setValue(`proposals.${index}.unitRate`, newUnitRate);
        }
    });
  }, [watchedClientTypes, form]);

  const handleCustomerSelect = (customer: Client | Lead, index: number) => {
    const isLead = 'dropReason' in customer? true : false;
    const capacity = customer.kilowatt || 0;
    const clientType = customer.clientType || 'Other';
    
    let unitRate;
    switch (clientType) {
        case 'Individual/Bungalow': unitRate = 14; break;
        case 'Housing Society': unitRate = 19; break;
        case 'Commercial': case 'Industrial': unitRate = 12; break;
        default: unitRate = 10; break;
    }

    form.setValue(`proposals.${index}.customerId`, customer.id);
    form.setValue(`proposals.${index}.customerType`, isLead ? 'lead' : 'client');
    form.setValue(`proposals.${index}.name`, customer.name);
    form.setValue(`proposals.${index}.contactPerson`, customer.name);
    form.setValue(`proposals.${index}.location`, customer.address || '');
    form.setValue(`proposals.${index}.clientType`, clientType);
    form.setValue(`proposals.${index}.capacity`, capacity);
    form.setValue(`proposals.${index}.inverterRating`, capacity);
    form.setValue(`proposals.${index}.unitRate`, unitRate);
  };
  
  const processAllProposals = (data: BatchProposalsFormValues) => {
    startGenerationTransition(async () => {
        toast({ title: "Batch Generation Started", description: `Processing ${data.proposals.length} proposals...` });
        
        const initialProgress = data.proposals.map(p => ({ name: p.name, status: 'generating' as const }));
        setProgress(initialProgress);
        setIsResultDialogOpen(true);
        
        const generationPromises = data.proposals.map(async (row, index) => {
            try {
                const originalCustomer = allCustomers.find(c => c.id === row.customerId);
                const derivedData = calculateDerivedData(row);
    
                const submissionData: Partial<Proposal> = {
                    ...row, ...derivedData,
                    proposalDate: format(new Date(), 'yyyy-MM-dd'),
                    proposalNumber: `P-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000).padStart(5, '0')}`,
                    clientId: row.customerType === 'client' ? row.customerId : undefined,
                    leadId: row.customerType === 'lead' ? row.customerId : undefined,
                    phone: originalCustomer?.phone, email: originalCustomer?.email,
                };
                
                const response = await fetch('/api/proposals/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ templateId, data: submissionData }),
                });
    
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || `Failed to generate for ${row.name}`);

                const generatedProposal = { ...submissionData, pdfUrl: result.pdfUrl, docxUrl: result.docxUrl };
                setProgress(prev => prev.map((p, i) => i === index ? { ...p, status: 'success', generatedProposal } : p));
                return generatedProposal;

            } catch (error) {
                 setProgress(prev => prev.map((p, i) => i === index ? { ...p, status: 'error', message: (error as Error).message } : p));
                 throw error;
            }
        });

        const results = await Promise.allSettled(generationPromises);
        
        const successfulProposals = results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<any>).value);
        
        if (successfulProposals.length > 0) {
            const saveResult = await bulkCreateProposals(successfulProposals);
            if (saveResult.success) {
                toast({ title: "Database Updated", description: `${saveResult.createdProposals.length} proposals saved successfully.`});
                localStorage.removeItem(BATCH_PROPOSAL_CACHE_KEY); // Clear cache on success
            } else {
                toast({ title: "Database Save Failed", description: saveResult.message, variant: "destructive" });
            }
        }
    });
  };

  const handleViewProposal = (proposal: Partial<Proposal>) => {
    setProposalForPreview(proposal);
    setIsPreviewOpen(true);
  };


  if (isDataLoading || !templateId) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /><p className="ml-4">Loading data...</p></div>;

  return (
    <>
      <PageHeader title="Batch Proposal Generation" description="Create multiple proposals efficiently. Financials and subsidies are auto-calculated on generation." icon={Rows} />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(processAllProposals)}>
          <fieldset disabled={isGenerating}>
            <div className="overflow-x-auto rounded-md border">
              <Table className="min-w-full text-xs">
                <TableHeader><TableRow>
                  {['Customer', 'Client Name', 'Client Type', 'Contact Person', 'Location', 'Capacity (kW)', 'Module Type', 'Module Wattage', 'DCR Status', 'Inv. Rating (kW)', 'Inv. Qty', 'Rate/Watt (₹)', 'Unit Rate (₹)', 'Actions'].map(h => <TableHead key={h} className="p-2 whitespace-nowrap">{h}</TableHead>)}
                </TableRow></TableHeader>
                <TableBody>
                  {fields.map((item, index) => {
                      const isCustomerSelected = !!watchedProposals?.[index]?.customerId;
                      return (
                      <TableRow key={item.id}>
                        <TableCell className="p-1"><CustomerCombobox control={form.control} index={index} customers={allCustomers} onSelect={handleCustomerSelect} /></TableCell>
                        {Object.keys(getDefaultProposalRow()).map(fieldName => {
                          const typedFieldName = fieldName as keyof Omit<BatchRow, 'customerType' | 'customerId'>;
                          if (['clientType', 'moduleType', 'moduleWattage', 'dcrStatus'].includes(typedFieldName)) {
                              let options: readonly string[] = [];
                              if (typedFieldName === 'clientType') options = CLIENT_TYPES;
                              if (typedFieldName === 'moduleType') options = MODULE_TYPES;
                              if (typedFieldName === 'moduleWattage') options = MODULE_WATTAGE_OPTIONS;
                              if (typedFieldName === 'dcrStatus') options = DCR_STATUSES;
                              return (<TableCell key={fieldName} className="p-1"><Controller control={form.control} name={`proposals.${index}.${typedFieldName}`} render={({ field }) => <Select onValueChange={field.onChange} value={field.value?.toString()} disabled={!isCustomerSelected}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent></Select>} /></TableCell>);
                          }
                          return (<TableCell key={fieldName} className="p-1"><Controller control={form.control} name={`proposals.${index}.${typedFieldName}`} render={({ field }) => <Input {...field} type={typeof getDefaultProposalRow()[typedFieldName] === 'number' ? 'number' : 'text'} className="h-8 text-xs" disabled={!isCustomerSelected} />} /></TableCell>);
                        })}
                        <TableCell className="p-1 text-center">
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(index)} disabled={fields.length <= 1}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                  )})}
                </TableBody>
              </Table>
            </div>
            <div className="mt-6 flex justify-between items-center">
              <Button type="button" variant="outline" onClick={() => append(getDefaultProposalRow() as any)}><PlusCircle className="mr-2 h-4 w-4" /> Add Row</Button>
              <Button type="submit" disabled={isGenerating}>{isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Generate All Proposals</Button>
            </div>
          </fieldset>
        </form>
      </Form>

       {isResultDialogOpen && (
        <Dialog open={isResultDialogOpen} onOpenChange={(open) => { if (!open) router.push('/proposals'); }}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Batch Generation Summary</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <Progress value={overallProgress} className="w-full" />
                    <div className="space-y-2 max-h-80 overflow-y-auto p-1">
                        {progress.map((p, i) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                                <div className="flex items-center gap-2">
                                    {p.status === 'generating' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                    {p.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                    {p.status === 'error' && <XCircle className="h-4 w-4 text-destructive" />}
                                    <div>
                                      <span className="text-sm">{p.name}</span>
                                      {p.status === 'error' && <p className="text-xs text-destructive">{p.message}</p>}
                                    </div>
                                </div>
                                {p.status === 'success' && p.generatedProposal && (
                                  <Button size="sm" variant="outline" onClick={() => handleViewProposal(p.generatedProposal!)}><Eye className="mr-2 h-4 w-4"/>View</Button>
                                )}
                            </div>
                        ))}
                    </div>
                     <CardFooter className="justify-center">
                        <Button onClick={() => router.push('/proposals')}>
                           Back to Proposals
                        </Button>
                    </CardFooter>
                </div>
            </DialogContent>
        </Dialog>
      )}

      {isPreviewOpen && proposalForPreview && (
          <ProposalPreviewDialog
            isOpen={isPreviewOpen}
            onClose={() => setIsPreviewOpen(false)}
            pdfUrl={proposalForPreview.pdfUrl || null}
            docxUrl={proposalForPreview.docxUrl || null}
          />
      )}
    </>
  );
}
