
'use client';

import type { Lead, LeadStatusType, LeadPriorityType, LeadSourceOptionType, User, ClientType, CreateLeadData, CustomSetting } from '@/types';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import React, { useEffect, useMemo } from 'react';
import { LEAD_PRIORITY_OPTIONS, CLIENT_TYPES } from '@/lib/constants';
import { format, parseISO, isValid } from 'date-fns';

const getLeadSchema = (statuses: string[], sources: string[]) => z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }).optional().or(z.literal('')),
  phone: z.string().min(10, { message: 'Phone number must be at least 10 digits.' }).optional().or(z.literal('')),
  status: z.string().refine(val => statuses.includes(val), { message: "Please select a valid stage." }),
  source: z.string().optional().refine(val => !val || sources.includes(val), { message: "Please select a valid source." }),
  assignedTo: z.string().optional(),
  lastCommentText: z.string().optional(),
  nextFollowUpDate: z.string().optional().refine(val => !val || (isValid(parseISO(val))), { message: "Invalid date" }),
  nextFollowUpTime: z.string().optional().refine(val => !val || /^([01]\d|2[0-3]):([0-5]\d)$/.test(val), { message: "Invalid time (HH:MM)"}),
  kilowatt: z.coerce.number().min(0).optional(),
  address: z.string().optional(),
  cityArea: z.string().optional(),
  priority: z.enum(LEAD_PRIORITY_OPTIONS).optional(),
  clientType: z.enum(CLIENT_TYPES).optional(),
});

type LeadFormValues = z.infer<ReturnType<typeof getLeadSchema>>;

interface LeadFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateLeadData | Lead) => void;
  lead?: Lead | null;
  users: User[];
  statuses: CustomSetting[];
  sources: CustomSetting[];
}

export function LeadForm({ isOpen, onClose, onSubmit, lead, users, statuses, sources }: LeadFormProps) {
  const statusNames = useMemo(() => statuses.map(s => s.name), [statuses]);
  const sourceNames = useMemo(() => sources.map(s => s.name), [sources]);
  const leadSchema = useMemo(() => getLeadSchema(statusNames, sourceNames), [statusNames, sourceNames]);

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      status: statuses.find(s => s.name === 'Fresher')?.name || statuses[0]?.name,
      source: undefined,
      assignedTo: undefined,
      lastCommentText: '',
      nextFollowUpDate: '',
      nextFollowUpTime: '',
      kilowatt: 0,
      address: '',
      cityArea: '',
      priority: 'Average',
      clientType: undefined,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (lead) {
        const currentStatusIsValid = statusNames.includes(lead.status);
        const statusToSet = currentStatusIsValid ? lead.status : statusNames[0];

        form.reset({
          name: lead.name,
          email: lead.email ?? '',
          phone: lead.phone ?? '',
          status: statusToSet,
          source: lead.source ?? undefined,
          assignedTo: lead.assignedTo ?? undefined,
          lastCommentText: lead.lastCommentText ?? '',
          nextFollowUpDate: lead.nextFollowUpDate ? format(parseISO(lead.nextFollowUpDate), 'yyyy-MM-dd') : '',
          nextFollowUpTime: lead.nextFollowUpTime ?? '',
          kilowatt: lead.kilowatt ?? 0,
          address: lead.address ?? '',
          cityArea: lead.cityArea ?? '',
          priority: lead.priority ?? 'Average',
          clientType: lead.clientType ?? undefined,
        });
      } else {
        form.reset({
          name: '',
          email: '',
          phone: '',
          status: statuses.find(s => s.name === 'Fresher')?.name || statuses[0]?.name,
          source: undefined,
          assignedTo: undefined,
          lastCommentText: '',
          nextFollowUpDate: '',
          nextFollowUpTime: '',
          kilowatt: 0,
          address: '',
          cityArea: '',
          priority: 'Average',
          clientType: undefined,
        });
      }
    }
  }, [lead, form, isOpen, statusNames, statuses, sources]);


  const handleSubmit = (values: LeadFormValues) => {
    const submissionData = {
      ...values,
      kilowatt: values.kilowatt ?? undefined,
      lastCommentDate: values.lastCommentText ? format(new Date(), 'dd-MM-yyyy') : undefined,
      nextFollowUpDate: values.nextFollowUpDate ? values.nextFollowUpDate : undefined,
      nextFollowUpTime: values.nextFollowUpTime ? values.nextFollowUpTime : undefined,
      clientType: values.clientType || undefined,
    };
    if (lead) {
      onSubmit({ ...lead, ...submissionData });
    } else {
      onSubmit(submissionData as CreateLeadData);
    }
  };

  const dialogTitle = lead ? 'Edit Lead' : 'Add New Lead';
  const dialogDescription = lead ? "Update the lead's information." : 'Enter the details for the new lead.';
  const submitButtonText = lead ? 'Save Changes' : 'Add Lead';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2 pb-4 pr-1">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john.doe@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile No.</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="6263537508" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter full address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="cityArea"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City / Area</FormLabel>
                  <FormControl>
                    <Input placeholder="City or Area" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select lead stage" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statuses.map(statusValue => (
                          <SelectItem key={statusValue.id} value={statusValue.name} className="capitalize">{statusValue.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LEAD_PRIORITY_OPTIONS.map(priorityValue => (
                          <SelectItem key={priorityValue} value={priorityValue}>{priorityValue}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CLIENT_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sources.map(sourceValue => (
                          <SelectItem key={sourceValue.id} value={sourceValue.name}>{sourceValue.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="lastCommentText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Comment</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter last comment..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <FormField
                control={form.control}
                name="nextFollowUpDate"
                render={({ field }) => (
                    <FormItem className="md:col-span-2">
                    <FormLabel>Next Follow-up Date</FormLabel>
                    <FormControl>
                        <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="nextFollowUpTime"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                        <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {submitButtonText}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
