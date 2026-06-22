
'use client';

import { useState, useEffect, useTransition } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { IndianRupee, Eye, Loader2, CheckCircle, XCircle, ClipboardCheck, Trash2, MoreVertical } from 'lucide-react';
import type { Expense, ExpenseStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { getAllExpensesGroupedByUser, updateExpenseStatus, deleteExpensesByStatusForUser } from '@/app/(app)/expenses/actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProposalPreviewDialog } from '@/app/(app)/proposals/proposal-preview-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type GroupedExpenses = Record<string, { user: { id: string; name: string }; expenses: Expense[] }>;

export default function ViewExpensesPage() {
  const [groupedExpenses, setGroupedExpenses] = useState<GroupedExpenses>({});
  const [isUpdating, startUpdateTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [receiptToPreview, setReceiptToPreview] = useState<string | null>(null);

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<{ userId: string, status: 'Approved' | 'Rejected' } | null>(null);

  const fetchExpenses = async () => {
    setIsLoading(true);
    const expenses = await getAllExpensesGroupedByUser();
    setGroupedExpenses(expenses);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const calculateTotals = (expenses: Expense[]) => {
    return expenses.reduce((acc, expense) => {
        acc[expense.status] = (acc[expense.status] || 0) + expense.amount;
        return acc;
    }, {} as Record<ExpenseStatus, number>);
  };

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

  const handleDeleteRequest = (userId: string, status: 'Approved' | 'Rejected') => {
    setDeleteCandidate({ userId, status });
    setIsAlertOpen(true);
  };

  const confirmDeletion = () => {
    if (!deleteCandidate) return;

    startUpdateTransition(async () => {
        const { userId, status } = deleteCandidate;
        const result = await deleteExpensesByStatusForUser(userId, status);
        if(result.success) {
            toast({
                title: 'Expenses Deleted',
                description: `${result.count} ${status.toLowerCase()} expense(s) have been deleted.`
            });
            fetchExpenses();
        } else {
            toast({
                title: 'Error',
                description: result.error || 'Failed to delete expenses.',
                variant: 'destructive'
            });
        }
        setIsAlertOpen(false);
        setDeleteCandidate(null);
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
            {Object.values(groupedExpenses).map(({ user, expenses }) => {
                const totals = calculateTotals(expenses);
                const approvedCount = expenses.filter(e => e.status === 'Approved').length;
                const rejectedCount = expenses.filter(e => e.status === 'Rejected').length;
                return (
                <AccordionItem value={user.id} key={user.id} className="border rounded-lg bg-card">
                    <AccordionTrigger className="p-4 hover:no-underline">
                        <div className="flex items-center gap-3 flex-grow">
                            <Avatar><AvatarImage src={`https://placehold.co/40x40.png?text=${user.name.charAt(0)}`} data-ai-hint="user avatar" /><AvatarFallback>{user.name.charAt(0)}</AvatarFallback></Avatar>
                            <span className="font-semibold text-lg">{user.name}</span>
                            <Badge variant="outline">{expenses.length} expense(s) </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-end">
                            {Object.entries(totals).map(([status, total]) => (
                                <Badge key={status} variant={getStatusBadgeVariant(status as ExpenseStatus)} className="text-xs py-1 px-2">
                                    {status}: <IndianRupee className="h-2.5 w-2.5 ml-1 mr-0.5" />{total.toLocaleString('en-IN')}
                                </Badge>
                            ))}
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-0">
                        <div className="flex justify-end p-2 border-b">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" disabled={isUpdating}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Processed
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleDeleteRequest(user.id, 'Approved')} disabled={approvedCount === 0}>
                                        Delete {approvedCount} Approved
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDeleteRequest(user.id, 'Rejected')} disabled={rejectedCount === 0} className="text-destructive focus:text-destructive">
                                        Delete {rejectedCount} Rejected
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
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
                                                <Button onClick={() => handleUpdateStatus(expense.id, 'Approved')} variant="ghost" size="icon" title="Approve" disabled={isUpdating}><CheckCircle className="h-4 w-4 text-primary"/></Button>
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
            )})}
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
       <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete all "{deleteCandidate?.status}" expenses for this user. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteCandidate(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDeletion} disabled={isUpdating}>
                        {isUpdating ? "Deleting..." : "Yes, Delete"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}

