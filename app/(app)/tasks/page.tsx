
'use client';

import { useState, useEffect, useTransition } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ClipboardCheck, Loader2, PlusCircle, AlertTriangle, Trash2, MoreVertical, Clock } from 'lucide-react';
import type { GeneralTask, GeneralTaskStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { getGroupedGeneralTasks, deleteTasksByStatusForUser } from './actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


type GroupedTasks = Record<string, { user: { id: string; name: string }; tasks: GeneralTask[] }>;

export default function TasksPage() {
  const router = useRouter();
  const [groupedTasks, setGroupedTasks] = useState<GroupedTasks>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, startTransition] = useTransition();
  const { toast } = useToast();

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<{ userId: string, status: 'Completed' | 'Failed' } | null>(null);

  const fetchTasks = async () => {
    setIsLoading(true);
    const tasks = await getGroupedGeneralTasks();
    setGroupedTasks(tasks);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleDeleteRequest = (userId: string, status: 'Completed' | 'Failed') => {
    setDeleteCandidate({ userId, status });
    setIsAlertOpen(true);
  };

  const confirmDeletion = () => {
    if (!deleteCandidate) return;

    startTransition(async () => {
        const { userId, status } = deleteCandidate;
        const result = await deleteTasksByStatusForUser(userId, status);
        if(result.success) {
            toast({
                title: 'Tasks Deleted',
                description: `${result.count} ${status.toLowerCase()} task(s) have been deleted.`
            });
            fetchTasks();
        } else {
            toast({
                title: 'Error',
                description: result.error || 'Failed to delete tasks.',
                variant: 'destructive'
            });
        }
        setIsAlertOpen(false);
        setDeleteCandidate(null);
    });
  };

  const getStatusBadgeVariant = (status: GeneralTaskStatus) => {
    switch (status) {
      case 'Completed': return 'softSuccess';
      case 'Pending': return 'softPrimary';
      case 'In Progress': return 'softInfo';
      case 'Failed': return 'softDestructive';
      default: return 'outline';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'High': return 'softDestructive';
      case 'Medium': return 'softWarning';
      case 'Low': return 'softInfo';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="Manage Tasks" description="Assign and track tasks for your team." icon={ClipboardCheck} />
        <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="General Tasks"
        description="Assign and track non-follow-up tasks for your team."
        actions={<Button onClick={() => router.push('/tasks/new')}><PlusCircle className="mr-2 h-4 w-4"/>Create Task</Button>}
      />
      <div className="space-y-4">
        {Object.keys(groupedTasks).length === 0 ? (
          <Card className="border border-border/80 shadow-sm rounded-xl">
            <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
              <ClipboardCheck className="mx-auto h-12 w-12 text-muted-foreground/60 mb-3" />
              <p className="font-bold text-foreground">No tasks found.</p>
              <p className="text-xs text-muted-foreground mt-1">Click "Create Task" to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" className="w-full space-y-4" defaultValue={Object.keys(groupedTasks)}>
            {Object.values(groupedTasks).map(({ user, tasks }) => {
                const completedCount = tasks.filter(t => t.status === 'Completed').length;
                const failedCount = tasks.filter(t => t.status === 'Failed').length;
                return (
              <AccordionItem value={user.id} key={user.id} className="border border-border/80 rounded-xl bg-card shadow-sm overflow-hidden mb-2">
                <AccordionTrigger className="p-4 hover:no-underline [&[data-state=open]]:border-b border-border/50">
                  <div className="flex items-center gap-3 flex-grow text-left">
                    <Avatar className="h-9 w-9 border border-border"><AvatarImage src={`https://placehold.co/40x40.png?text=${user.name.charAt(0)}`} data-ai-hint="user avatar" /><AvatarFallback>{user.name.charAt(0)}</AvatarFallback></Avatar>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <span className="font-bold text-base text-foreground">{user.name}</span>
                      <Badge variant="softPrimary" className="w-fit text-[10px] font-semibold tracking-wide py-0 px-2">{tasks.length} task(s)</Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 pt-4">
                  <div className="flex justify-end mb-4">
                     <DropdownMenu>
                       <DropdownMenuTrigger asChild>
                         <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold hover:bg-muted" disabled={isProcessing}>
                           <Trash2 className="mr-2 h-3.5 w-3.5 text-muted-foreground" /> Delete Tasks
                           <MoreVertical className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
                         </Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent align="end">
                         <DropdownMenuItem onClick={() => handleDeleteRequest(user.id, 'Completed')} disabled={completedCount === 0} className="text-xs font-medium">
                            Delete {completedCount} Completed Task(s)
                         </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteRequest(user.id, 'Failed')} disabled={failedCount === 0} className="text-xs font-semibold text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/20">
                            Delete {failedCount} Failed Task(s)
                         </DropdownMenuItem>
                       </DropdownMenuContent>
                     </DropdownMenu>
                  </div>
                  <div className="space-y-3">
                    {tasks.map(task => {
                      const isTaskPastDue = isPast(task.taskDate) && !['Completed', 'Failed'].includes(task.status);
                      return (
                        <div key={task.id} className="p-4 border border-border/50 rounded-xl bg-muted/10 hover:bg-muted/20 transition-all duration-200">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                             <div className="space-y-1.5 flex-grow">
                                <p className="font-semibold text-foreground text-sm sm:text-base">{task.comment}</p>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1 font-medium"><Clock className="h-3.5 w-3.5 text-muted-foreground/85" /> Due: {format(task.taskDate, 'dd MMM, yyyy p')}</span>
                                    <span className="flex items-center gap-1.5 font-medium">Priority: <Badge variant={getPriorityBadgeVariant(task.priority) as any} className="text-[10px] py-0 px-2 font-semibold capitalize">{task.priority}</Badge></span>
                                    {isTaskPastDue && <Badge variant="softDestructive" className="flex items-center gap-1 text-[10px] font-bold py-0.5"><AlertTriangle className="h-3 w-3" /> Overdue by {formatDistanceToNow(task.taskDate)}</Badge>}
                                </div>
                             </div>
                             <Badge variant={getStatusBadgeVariant(task.status) as any} className="text-[10px] font-bold py-0.5 px-2.5 uppercase tracking-wider">{task.status}</Badge>
                          </div>
                          <div className="mt-3.5 pt-3.5 border-t border-border/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                             <p className="text-[11px] text-muted-foreground">
                                 Created by <span className="font-semibold text-foreground/85">{task.createdBy?.name || 'System'}</span> &bull; Last updated {formatDistanceToNow(task.updatedAt, { addSuffix: true })}
                             </p>
                             {task.status === 'Failed' && task.reason && (
                                 <p className="text-[11px] text-rose-500 font-medium bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/25"><span className="font-bold">Reason:</span> {task.reason}</p>
                             )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )})}
          </Accordion>
        )}
      </div>

       <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete all "{deleteCandidate?.status}" tasks for this user.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteCandidate(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDeletion} disabled={isProcessing}>
                        {isProcessing ? "Deleting..." : "Yes, Delete"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
