
'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { updateTaskStatus, getOverdueFollowUpTasksForCurrentUser } from '@/app/(app)/leads-list/actions';
import { Loader2, BellRing, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { TaskNotification } from '@/types';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';

const NOTIFICATION_INTERVAL = 1 * 60 * 1000; // 3 minutes

export function OverdueTaskToast() {
  const [overdueTask, setOverdueTask] = useState<TaskNotification | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const fetchAndShowTask = async () => {
    const overdueTasks = await getOverdueFollowUpTasksForCurrentUser();
    if (overdueTasks.length > 0) {
      // Pick a random task to show if there are multiple
      const randomTask = overdueTasks[Math.floor(Math.random() * overdueTasks.length)];
      setOverdueTask(randomTask);
      setIsVisible(true);
    } else {
      setOverdueTask(null);
      setIsVisible(false);
    }
  };

  useEffect(() => {
    // Initial check
    fetchAndShowTask();
    
    // Set up the recurring check
    const intervalId = setInterval(fetchAndShowTask, NOTIFICATION_INTERVAL);

    // Clean up the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, []);

  const handleMarkAsDone = () => {
    if (!overdueTask) return;
    startTransition(async () => {
      const result = await updateTaskStatus(overdueTask.id, 'Closed');
      if (result.success) {
        toast({ title: 'Task Completed', description: 'The task has been marked as done.' });
        setIsVisible(false);
        setOverdueTask(null);
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  };
  
  const handleSnooze = () => {
      setIsVisible(false);
      // The main interval will eventually bring it back if it's still overdue.
      toast({ title: 'Snoozed', description: 'You will be reminded again later.'});
  };

  if (!isVisible || !overdueTask) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in-0 slide-in-from-bottom-5">
       <Card className="w-80 shadow-2xl">
        <CardHeader className="flex flex-row items-start gap-4 space-y-0 p-4">
            <div className="bg-destructive/10 p-2 rounded-full">
                <BellRing className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-1">
                <CardTitle className="text-base">Overdue Follow-up</CardTitle>
                <CardDescription className="text-xs">
                    For: <span className="font-semibold text-foreground">{overdueTask.customerName}</span>
                </CardDescription>
            </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
            <p className="text-sm">{overdueTask.comment}</p>
        </CardContent>
        <CardFooter className="flex justify-between p-4 pt-0">
            <Button size="sm" variant="outline" onClick={handleSnooze}>Snooze</Button>
            <div className="flex gap-2">
                 <Button asChild size="sm" variant="secondary">
                     <Link href={overdueTask.link || '#'}>View</Link>
                 </Button>
                 <Button size="sm" onClick={handleMarkAsDone} disabled={isPending}>
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Done'}
                </Button>
            </div>
        </CardFooter>
       </Card>
    </div>
  );
}
