

'use client';

import { useState, useEffect, useMemo, useTransition, ChangeEvent } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CONSUMER_CATEGORIES_OPTIONS, METER_PHASES, CONSUMER_LOAD_TYPES, ROOF_TYPES, DISCOM_OPTIONS } from '@/lib/constants';
import type { ConsumerCategoryType, MeterPhaseType, ConsumerLoadType, RoofType, DiscomType, UserOptionType, Lead, Client, User, CustomSetting, CreateLeadData, CreateSiteSurveyData } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/hooks/use-sessions';
import { format, isValid, parseISO } from 'date-fns';
import { ClipboardEdit, IndianRupee, UploadCloud, ChevronsUpDown, Check, X, Loader2, PlusCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { getLeads, createLead } from '@/app/(app)/leads-list/actions';
import { getActiveClients } from '@/app/(app)/clients-list/actions';
import { getLeadStatuses, getLeadSources } from '@/app/(app)/settings/actions';
import { getUsers } from '@/app/(app)/users/actions';
import { createSiteSurvey } from './actions';
import { LeadForm } from '@/app/(app)/leads/lead-form';


const getSiteSurveySchema = (userNames: string[]) => z.object({
  consumerName: z.string().min(2, { message: 'Consumer name must be at least 2 characters.' }),
  date: z.string().refine((val) => isValid(parseISO(val)), { message: "A valid date is required." }),
  consumerCategory: z.enum(CONSUMER_CATEGORIES_OPTIONS, { required_error: "Consumer category is required." }),
  consumerCategoryOther: z.string().optional(),
  location: z.string().min(3, { message: 'Location must be at least 3 characters.' }),
  numberOfMeters: z.coerce.number().int().positive({ message: 'Number of meters must be a positive integer.' }),
  meterRating: z.string().optional(),
  meterPhase: z.enum(METER_PHASES).optional(),
  electricityAmount: z.coerce.number().optional(),
  consumerLoadType: z.enum(CONSUMER_LOAD_TYPES, { required_error: "Consumer load type is required." }),
  roofType: z.enum(ROOF_TYPES, { required_error: "Type of roof is required." }),
  roofTypeOther: z.string().optional(),
  buildingHeight: z.string().min(1, { message: "Building height is required." }),
  shadowFreeArea: z.string().min(1, { message: "Shadow free area is required." }),
  discom: z.enum(DISCOM_OPTIONS, { required_error: "Discom is required." }),
  discomOther: z.string().optional(),
  sanctionedLoad: z.string().optional(),
  remark: z.string().optional(),
  surveyorName: userNames.length > 0
    ? z.enum(userNames as [string, ...string[]], { required_error: "A surveyor must be selected." })
    : z.string({ required_error: "Surveyor name is required." }).refine(() => false, "Cannot submit: No surveyors are available in the system."),
  electricityBillFiles: z.instanceof(FileList).optional().nullable()
    .refine(files => {
        if (!files || files.length === 0) return true;
        for (const file of Array.from(files)) {
            if (file.size > 5 * 1024 * 1024) return false;
        }
        return true;
    }, `Max file size is 5MB.`)
    .refine(files => {
        if (!files || files.length === 0) return true;
        for (const file of Array.from(files)) {
            if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) return false;
        }
        return true;
    }, '.jpg, .png, or .pdf files are accepted.'),
  leadId: z.string().optional(),
  clientId: z.string().optional(),
}).refine(data => data.consumerCategory !== 'Other' || (data.consumerCategory === 'Other' && data.consumerCategoryOther), {
  message: 'Please specify the consumer category',
  path: ['consumerCategoryOther'],
}).refine(data => data.roofType !== 'Other' || (data.roofType === 'Other' && data.roofTypeOther), {
  message: 'Please specify the roof type',
  path: ['roofTypeOther'],
}).refine(data => data.discom !== 'Other' || (data.discom === 'Other' && data.discomOther), {
  message: 'Please specify the DISCOM',
  path: ['discomOther'],
});


