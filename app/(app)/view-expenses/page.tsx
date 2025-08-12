
'use client';

import { useState, useEffect, useTransition } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { IndianRupee, Eye, Loader2, CheckCircle, XCircle, ClipboardCheck } from 'lucide-react';
import type { Expense, ExpenseStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { getAllExpensesGroupedByUser, updateExpenseStatus } from '@/app/(app)/expenses/actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProposalPreviewDialog } from '@/app/(app)/proposals/proposal-preview-dialog';

type GroupedExpenses = Record<string, { user: { id: string; name: string }; expenses: Expense[] }>;

export default function ViewExpensesPage() {
  const [groupedExpenses, setGroupedExpenses] = useState<GroupedExpenses>({});
  const [isUpdating, startUpdateTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [receiptToPreview, setReceiptToPreview] = useState<string | null>(null);

  const fetchExpenses = async () => {
    setIsLoading(true);
    const expenses = await getAllExpensesGroupedByUser();
    setGroupedExpenses(expenses);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleUpdateStatus = (expenseId: string, status: 'Approved' | 'Rejected') => {
    startUpdateTransition(async () => {
        const result = await updateExpenseStatus(expenseId, status);
        if (result.success) {
            toast({ title: 'Status Updated', description: `Expense has been ${status.toLowerCase()}.` });
            fetchExpenses();
        } else {
            toast({ title: 'Error', description: result.error || 'Failed to update status.', variant: 'destructive' });
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

  if (isLoading) {
    return (
        <>
            <PageHeader title="View & Approve Expenses" description="Review expenses submitted by your team." icon={ClipboardCheck} />
            <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        </>
    );
  }

  return (
    <>
      <PageHeader
        title="View & Approve Expenses"
        description="Review expenses submitted by your team."
        icon={ClipboardCheck}
      />
      <div className="space-y-4">
        {Object.keys(groupedExpenses).length === 0 ? (
             <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                    <ClipboardCheck className="mx-auto h-12 w-12 mb-2" />
                    <p>No expenses have been submitted yet.</p>
                </CardContent>
            </Card>
        ) : (
            <Accordion type="multiple" className="w-full space-y-4">
            {Object.values(groupedExpenses).map(({ user, expenses }) => (
                <AccordionItem value={user.id} key={user.id} className="border rounded-lg bg-card">
                    <AccordionTrigger className="p-4 hover:no-underline">
                        <div className="flex items-center gap-3">
                            <Avatar><AvatarImage src={`https://placehold.co/40x40.png?text=${user.name.charAt(0)}`} data-ai-hint="user avatar" /><AvatarFallback>{user.name.charAt(0)}</AvatarFallback></Avatar>
                            <span className="font-semibold text-lg">{user.name}</span>
                            <Badge variant="outline">{expenses.length} expense(s) - Rs. </Badge>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-0">
                        <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead>Date(s)</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-center">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expenses.map((expense) => (
                                <TableRow key={expense.id}>
                                    <TableCell>{expense.endDate ? `${expense.date} to ${expense.endDate}` : expense.date}</TableCell>
                                    <TableCell>{expense.category}</TableCell>
                                    <TableCell className="max-w-xs truncate">{expense.description}</TableCell>
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
                                        <div className="flex items-center justify-center gap-1">
                                            {expense.receiptUrl && <Button onClick={() => setReceiptToPreview(expense.receiptUrl!)} variant="ghost" size="icon" title="View Receipt"><Eye className="h-4 w-4" /></Button>}
                                            {expense.status === 'Pending' && (
                                                <>
                                                <Button onClick={() => handleUpdateStatus(expense.id, 'Approved')} variant="ghost" size="icon" title="Approve" disabled={isUpdating}><CheckCircle className="h-4 w-4 text-green-600"/></Button>
                                                <Button onClick={() => handleUpdateStatus(expense.id, 'Rejected')} variant="ghost" size="icon" title="Reject" disabled={isUpdating}><XCircle className="h-4 w-4 text-destructive"/></Button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            ))}
            </Accordion>
        )}
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
