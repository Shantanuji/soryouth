
'use client';

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "./ui/command";
import { ChevronsUpDown, Check, Loader2, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Client, Deal, User, TicketStatus, TicketPriority, Tickets } from "@/types";
import { getActiveClients } from "@/app/(app)/clients-list/actions";
import { getDealsForClient } from "@/app/(app)/deals/actions";
import { getUsers } from "@/app/(app)/users/actions";
import { createTicket } from "@/app/(app)/tickets/actions";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar } from "./ui/calendar";

const TICKET_PRIORITIES = ['High', 'Medium', 'Low'] as const;
const TICKET_STATUSES = ['Open', 'On Hold', 'Closed'] as const;

const getTicketSchema = (userIds: string[]) => z.object({
    clientId: z.string().min(1, 'A client must be selected.'),
    clientName: z.string(),
    mobileNo: z.string(),
    email: z.string().email().optional().or(z.literal('')),
    address: z.string(),
    ticketFor: z.string().min(1, 'This field is required.'),
    priority: z.enum(TICKET_PRIORITIES),
    status: z.enum(TICKET_STATUSES),
    subject: z.string().min(5, 'Subject must be at least 5 characters.'),
    description: z.string().min(10, 'Description must be at least 10 characters.'),
    assignedToId: z.string().optional(),
    dueDate: z.date({ required_error: "Due date is required." }),
    dealId: z.string().optional(),
});

type TicketFormValues = z.infer<ReturnType<typeof getTicketSchema>>;

interface CreateTicketFormProps {
  isOpen: boolean;
  onClose: () => void;
  onTicketCreated: () => void;
}

export const CreateTicketForm: React.FC<CreateTicketFormProps> = ({ isOpen, onClose, onTicketCreated }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const { toast } = useToast();
  
  const userIds = useMemo(() => users.map(u => u.id), [users]);
  const ticketSchema = useMemo(() => getTicketSchema(userIds), [userIds]);

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
        clientId: '',
        clientName: '',
        mobileNo: '',
        email: '',
        address: '',
        ticketFor: '',
        priority: 'Medium',
        status: 'Open',
        subject: '',
        description: '',
        assignedToId: undefined,
        dueDate: new Date(),
        dealId: undefined,
    },
  });

  useEffect(() => {
    async function fetchData() {
        setIsLoading(true);
        const [fetchedClients, fetchedUsers] = await Promise.all([getActiveClients(), getUsers()]);
        setClients(fetchedClients);
        setUsers(fetchedUsers);
        setIsLoading(false);
    }
    if (isOpen) fetchData();
  }, [isOpen]);

  const handleClientSelect = async (client: Client) => {
    form.setValue('clientId', client.id);
    form.setValue('clientName', client.name || '');
    form.setValue('mobileNo', client.phone || '');
    form.setValue('email', client.email || '');
    form.setValue('address', client.address || '');
    const clientDeals = await getDealsForClient(client.id);
    setDeals(clientDeals);
    form.setValue('dealId', undefined); // Reset dealId when client changes
  };
  
  const handleDealSelect = (deal: Deal) => {
      form.setValue('ticketFor', deal.dealFor || `Deal Value: ${deal.dealValue}`);
      form.setValue('dealId', deal.id);
  };

  const onSubmit = (data: TicketFormValues) => {
    startSubmitTransition(async () => {
        const result = await createTicket({
            ...data,
            dueDate: format(data.dueDate, 'yyyy-MM-dd'),
        });
        if ('error' in result) {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        } else {
            toast({ title: 'Ticket Created', description: `Ticket for ${result.client.name} has been created.` });
            onTicketCreated();
            onClose();
        }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>Create Ticket</DialogTitle></DialogHeader>
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto pr-4">
            <FormField control={form.control} name="clientId" render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Client *</FormLabel>
                    <Popover><PopoverTrigger asChild><FormControl>
                        <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                            {field.value ? clients.find(c => c.id === field.value)?.name : "Select client"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
                        </Button>
                    </FormControl></PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command>
                        <CommandInput placeholder="Search clients..."/>
                        <CommandEmpty>No client found.</CommandEmpty>
                        <CommandGroup>{clients.map(c => (
                            <CommandItem value={c.name} key={c.id} onSelect={() => handleClientSelect(c)}>{c.name}</CommandItem>
                        ))}</CommandGroup>
                    </Command></PopoverContent></Popover>
                    <FormMessage/>
                </FormItem>
            )}/>
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="clientName" render={({ field }) => (<FormItem><FormLabel>Client Name</FormLabel><FormControl><Input {...field} readOnly/></FormControl><FormMessage/></FormItem>)}/>
            <FormField control={form.control} name="mobileNo" render={({ field }) => (<FormItem><FormLabel>Mobile no.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>)}/>
            <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>)}/>
            <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>)}/>
          </div>
          <FormField control={form.control} name="ticketFor" render={({ field }) => (
              <FormItem>
                  <FormLabel>Ticket For (Product/Deal)</FormLabel>
                  <div className="flex gap-2">
                    <Select onValueChange={(dealId) => {
                        const deal = deals.find(d => d.id === dealId);
                        if (deal) handleDealSelect(deal);
                    }}>
                        <SelectTrigger className="w-[45%]">
                            <SelectValue placeholder="Select deal" />
                        </SelectTrigger>
                        <SelectContent>
                            {deals.map(d => <SelectItem key={d.id} value={d.id}>{ d.dealFor || `Deal Value: ${d.dealValue}`}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormControl>
                        <Input placeholder="Or type product/service here..." {...field} className="flex-grow"/>
                    </FormControl>
                  </div>
                  <FormMessage />
              </FormItem>
          )}/>
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="priority" render={({ field }) => (<FormItem><FormLabel>Priority *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{TICKET_PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>)}/>
            <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value as TicketStatus}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{TICKET_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>)}/>
          </div>
          <FormField control={form.control} name="subject" render={({ field }) => (<FormItem><FormLabel>Subject *</FormLabel><FormControl><Input placeholder="Briefly describe the issue" {...field}/></FormControl><FormMessage/></FormItem>)}/>
          <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Problem Description *</FormLabel><FormControl><Textarea placeholder="Provide a detailed description of the problem" {...field}/></FormControl><FormMessage/></FormItem>)}/>
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="assignedToId" render={({ field }) => (<FormItem><FormLabel>Assign To</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select user"/></SelectTrigger></FormControl><SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>)}/>
            <FormField control={form.control} name="dueDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Due Date *</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, 'PPP') : "Pick a date"}<CalendarIcon className="ml-auto h-4 w-4 opacity-50"/></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent></Popover><FormMessage/></FormItem>)}/>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Create Ticket
            </Button>
          </DialogFooter>
        </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
