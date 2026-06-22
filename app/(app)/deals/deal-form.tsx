
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import React, { useEffect, useMemo, useState, useTransition } from 'react';
import { DEAL_PIPELINES, ALL_DEAL_STAGES, type DealPipelineType, type DealStage } from '@/lib/constants';
import type { User, Client, CreateClientData, CustomSetting, LeadSourceOptionType, Lead, Deal } from '@/types';
import { IndianRupee, Calendar as CalendarIcon, ChevronsUpDown, Check, PlusCircle, Loader2, Handshake, Info, ShieldCheck, FileText } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { ClientForm } from '@/app/(app)/clients/client-form';
import { createClient } from '@/app/(app)/clients-list/actions';
import { getClientStatuses, getLeadSources } from '@/app/(app)/settings/actions';
import { useToast } from '@/hooks/use-toast';

const getDealSchema = (sources: string[]) => z.object({
  id: z.string().optional(),
  clientId: z.string().optional(),
  clientName: z.string().min(2, { message: "Client name must be at least 2 characters." }),
  contactPerson: z.string().min(2, { message: "Contact person must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }).optional().or(z.literal('')),
  pipeline: z.enum(Object.keys(DEAL_PIPELINES) as [DealPipelineType, ...DealPipelineType[]]),
  dealFor: z.string().optional(),
  source: z.string().optional().refine(val => !val || sources.includes(val), { message: "Please select a valid source." }),
  stage: z.enum(ALL_DEAL_STAGES, { required_error: "Stage is required." }),
  dealValue: z.coerce.number().min(0, { message: "Deal value cannot be negative." }),
  kilowatt: z.coerce.number().min(0).optional(),
  assignedTo: z.string().optional(),
  poWoDate: z.date({ required_error: "A PO/WO date is required." }),
  amcDurationInMonths: z.coerce.number().int().min(0).optional(),
  amcDealValue: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

export type DealFormValues = z.infer<ReturnType<typeof getDealSchema>>;

interface DealFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DealFormValues) => void;
  users: User[];
  clients: Client[];
  deal?: Partial<DealFormValues> | null;
  pipeline?: DealPipelineType;
  initialStage?: DealStage;
}

export function DealForm({ isOpen, onClose, onSubmit, users, clients, deal, pipeline, initialStage }: DealFormProps) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isClientFormOpen, setClientFormOpen] = useState(false);
  const [clientStatuses, setClientStatuses] = useState<any[]>([]);
  const [sources, setSources] = useState<CustomSetting[]>([]);
  const { toast } = useToast();
  const [isCreatingClient, startClientCreation] = useTransition();

  const dealSchema = useMemo(() => {
    const sourceNames = sources.map(s => s.name);
    return getDealSchema(sourceNames);
  }, [sources]);
  
  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      clientName: '',
      contactPerson: '',
      email: '',
      phone: '',
      pipeline: pipeline || 'Solar PV Plant',
      dealFor: '',
      source: undefined,
      stage: initialStage || (pipeline ? DEAL_PIPELINES[pipeline][0] : DEAL_PIPELINES['Solar PV Plant'][0]),
      dealValue: 0,
      kilowatt: 0,
      assignedTo: undefined,
      poWoDate: new Date(),
      amcDurationInMonths: 0,
      amcDealValue: 0,
      notes: '',
    },
  });

  useEffect(() => {
    async function fetchStatusesAndSources() {
      const [statuses, fetchedSources] = await Promise.all([
        getClientStatuses(),
        getLeadSources()
      ]);
      setClientStatuses(statuses);
      setSources(fetchedSources);
    }
    fetchStatusesAndSources();
  }, []);

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    form.setValue('clientId', client.id);
    form.setValue('clientName', client.name);
    form.setValue('contactPerson', client.name);
    form.setValue('email', client.email || '');
    form.setValue('phone', client.phone || '');
    form.setValue('source', client.source || '');
    form.setValue('kilowatt', client.kilowatt || 0);
  };
  
  const handleClientFormSubmit = async (data: CreateClientData | Client) => {
    startClientCreation(async () => {
      const newClientData = { ...data, status: data.status || 'Fresher' };
      const newClient = await createClient(newClientData as CreateClientData);
      if (newClient && !('error' in newClient)) {
        toast({ title: "Client Created", description: `${newClient.name} has been added.` });
        clients.push(newClient); 
        handleClientSelect(newClient);
        setClientFormOpen(false);
      } else {
        toast({ title: "Error", description: (newClient as {error: string}).error || "Failed to create client.", variant: "destructive" });
      }
    });
  };

  useEffect(() => {
    if (isOpen) {
      if (deal?.id) {
          if (clients.length && deal.clientId) {
            const client = clients.find(c => c.id === deal.clientId);
            if (client) handleClientSelect(client);
          }
          
          form.reset({
            ...deal,
            poWoDate: deal.poWoDate ? new Date(deal.poWoDate) : new Date(),
            amcDealValue: deal.amcDealValue || 0,
          });

      } else {
          form.reset({
            clientName: '',
            contactPerson: '',
            email: '',
            phone: '',
            pipeline: pipeline || 'Solar PV Plant',
            dealFor: '',
            source: undefined,
            stage: initialStage || (pipeline ? DEAL_PIPELINES[pipeline][0] : DEAL_PIPELINES['Solar PV Plant'][0]),
            dealValue: 0,
            kilowatt: 0,
            assignedTo: undefined,
            poWoDate: new Date(),
            amcDurationInMonths: 0,
            amcDealValue: 0,
            notes: '',
          });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, deal, clients, form, pipeline, initialStage]);

  const watchedPipeline = form.watch('pipeline');
  const watchedAmcDuration = form.watch('amcDurationInMonths');
  const stagesForSelectedPipeline = useMemo(() => {
    return DEAL_PIPELINES[watchedPipeline] || [];
  }, [watchedPipeline]);

  const handleSubmit = (values: DealFormValues) => {
    onSubmit(values);
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-border/60 shadow-2xl rounded-2xl">
        
        {/* Header Section */}
        <div className="bg-primary/5 border-b border-border/50 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <Handshake className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-extrabold text-foreground tracking-tight">
                {deal?.id ? 'Edit Deal' : 'Add New Deal'}
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-muted-foreground mt-0.5">
                {deal?.id ? 'Update the details for this deal.' : 'Enter the details to create a new deal pipeline entry.'}
              </DialogDescription>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col max-h-[75vh]">
            <div className="px-6 py-4 overflow-y-auto custom-scrollbar space-y-6">
              
              {/* Section 1: Client & Contact */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider mb-2">
                  <Info className="h-4 w-4" /> Client Information
                </div>
                
                <div className="grid gap-4">
                  <div className="space-y-2">
                      <FormLabel className="font-semibold text-foreground">Select Existing Client *</FormLabel>
                      <div className="flex gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between bg-muted/30 hover:bg-muted/50 border-border/60 transition-colors">
                                    {selectedClient ? <span className="font-bold text-primary">{selectedClient.name}</span> : <span className="text-muted-foreground">Search and select client...</span>}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-xl border-border/60 rounded-xl">
                                <Command>
                                    <CommandInput placeholder="Search clients..." />
                                    <CommandEmpty>No client found.</CommandEmpty>
                                    <CommandGroup className="max-h-[200px] overflow-y-auto custom-scrollbar">
                                        {clients.map((c) => (
                                            <CommandItem key={c.id} value={c.name} onSelect={() => handleClientSelect(c)} className="cursor-pointer">
                                                <Check className={cn("mr-2 h-4 w-4 text-primary", selectedClient?.id === c.id ? "opacity-100" : "opacity-0")} />
                                                {c.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <Button type="button" variant="outline" className="border-border/60 bg-muted/30 hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => setClientFormOpen(true)}>
                          <PlusCircle className="h-4 w-4 mr-2" /> New Client
                        </Button>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="clientName" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Deal Name / Client Name *</FormLabel>
                          <FormControl><Input placeholder="ABC Corporation" className="bg-muted/20" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="contactPerson" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Contact Person *</FormLabel>
                          <FormControl><Input placeholder="Mr. John Doe" className="bg-muted/20" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Email</FormLabel>
                        <FormControl><Input type="email" placeholder="john.doe@example.com" className="bg-muted/20" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                      )} />
                      <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Mobile No.</FormLabel>
                        <FormControl><Input type="tel" placeholder="9876543210" className="bg-muted/20" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                      )} />
                  </div>
                </div>
              </div>

              <div className="h-px bg-border/50 w-full" />

              {/* Section 2: Deal Commercials */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider mb-2">
                  <ShieldCheck className="h-4 w-4" /> Pipeline & Commercials
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="pipeline" render={({ field }) => (
                      <FormItem>
                          <FormLabel className="font-semibold">Pipeline *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger className="bg-muted/20"><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>{Object.keys(DEAL_PIPELINES).map(p => <SelectItem key={p} value={p} className="font-medium">{p}</SelectItem>)}</SelectContent>
                          </Select>
                          <FormMessage />
                      </FormItem>
                  )} />
                  <FormField control={form.control} name="stage" render={({ field }) => (
                      <FormItem>
                          <FormLabel className="font-semibold">Stage *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger className="bg-muted/20"><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>{stagesForSelectedPipeline.map(s => <SelectItem key={s} value={s} className="font-medium">{s}</SelectItem>)}</SelectContent>
                          </Select>
                          <FormMessage />
                      </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="dealFor" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Deal For</FormLabel>
                      <FormControl><Input placeholder="e.g., Rooftop Solar" className="bg-muted/20" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="source" render={({ field }) => (
                      <FormItem>
                          <FormLabel className="font-semibold">Source</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger className="bg-muted/20"><SelectValue placeholder="Select source" /></SelectTrigger></FormControl>
                              <SelectContent>{sources.map(s => <SelectItem key={s.id} value={s.name} className="font-medium">{s.name}</SelectItem>)}</SelectContent>
                          </Select>
                          <FormMessage />
                      </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="dealValue" render={({ field }) => (
                      <FormItem>
                          <FormLabel className="font-semibold">Deal Value (₹) *</FormLabel>
                          <FormControl>
                              <div className="relative">
                                  <div className="absolute left-0 top-0 bottom-0 w-10 bg-primary/10 border-r border-border/50 flex items-center justify-center rounded-l-md">
                                    <IndianRupee className="h-4 w-4 text-primary" />
                                  </div>
                                  <Input type="number" placeholder="0.00" className="pl-12 bg-muted/20 font-bold text-primary" {...field} />
                              </div>
                          </FormControl>
                          <FormMessage />
                      </FormItem>
                  )} />
                  <FormField
                    control={form.control}
                    name="kilowatt"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="font-semibold">System Size (kW)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="0" className="bg-muted/20 font-semibold" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                  />
                </div>

                {watchedPipeline === 'Solar PV Plant' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20 p-4 rounded-xl mt-2 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500/50" />
                        <FormField control={form.control} name="amcDurationInMonths" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-semibold text-emerald-800 dark:text-emerald-400">AMC Duration (in months)</FormLabel>
                                <FormControl><Input type="number" placeholder="e.g., 12" className="bg-background/80 border-emerald-200 dark:border-emerald-900/50" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="amcDealValue" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-semibold text-emerald-800 dark:text-emerald-400">AMC Deal Value (₹)</FormLabel>
                                 <FormControl>
                                    <div className="relative">
                                        <div className="absolute left-0 top-0 bottom-0 w-10 bg-emerald-500/10 border-r border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center rounded-l-md">
                                          <IndianRupee className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <Input type="number" placeholder="0.00" className="pl-12 bg-background/80 border-emerald-200 dark:border-emerald-900/50 font-bold text-emerald-700 dark:text-emerald-300" {...field} value={field.value || 0} disabled={!watchedAmcDuration || watchedAmcDuration <= 0}/>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                )}
              </div>

              <div className="h-px bg-border/50 w-full" />

              {/* Section 3: Extra Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider mb-2">
                  <FileText className="h-4 w-4" /> Assignment & Details
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="assignedTo" render={({ field }) => (
                      <FormItem>
                          <FormLabel className="font-semibold">Assigned To</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger className="bg-muted/20"><SelectValue placeholder="Select user"/></SelectTrigger></FormControl>
                              <SelectContent>{users.map(user => <SelectItem key={user.id} value={user.name} className="font-medium">{user.name}</SelectItem>)}</SelectContent>
                          </Select>
                          <FormMessage />
                      </FormItem>
                  )} />
                  <FormField control={form.control} name="poWoDate" render={({ field }) => (
                      <FormItem className="flex flex-col">
                          <FormLabel className="font-semibold">PO/WO Date *</FormLabel>
                          <Popover>
                              <PopoverTrigger asChild>
                                  <FormControl>
                                      <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal bg-muted/20", !field.value && "text-muted-foreground")}>
                                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                  </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 shadow-xl border-border/60" align="start">
                                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                              </PopoverContent>
                          </Popover>
                          <FormMessage />
                      </FormItem>
                  )} />
                </div>
                
                <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-semibold">Internal Notes</FormLabel>
                        <FormControl><Textarea placeholder="Add any relevant notes for this deal..." className="min-h-[100px] bg-muted/20" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border/50 bg-muted/10 flex justify-end gap-3 mt-auto rounded-b-2xl">
              <Button type="button" variant="outline" onClick={onClose} className="font-bold border-border/60 hover:bg-muted/50 transition-colors">
                Cancel
              </Button>
              <Button type="submit" className="font-bold px-8 shadow-sm hover:shadow transition-all">
                {deal?.id ? 'Save Changes' : 'Create Deal'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    <ClientForm 
        isOpen={isClientFormOpen}
        onClose={() => setClientFormOpen(false)}
        onSubmit={handleClientFormSubmit}
        users={users}
        statuses={clientStatuses}
        sources={sources}
    />
    </>
  );
}
