
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
import type { User, Client, CreateClientData, CustomSetting, LeadSourceOptionType, Lead } from '@/types';
import { IndianRupee, Calendar as CalendarIcon, ChevronsUpDown, Check, PlusCircle } from 'lucide-react';
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
});

export type DealFormValues = z.infer<ReturnType<typeof getDealSchema>>;

interface DealFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DealFormValues) => void;
  users: User[];
  clients: Client[];
  deal?: Partial<DealFormValues & { id?: string }>;
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
      source: undefined ,
      stage: initialStage || (pipeline ? DEAL_PIPELINES[pipeline][0] : DEAL_PIPELINES['Solar PV Plant'][0]),
      dealValue: 0,
      kilowatt: 0,
      assignedTo: undefined,
      poWoDate: new Date(),
      amcDurationInMonths: 0,
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
      const newClient = await createClient(data as CreateClientData);
      if (newClient) {
        toast({ title: "Client Created", description: `${newClient.name} has been added.` });
        clients.push(newClient); 
        handleClientSelect(newClient);
        setClientFormOpen(false);
      } else {
        toast({ title: "Error", description: "Failed to create client.", variant: "destructive" });
      }
    });
  };

  useEffect(() => {
    if (isOpen) {
      if (deal?.clientId && clients.length) {
        const client = clients.find(c => c.id === deal.clientId);
        if (client) handleClientSelect(client);
      }
      form.reset({
        clientName: deal?.clientName || '',
        clientId: deal?.clientId || undefined,
        contactPerson: deal?.contactPerson || '',
        email: deal?.email || '',
        phone: deal?.phone || '',
        pipeline: pipeline || 'Solar PV Plant',
        dealFor: deal?.dealFor || '',
        source: deal?.source || undefined,
        stage: initialStage || deal?.stage || (pipeline ? DEAL_PIPELINES[pipeline][0] : DEAL_PIPELINES['Solar PV Plant'][0]),
        dealValue: deal?.dealValue || 0,
        kilowatt: deal?.kilowatt || 0,
        assignedTo: deal?.assignedTo || undefined,
        poWoDate: deal?.poWoDate ? (deal.poWoDate instanceof Date ? deal.poWoDate : new Date(deal.poWoDate)) : new Date(),
        amcDurationInMonths: deal?.amcDurationInMonths || 0,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, deal, clients, form, pipeline, initialStage]);

  const watchedPipeline = form.watch('pipeline');
  const stagesForSelectedPipeline = useMemo(() => {
    return DEAL_PIPELINES[watchedPipeline] || [];
  }, [watchedPipeline]);

  const handleSubmit = (values: DealFormValues) => {
    onSubmit(values);
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>{deal?.clientName ? 'Edit Deal' : 'Add New Deal'}</DialogTitle>
          <DialogDescription>Enter the details for the deal.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2 pb-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-2">
                <FormLabel>Client *</FormLabel>
                <div className="flex gap-2">
                  <Popover>
                      <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" className="w-full justify-between">
                              {selectedClient ? selectedClient.name : "Select client"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                              <CommandInput placeholder="Search clients..." />
                              <CommandEmpty>No client found.</CommandEmpty>
                              <CommandGroup>
                                  {clients.map((c) => (
                                      <CommandItem key={c.id} value={c.name} onSelect={() => handleClientSelect(c)}>
                                          <Check className={cn("mr-2 h-4 w-4", selectedClient?.id === c.id ? "opacity-100" : "opacity-0")} />
                                          {c.name}
                                      </CommandItem>
                                  ))}
                              </CommandGroup>
                          </Command>
                      </PopoverContent>
                  </Popover>
                  <Button type="button" variant="outline" size="icon" onClick={() => setClientFormOpen(true)}><PlusCircle /></Button>
                </div>
            </div>

            <FormField control={form.control} name="clientName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Deal Name / Client Name *</FormLabel>
                  <FormControl><Input placeholder="ABC Corporation" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
            )} />
             <FormField control={form.control} name="contactPerson" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Person *</FormLabel>
                  <FormControl><Input placeholder="Mr. John Doe" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
            )} />
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" placeholder="john.doe@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile No.</FormLabel>
                  <FormControl><Input type="tel" placeholder="9876543210" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
                )} />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="pipeline" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Pipeline *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{Object.keys(DEAL_PIPELINES).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="dealFor" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deal For</FormLabel>
                    <FormControl><Input placeholder="e.g., Rooftop Solar" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField control={form.control} name="source" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Source</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger></FormControl>
                            <SelectContent>{sources.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
                 <FormField control={form.control} name="stage" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Stage *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{stagesForSelectedPipeline.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="dealValue" render={({ field }) => (
                <FormItem>
                  <FormLabel>Deal Value (₹)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="number" placeholder="0.00" className="pl-8" {...field} />
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
                  <FormLabel>Kilowatt (kW)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {watchedPipeline === 'AMC' && (
                <FormField control={form.control} name="amcDurationInMonths" render={({ field }) => (
                    <FormItem>
                        <FormLabel>AMC Duration (in months)</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 12" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
            )}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="assignedTo" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Assigned To</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select user"/></SelectTrigger></FormControl>
                            <SelectContent>{users.map(user => <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                 )} />
                 <FormField control={form.control} name="poWoDate" render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>PO/WO Date *</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                 )} />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit">Add Deal</Button>
            </DialogFooter>
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