const CustomerCombobox = ({ onSelect, customers }: { onSelect: (customer: Client | Lead) => void; customers: (Client | Lead)[] }) => {
    const [open, setOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<(Client | Lead) | null>(null);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between">
                    {selectedCustomer ? selectedCustomer.name : "Select an existing Lead/Client..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                    <CommandInput placeholder="Search customer..." />
                    <CommandEmpty>No customer found.</CommandEmpty>
                    <CommandGroup>
                        {customers.map((customer) => (
                            <CommandItem
                                key={customer.id}
                                value={`${customer.name} ${customer.id}`}
                                onSelect={() => {
                                    onSelect(customer);
                                    setSelectedCustomer(customer);
                                    setOpen(false);
                                }}
                            >
                                <Check className={cn("mr-2 h-4 w-4", selectedCustomer?.id === customer.id ? "opacity-100" : "opacity-0")} />
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


export default function SiteSurveyPage() {
  const { toast } = useToast();
  const session = useSession();
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [leadStatuses, setLeadStatuses] = useState<CustomSetting[]>([]);
  const [leadSources, setLeadSources] = useState<CustomSetting[]>([]);

  const allCustomers = useMemo(() => [...clients, ...leads], [clients, leads]);

  const siteSurveySchema = useMemo(() => {
    const userNames = users.map(u => u.name);
    return getSiteSurveySchema(userNames);
  }, [users]);
  
  type SiteSurveyFormValues = z.infer<typeof siteSurveySchema>;

  const form = useForm<SiteSurveyFormValues>({
    resolver: zodResolver(siteSurveySchema),
    defaultValues: {
      consumerName: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      consumerCategory: undefined,
      consumerCategoryOther: '',
      location: '',
      numberOfMeters: 1,
      meterRating: '',
      meterPhase: undefined,
      electricityAmount: undefined,
      consumerLoadType: undefined,
      roofType: undefined,
      roofTypeOther: '',
      buildingHeight: '',
      shadowFreeArea: '',
      discom: undefined,
      discomOther: '',
      sanctionedLoad: '',
      remark: '',
      surveyorName: undefined,
      electricityBillFiles: null,
      leadId: undefined,
      clientId: undefined,
    },
  });

  const watchedConsumerCategory = form.watch('consumerCategory');
  const watchedRoofType = form.watch('roofType');
  const watchedDiscom = form.watch('discom');

  useEffect(() => {
    async function fetchData() {
        setIsDataLoading(true);
        const [fetchedLeads, fetchedClients, fetchedUsers, fetchedLeadStatuses, fetchedLeadSources] = await Promise.all([
            getLeads({ignorePermissions: true}),
            getActiveClients({ignorePermissions: true}),
            getUsers(),
            getLeadStatuses(),
            getLeadSources()
        ]);
        setLeads(fetchedLeads);
        setClients(fetchedClients);
        setUsers(fetchedUsers);
        setLeadStatuses(fetchedLeadStatuses);
        setLeadSources(fetchedLeadSources);
        setIsDataLoading(false);
        
        if (session?.name) {
            const currentUser = fetchedUsers.find(u => u.name === session.name);
            if (currentUser) {
                form.setValue('surveyorName', currentUser.name);
            }
        }
    }
    fetchData();
  }, [session?.name, form]);

  const handleCustomerSelect = (customer: Client | Lead) => {
    form.setValue('consumerName', customer.name);
    form.setValue('location', customer.address || '');
    form.setValue('consumerCategory', customer.clientType || 'Other');
    if ('dropReason' in customer) { // It's a Lead
        form.setValue('leadId', customer.id);
        form.setValue('clientId', undefined);
    } else { // It's a Client
        form.setValue('clientId', customer.id);
        form.setValue('leadId', undefined);
    }
  };
  
  const handleLeadFormSubmit = async (data: CreateLeadData | Lead) => {
    startSubmitTransition(async () => {
        const result = await createLead(data as CreateLeadData);
        if (result && !('error' in result)) {
            const newLeads = await getLeads({ ignorePermissions: true });
            setLeads(newLeads);
            handleCustomerSelect(result);
            toast({ title: "Lead Created", description: `Lead "${result.name}" has been created and selected.`});
            setIsLeadFormOpen(false);
        } else {
            toast({ title: "Error", description: "Failed to create lead.", variant: "destructive"});
        }
    });
  };

  const onSubmit = (values: SiteSurveyFormValues) => {
    startSubmitTransition(async () => {
      try {
        const surveyor = users.find(u => u.name === values.surveyorName);
        if (!surveyor) {
            throw new Error('Selected surveyor not found.');
        }

        let billFileUrls: string[] = [];
        const billFiles = values.electricityBillFiles;

        if (billFiles && billFiles.length > 0) {
            const uploadPromises = Array.from(billFiles).map(file => {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('folder', 'e-bills');
                return fetch('/api/templates/upload', {
                    method: 'POST',
                    body: formData,
                }).then(res => res.json());
            });

            const results = await Promise.all(uploadPromises);
            for (const result of results) {
                if (!result.success) throw new Error(result.error || 'A file failed to upload.');
                billFileUrls.push(result.filePath);
            }
        }

        const dataToSave: CreateSiteSurveyData = {
          ...values,
          surveyorId: surveyor.id,
          electricityBillFiles: billFileUrls,
        };

        const result = await createSiteSurvey(dataToSave);

        if (result && 'error' in result) {
            throw new Error(result.error);
        } else if (result) {
            toast({ title: 'Survey Submitted Successfully', description: `Survey for ${values.consumerName} has been recorded.` });
            form.reset();
        } else {
            throw new Error('An unexpected error occurred. The server did not respond.');
        }
      } catch (error) {
        toast({ title: 'Error Submitting Survey', description: (error as Error).message, variant: 'destructive' });
      }
    });
  };

  return (
    <>
      <PageHeader
        title="Site Survey Form"
        description="Fill in the details for the site survey."
        icon={ClipboardEdit}
      />
      <Card className="lg:col-span-2 ">
        <CardHeader>
          <CardTitle>Survey Details</CardTitle>
          <CardDescription>Select an existing customer or fill in the details for a new one.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                    <FormLabel>Select Existing Customer</FormLabel>
                    <div className="flex flex-wrap gap-2 items-center">
                        <div className="flex-grow">
                            {isDataLoading ? <Loader2 className="animate-spin" /> : <CustomerCombobox customers={allCustomers} onSelect={handleCustomerSelect} />}
                        </div>
                        <Button type="button" variant="outline" onClick={() => setIsLeadFormOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> New Lead
                        </Button>
                    </div>
                </div>

              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="consumerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consumer Name *</FormLabel>
                      <FormControl><Input placeholder="Enter consumer name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Survey *</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="consumerCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Consumer Category *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {CONSUMER_CATEGORIES_OPTIONS.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {watchedConsumerCategory === 'Other' && (
                     <FormField
                      control={form.control}
                      name="consumerCategoryOther"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Please Specify Category *</FormLabel>
                          <FormControl><Input placeholder="e.g., Residential Complex" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location *</FormLabel>
                    <FormControl><Textarea placeholder="Enter full site address" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="numberOfMeters"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Meters *</FormLabel>
                      <FormControl><Input type="number" placeholder="e.g., 1" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="meterRating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meter Rating (Optional)</FormLabel>
                      <FormControl><Input placeholder="e.g., 5-30A" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="meterPhase"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meter Phase (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select phase" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {METER_PHASES.map(phase => <SelectItem key={phase} value={phase}>{phase}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                 <FormField
                  control={form.control}
                  name="electricityAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Avg. Electricity Bill Amount (₹) (Optional)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="number" placeholder="0.00" className="pl-8" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="consumerLoadType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consumer Load Type (LT/HT) *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select load type" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {CONSUMER_LOAD_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                 <FormField
                  control={form.control}
                  name="roofType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type of Roof *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select roof type" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {ROOF_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {watchedRoofType === 'Other' && (
                  <FormField
                    control={form.control}
                    name="roofTypeOther"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Please Specify Roof Type *</FormLabel>
                        <FormControl><Input placeholder="e.g., Tiled Roof" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="buildingHeight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height of Building *</FormLabel>
                      <FormControl><Input placeholder="e.g., G+2 or 30ft" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shadowFreeArea"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shadow Free Area (sq.ft.) *</FormLabel>
                      <FormControl><Input placeholder="e.g., 500 sq.ft." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="discom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DISCOM *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select DISCOM" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {DISCOM_OPTIONS.map(discom => <SelectItem key={discom} value={discom}>{discom}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {watchedDiscom === 'Other' && (
                  <FormField
                    control={form.control}
                    name="discomOther"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Please Specify DISCOM *</FormLabel>
                        <FormControl><Input placeholder="e.g., BEST" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="sanctionedLoad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sanctioned Load (kW/kVA) (Optional)</FormLabel>
                      <FormControl><Input placeholder="e.g., 10 kW or 15 kVA" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="remark"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remark (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="Any additional remarks..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="surveyorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Surveyor Name *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select surveyor" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {users.map(user => <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="electricityBillFiles"
                render={({ field: { value, onChange, ...fieldProps } }) => {
                    return (
                        <FormItem>
                            <FormLabel>Upload Electricity Bill(s) (Optional)</FormLabel>
                            <FormControl>
                                <div className="flex items-center justify-center w-full">
                                    <label htmlFor="dropzone-file-bill" className="flex flex-col items-center justify-center w-full h-32 border-2 border-border border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                                            <p className="mb-1 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                            <p className="text-xs text-muted-foreground">PDF, PNG, JPG (MAX. 5MB each)</p>
                                        </div>
                                        <Input 
                                        id="dropzone-file-bill" 
                                        type="file" 
                                        multiple
                                        className="hidden" 
                                        accept=".pdf,.png,.jpg,.jpeg"
                                        onChange={(e) => onChange(e.target.files)} 
                                        {...fieldProps}
                                        />
                                    </label>
                                </div> 
                            </FormControl>
                             {value?.length && <p className="text-xs text-muted-foreground mt-1">{value.length} file(s) selected: {Array.from(value).map(f => f.name).join(', ')}</p>}
                            <FormMessage />
                        </FormItem>
                    )
                }}
              />

              <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : 'Submit Survey'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {isLeadFormOpen && (
        <LeadForm 
            isOpen={isLeadFormOpen}
            onClose={() => setIsLeadFormOpen(false)}
            onSubmit={handleLeadFormSubmit}
            users={users}
            statuses={leadStatuses}
            sources={leadSources}
        />
      )}
    </>
  );
}
