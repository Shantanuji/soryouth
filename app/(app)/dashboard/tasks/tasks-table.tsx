
'use client';

import type { FollowUp } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreVertical, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format, parseISO } from 'date-fns';

interface TasksTableProps {
  tasks: FollowUp[];
  onStatusChange: (taskId: string, newStatus: 'Open' | 'Closed') => void;
  isLoading: boolean;
}

export function TasksTable({ tasks, onStatusChange, isLoading }: TasksTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 border rounded-md">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"><Checkbox /></TableHead>
            <TableHead>#</TableHead>
            <TableHead>Task date</TableHead>
            <TableHead>Task time</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Task</TableHead>
            <TableHead>User</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                No tasks found for the selected filters.
              </TableCell>
            </TableRow>
          ) : (
            tasks.map((task, index) => {
              const customer = task.lead || task.client;
              return (
                <TableRow key={task.id}>
                  <TableCell><Checkbox /></TableCell>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{task.taskDate ? format(parseISO(task.taskDate), 'dd-MM-yyyy') : '-'}</TableCell>
                  <TableCell>{task.taskTime || '-'}</TableCell>
                  <TableCell>
                    {customer ? (
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.phone}</p>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{task.comment}</TableCell>
                  <TableCell>
                      <Avatar className="h-8 w-8">
                         <AvatarImage src={`https://placehold.co/32x32.png?text=${task.taskForUser?.charAt(0)}`} data-ai-hint="user avatar" />
                         <AvatarFallback>{task.taskForUser?.charAt(0)}</AvatarFallback>
                      </Avatar>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onStatusChange(task.id, task.taskStatus === 'Open' ? 'Closed' : 'Open')}>
                           Mark as {task.taskStatus === 'Open' ? 'Closed' : 'Open'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
