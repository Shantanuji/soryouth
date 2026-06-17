
'use client';

import type { Lead, Client, DroppedLead } from '@/types';
import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit2, Trash2, MoreVertical, ArrowUpDown, UsersRound } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { format, parseISO, isValid } from 'date-fns';
import type { LeadSortConfig, ClientSortConfig, DroppedLeadSortConfig } from '@/types';

type Item = Lead | Client | DroppedLead;

interface LeadsTableProps<T extends Item> {
  items: T[];
  viewType: 'active' | 'dropped' | 'client';
  onEdit?: (item: T) => void;
  onDelete?: (itemId: string) => void;
  sortConfig?: { key: keyof T; direction: 'ascending' | 'descending' } | null;
  requestSort?: (key: keyof T) => void;
  columnVisibility?: Record<string, boolean>;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  allFilteredIds: string[];
  currentPage?: number;
}

const formatDate = (dateString?: string | null) => {
  if (!dateString) return '-';
  try {
    const date = parseISO(dateString);
    if (isValid(date)) {
      return format(date, 'dd-MM-yyyy');
    }
    return dateString;
  } catch (e) {
    return dateString;
  }
};

export function LeadsTable<T extends Item>({ items, viewType, onEdit, onDelete, sortConfig, requestSort, columnVisibility, selectedIds, setSelectedIds, allFilteredIds, currentPage = 1}: LeadsTableProps<T>) {

  const searchParams = useSearchParams();

  const handleRowClick = () => {
    const itemIdsOnCurrentPage = items.map(item => item.id);
    sessionStorage.setItem('navigation_ids', JSON.stringify(itemIdsOnCurrentPage));
  };

  const getSourceBadgeVariant = (source?: string | null) => {
    if (!source) return 'outline';
    const lowerSource = source.toLowerCase();
    if (lowerSource.includes('facebook')) return 'softPrimary';
    if (lowerSource.includes('website') || lowerSource.includes('online')) return 'softSecondary';
    if (lowerSource.includes('referral')) return 'softSuccess';
    return 'softInfo';
  };

  const getStatusBadgeVariant = (status?: string | null) => {
    if (!status) return 'outline';
    const lowerStatus = status.toLowerCase();
    if (['lost', 'dropped', 'inactive', 'expired'].includes(lowerStatus)) return 'softDestructive';
    if (['deal done', 'completed', 'active', 'agreement', 'installer', 'commissioning', 'installation', 'handover', 'procurement'].includes(lowerStatus)) return 'softSuccess';
    if (['fresher', 'new lead', 'new amc'].includes(lowerStatus)) return 'softPrimary';
    return 'softInfo';
  };

  const getPriorityBadgeVariant = (priority?: string | null) => {
    if (!priority) return 'outline';
    const lowerPriority = priority.toLowerCase();
    if (['hot', 'high'].includes(lowerPriority)) return 'softDestructive';
    if (lowerPriority === 'medium') return 'softWarning';
    return 'softInfo';
  };

  const getSortIndicator = (key: keyof T) => {
    if (!requestSort || !sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    }
    return sortConfig.direction === 'ascending' ?
      <ArrowUpDown className="ml-1 h-3 w-3 transform rotate-0 text-primary" /> :
      <ArrowUpDown className="ml-1 h-3 w-3 transform rotate-180 text-primary" />;
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    setSelectedIds(checked === true ? items.map((item) => item.id) : []);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((selectedId) => selectedId !== id)
    );
  };

  const renderHeaderCell = (label: string, sortKey: string) => (
    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap py-3">
      {requestSort ? (
        <Button variant="ghost" size="sm" className="px-1 py-0 h-auto text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-transparent hover:text-foreground" onClick={() => requestSort(sortKey as keyof T)}>
          {label} {getSortIndicator(sortKey as keyof T)}
        </Button>
      ) : (
        label
      )}
    </TableHead>
  );

  const renderRow = (item: T, index: number) => {
    const baseHref = viewType === 'client' ? `/clients/${item.id}` :
                 viewType === 'dropped' ? `/dropped-leads/${item.id}` :
                 `/leads/${item.id}`;
    const href = `${baseHref}?${searchParams.toString()}`;
    
    return (
     <TableRow key={item.id} className="hover:bg-muted/10 border-b border-border/40 transition-colors" data-state={selectedIds.includes(item.id) ? 'selected' : undefined}>
      <TableCell className="py-3.5">
        <Checkbox 
          id={`select-lead-${item.id}`} 
          aria-label={`Select lead ${item.name}`} 
          checked={selectedIds.includes(item.id)}
          onCheckedChange={(checked) => handleSelectOne(item.id, !!checked)}
          className="border-muted-foreground/45"
        />
      </TableCell>
      <TableCell className="font-medium py-3.5">
        <Link href={href} className="hover:underline text-primary font-semibold" onClick={handleRowClick}>
          {item.name}
        </Link>
      </TableCell>
      {(!columnVisibility || columnVisibility.email) && <TableCell className="py-3.5 text-xs text-muted-foreground">{item.email || '-'}</TableCell>}
      {(!columnVisibility || columnVisibility.phone) && <TableCell className="py-3.5 text-xs font-medium">{item.phone || '-'}</TableCell>}
      {(!columnVisibility || columnVisibility.status) && (
        <TableCell className="py-3.5">
          <Badge variant={getStatusBadgeVariant(item.status) as any} className="capitalize font-semibold text-[10px] tracking-wide px-2 py-0.5">
            {item.status}
          </Badge>
        </TableCell>
      )}
      {viewType === 'dropped' && (!columnVisibility || columnVisibility.dropReason) && <TableCell className="py-3.5 text-xs">{(item as DroppedLead).dropReason || '-'}</TableCell>}
      {(!columnVisibility || columnVisibility.lastCommentText) && (
        <TableCell className="py-3.5 text-xs">
          <div className="font-medium truncate max-w-[200px]">{item.lastCommentText || '-'}</div>
          {item.lastCommentDate && <div className="text-[10px] text-muted-foreground mt-0.5">{formatDate(item.lastCommentDate)}</div>}
        </TableCell>
      )}
      {(viewType === 'active' || viewType === 'client') && (!columnVisibility || columnVisibility.nextFollowUpDate) && (
        <TableCell className="py-3.5 text-xs text-muted-foreground">
          {(item as Lead | Client).nextFollowUpDate ? `${formatDate((item as Lead | Client).nextFollowUpDate)} ${(item as Lead | Client).nextFollowUpTime || ''}`.trim() : '-'}
        </TableCell>
      )}
      {(!columnVisibility || columnVisibility.followupCount) && <TableCell className="py-3.5 text-center text-xs font-semibold">{item.followupCount || 0}</TableCell>}
      {viewType === 'active' && (!columnVisibility || columnVisibility.calls) && <TableCell className="py-3.5 text-center text-xs">{0}</TableCell>}
      {(!columnVisibility || columnVisibility.kilowatt) && <TableCell className="py-3.5 text-xs font-semibold">{item.kilowatt !== undefined ? `${item.kilowatt} kW` : '-'}</TableCell>}
      {viewType === 'active' && (!columnVisibility || columnVisibility.source) && (
        <TableCell className="py-3.5">
          {(item as Lead).source ? (
            <Badge variant={getSourceBadgeVariant((item as Lead).source) as any} className="font-semibold text-[10px] tracking-wide px-2 py-0.5">
              {(item as Lead).source}
            </Badge>
          ) : (
            '-'
          )}
        </TableCell>
      )}
      {(!columnVisibility || columnVisibility.priority) && (
        <TableCell className="py-3.5">
          {item.priority ? (
            <Badge variant={getPriorityBadgeVariant(item.priority) as any} className="capitalize font-semibold text-[10px] tracking-wide px-2 py-0.5">
              {item.priority}
            </Badge>
          ) : (
            '-'
          )}
        </TableCell>
      )}
      {(!columnVisibility || columnVisibility.assignedTo) && <TableCell className="py-3.5 text-xs font-medium">{item.assignedTo || '-'}</TableCell>}
      
      {onEdit && onDelete && (
        <TableCell className="text-right py-3.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-7 w-7 p-0 rounded-circle hover:bg-muted">
                <span className="sr-only">Open menu</span>
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(item)}>
                <Edit2 className="mr-2 h-3.5 w-3.5" /> Edit
              </DropdownMenuItem>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30">
                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete "{item.name}".
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(item.id)} className={buttonVariants({ variant: "destructive" })}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      )}
     </TableRow>
    );
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-sm border border-border/80 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="w-full align-middle mb-0">
              <TableHeader className="bg-muted/15 border-b border-border/60">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[50px] py-3">
                    <Checkbox
                      id="selectAll"
                      aria-label="Select all items"
                      checked={
                        items.length > 0 && selectedIds.length === items.length
                      }
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      className="border-muted-foreground/45"
                    />
                  </TableHead>
                  {renderHeaderCell('Name', 'name')}
                  {(!columnVisibility || columnVisibility.email) && renderHeaderCell('Email', 'email')}
                  {(!columnVisibility || columnVisibility.phone) && renderHeaderCell('Mobile no.', 'phone')}
                  {(!columnVisibility || columnVisibility.status) && renderHeaderCell('Stage', 'status')}
                  {viewType === 'dropped' && (!columnVisibility || columnVisibility.dropReason) && renderHeaderCell('Drop Reason', 'dropReason')}
                  {(!columnVisibility || columnVisibility.lastCommentText) && renderHeaderCell('Last comment', 'lastCommentText')}
                  {(viewType === 'active' || viewType === 'client') && (!columnVisibility || columnVisibility.nextFollowUpDate) && renderHeaderCell('Next follow-up', 'nextFollowUpDate')}
                  {(!columnVisibility || columnVisibility.followupCount) && renderHeaderCell('Followups', 'followupCount')}
                  {viewType === 'active' && (!columnVisibility || columnVisibility.calls) && <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap py-3">Calls</TableHead>}
                  {(!columnVisibility || columnVisibility.kilowatt) && renderHeaderCell('Kilowatt', 'kilowatt')}
                  {viewType === 'active' && (!columnVisibility || columnVisibility.source) && renderHeaderCell('Source', 'source')}
                  {(!columnVisibility || columnVisibility.priority) && renderHeaderCell('Priority', 'priority')}
                  {(!columnVisibility || columnVisibility.assignedTo) && renderHeaderCell('Assigned To', 'assignedTo')}
                  {onEdit && onDelete && <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/40">
                {items.map(renderRow)}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {items.length === 0 && (
        <div className="text-center text-muted-foreground py-12 bg-card border border-border/80 rounded-xl shadow-sm">
            <UsersRound className="mx-auto h-10 w-10 text-muted-foreground/60 mb-3" />
            <h3 className="text-base font-bold text-foreground">No items found.</h3>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or add a new item.</p>
        </div>
      )}
    </div>
  );
}
