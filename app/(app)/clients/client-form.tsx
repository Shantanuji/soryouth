
'use client';

import type { Client, ClientStatusType, ClientPriorityType, User, CreateClientData, CustomSetting, ElectricityBill, LeadSourceOptionType } from '@/types';
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
import { CLIENT_PRIORITY_OPTIONS, CLIENT_TYPES } from '@/lib/constants';

const getClientSchema = (statuses: string[], sources: string[]) => z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }).optional().or(z.literal('')),
  phone: z.string().min(10, { message: 'Phone number must be at least 10 digits.' }).max(10, {message: 'Phone number cannot exceed 10 digits'}).optional().or(z.literal('')),
  status: z.string().refine(val => statuses.includes(val), { message: "Please select a valid stage." }),
  source: z.string().optional().refine(val => !val || sources.includes(val), { message: "Please select a valid source." }),
  assignedTo: z.string().optional(),
  kilowatt: z.coerce.number().min(0).optional(),
  address: z.string().optional(),
  priority: z.enum(CLIENT_PRIORITY_OPTIONS).optional(),
  clientType: z.enum(CLIENT_TYPES).optional(),
});


interface ClientFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateClientData | Client) => void;
  client?: Client | null;
  users: User[];
  statuses: CustomSetting[];
  sources: CustomSetting[];
}

export function ClientForm({ isOpen, onClose, onSubmit, client, users, statuses, sources = [] }: ClientFormProps) {
  const statusNames = useMemo(() => statuses.map(s => s.name), [statuses]);
  const sourceNames = useMemo(() => sources.map(s => s.name), [sources]);
  const clientSchema = useMemo(() => getClientSchema(statusNames, sourceNames), [statusNames, sourceNames]);
  
  type ClientFormValues = z.infer<typeof clientSchema>;

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      status: statuses.find(s => s.name === 'Deal Done')?.name || statuses[0]?.name,
      source: undefined,
      assignedTo: undefined,
      kilowatt: 0,
      address: '',
      priority: 'Average',
      clientType: undefined,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (client) {
        form.reset({
          name: client.name || '',
          email: client.email || '',
          phone: client.phone || '',
          status: client.status,
          source: client.source || undefined,
          assignedTo: client.assignedTo || undefined,
          kilowatt: client.kilowatt || 0,
          address: client.address || '',
          priority: client.priority || 'Average',
          clientType: client.clientType || undefined,
        });
      } else {
        form.reset({
            name: '',
            email: '',
            phone: '',
            status: statuses.find(s => s.name === 'Deal Done')?.name || statuses[0]?.name,
            source: undefined,
            assignedTo: undefined,
            kilowatt: 0,
            address: '',
            priority: 'Average',
            clientType: undefined,
        });
      }
    }
  }, [client, form, isOpen, statuses]);

  const handleSubmit = (values: ClientFormValues) => {
    const submissionData: Partial<Client> = { ...values };
    if (client) {
      onSubmit({ ...client, ...submissionData });
    } else {
      submissionData.electricityBillUrls = [];
      submissionData.totalDealValue = 0;
      onSubmit(submissionData as CreateClientData);
    }
  };

  const dialogTitle = client ? 'Edit Client' : 'Add New Client';
  const dialogDescription = client ? "Update the client's information." : 'Enter the details for the new client.';
  const submitButtonText = client ? 'Save Changes' : 'Add Client';


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2 pb-4 pr-1">
            {client?.id && (
              <FormItem>
                <FormLabel>Client ID</FormLabel>
                <FormControl>
                  <Input readOnly disabled value={client.id} />
                </FormControl>
              </FormItem>
            )}
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
                      <Input type="tel" placeholder="9876543210" {...field} />
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
                          <SelectValue placeholder="Select client stage" />
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
                        {CLIENT_PRIORITY_OPTIONS.map(priorityValue => (
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

