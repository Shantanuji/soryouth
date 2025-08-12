
'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { IndianRupee, Receipt, UploadCloud, Eye, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { EXPENSE_CATEGORIES, EXPENSE_STATUSES } from '@/lib/constants';
import type { Expense, ExpenseCategory, ExpenseStatus, CreateExpenseData } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format, isValid, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { createExpense, getExpensesForCurrentUser } from './actions';
import { ProposalPreviewDialog } from '@/app/(app)/proposals/proposal-preview-dialog';

const expenseSchema = z.object({
  dateRange: z.object({
    from: z.date({ required_error: "A start date is required." }),
    to: z.date().optional(),
  }),
  category: z.enum(EXPENSE_CATEGORIES, { required_error: "Category is required." }),
  amount: z.coerce.number().positive({ message: 'Amount must be positive and greater than 0.' }),
  description: z.string().min(5, { message: 'Description must be at least 5 characters long.' }),
  receipt: z.instanceof(File).optional().nullable()
    .refine(file => !file || file.size <= 5 * 1024 * 1024, `Max file size is 5MB.`)
    .refine(file => !file || ['image/jpeg', 'image/png', 'application/pdf'].includes(file.type), '.jpg, .png, or .pdf files are accepted.'),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

export default function ExpensesPage() {
  const [submittedExpenses, setSubmittedExpenses] = useState<Expense[]>([]);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [receiptToPreview, setReceiptToPreview] = useState<string | null>(null);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      dateRange: { from: new Date(), to: undefined },
      category: undefined,
      amount: 0,
      description: '',
      receipt: null,
    },
  });
  
  const fetchExpenses = async () => {
    setIsLoading(true);
    const expenses = await getExpensesForCurrentUser();
    setSubmittedExpenses(expenses);
    setIsLoading(false);
  };
  
  useEffect(() => {
    fetchExpenses();
  }, []);

  const expenseTotals = useMemo(() => {
    return submittedExpenses.reduce((acc, expense) => {
      acc[expense.status] = (acc[expense.status] || 0) + expense.amount;
      return acc;
    }, {} as Record<ExpenseStatus, number>);
  }, [submittedExpenses]);

  const onSubmit = (values: ExpenseFormValues) => {
    startSubmitTransition(async () => {
        try {
            let receiptUrl: string | undefined = undefined;
            if (values.receipt) {
                const formData = new FormData();
                formData.append('file', values.receipt);
                formData.append('folder', 'expense-receipts');
                const uploadResponse = await fetch('/api/templates/upload', {
                    method: 'POST',
                    body: formData,
                });
                const uploadResult = await uploadResponse.json();
                if (!uploadResponse.ok || !uploadResult.success) {
                    throw new Error(uploadResult.error || 'Failed to upload receipt.');
                }
                receiptUrl = uploadResult.filePath;
            }

            const dataToSave: CreateExpenseData = {
                date: format(values.dateRange.from, 'yyyy-MM-dd'),
                endDate: values.dateRange.to ? format(values.dateRange.to, 'yyyy-MM-dd') : undefined,
                category: values.category,
                amount: values.amount,
                description: values.description,
                receiptUrl,
                userId: '', // This will be set on the server
            };

            const result = await createExpense(dataToSave);

            if ('error' in result) {
                throw new Error(result.error);
            }
            
            toast({ title: 'Expense Submitted', description: 'Your expense has been submitted for review.' });
            form.reset();
            form.setValue('dateRange', { from: new Date(), to: undefined });
            fetchExpenses();

        } catch (error) {
            toast({ title: 'Submission Failed', description: (error as Error).message, variant: 'destructive' });
        }
    });
  };

  const getStatusBadgeVariant = (status: ExpenseStatus) => {
    switch (status) {
      case 'Approved': return 'default';
      case 'Pending': return 'secondary';
      case 'Rejected': return 'destructive';
      default: return 'outline';
    }
  };


  return (
    <>
      <PageHeader
        title="Manage Expenses"
        description="Submit new expenses and view the status of your submissions."
        icon={Receipt}
        actions={
          <div className="flex flex-wrap gap-2">
            {Object.entries(expenseTotals).map(([status, total]) => (
              <Badge key={status} variant={getStatusBadgeVariant(status as ExpenseStatus)} className="text-sm py-1 px-3">
                {status}: <IndianRupee className="h-3 w-3 ml-1.5 mr-0.5" />{total.toLocaleString('en-IN')}
              </Badge>
            ))}
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Submit New Expense</CardTitle>
            <CardDescription>Fill out the form to record a new expense. Select a single date or a date range.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="dateRange"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date of Expense</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("w-full justify-start text-left font-normal", !field.value.from && "text-muted-foreground")}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value.from ? (
                                field.value.to ? (
                                  <> {format(field.value.from, "LLL dd, y")} - {format(field.value.to, "LLL dd, y")} </>
                                ) : (
                                  format(field.value.from, "LLL dd, y")
                                )
                              ) : (
                                <span>Pick a date or range</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={field.value.from}
                            selected={field.value}
                            onSelect={field.onChange}
                            numberOfMonths={1}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select expense category" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map(cat => ( <SelectItem key={cat} value={cat}>{cat}</SelectItem> ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl><Textarea placeholder="Detailed description of the expense..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="receipt"
                  render={({ field: { onChange, value, ...rest }}) => (
                    <FormItem>
                      <FormLabel>Upload Receipt (Optional)</FormLabel>
                      <FormControl>
                        <Input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => onChange(e.target.files?.[0] || null)} {...rest} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Submitting...</> : 'Submit Expense'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>My Submitted Expenses</CardTitle>
            <CardDescription>A list of your recently submitted expenses and their status.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <div className="text-center p-8"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></div> :
            submittedExpenses.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                    <Receipt className="mx-auto h-12 w-12 mb-4" />
                    <p>No expenses submitted yet.</p>
                </div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date(s)</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submittedExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{expense.endDate ? `${expense.date} to ${expense.endDate}`: expense.date}</TableCell>
                    <TableCell>{expense.category}</TableCell>
                    <TableCell className="text-right font-medium">
                      <div className="flex items-center justify-end">
                        <IndianRupee className="h-4 w-4 mr-0.5 text-muted-foreground" />
                        {expense.amount.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(expense.status)}>{expense.status}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {expense.receiptUrl ? (
                        <Button variant="ghost" size="icon" title="View Receipt" onClick={() => setReceiptToPreview(expense.receiptUrl!)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      ) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>
      </div>
      {receiptToPreview && (
        <ProposalPreviewDialog
            isOpen={!!receiptToPreview}
            onClose={() => setReceiptToPreview(null)}
            pdfUrl={receiptToPreview}
            docxUrl={null}
        />
      )}
    </>
  );
}
