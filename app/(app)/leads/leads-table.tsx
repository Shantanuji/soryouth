
'use client';

import type { Lead, Client, DroppedLead } from '@/types';
import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  onViewDetails?: (item: T) => void;
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

// -------------------------------------------------------
// Dhonu badge-soft-* helper functions
// -------------------------------------------------------
const getStatusBadgeClass = (status?: string | null): string => {
  if (!status) return 'badge-soft-secondary';
  const s = status.toLowerCase();
  if (['lost', 'dropped', 'inactive', 'expired'].includes(s)) return 'badge-soft-danger';
  if (['deal done', 'completed', 'active', 'agreement', 'installer', 'commissioning', 'installation', 'handover', 'procurement'].includes(s)) return 'badge-soft-success';
  if (['fresher', 'new lead', 'new amc'].includes(s)) return 'badge-soft-primary';
  return 'badge-soft-info';
};

const getSourceBadgeClass = (source?: string | null): string => {
  if (!source) return 'badge-soft-secondary';
  const s = source.toLowerCase();
  if (s.includes('facebook')) return 'badge-soft-primary';
  if (s.includes('website') || s.includes('online')) return 'badge-soft-info';
  if (s.includes('referral')) return 'badge-soft-success';
  return 'badge-soft-secondary';
};

const getPriorityBadgeClass = (priority?: string | null): string => {
  if (!priority) return 'badge-soft-secondary';
  const p = priority.toLowerCase();
  if (['hot', 'high'].includes(p)) return 'badge-soft-danger';
  if (p === 'medium') return 'badge-soft-warning';
  return 'badge-soft-info';
};

export function LeadsTable<T extends Item>({
  items,
  viewType,
  onEdit,
  onViewDetails,
  onDelete,
  sortConfig,
  requestSort,
  columnVisibility,
  selectedIds,
  setSelectedIds,
  allFilteredIds,
  currentPage = 1,
}: LeadsTableProps<T>) {
  const searchParams = useSearchParams();

  const handleRowClick = () => {
    const itemIdsOnCurrentPage = items.map(item => item.id);
    sessionStorage.setItem('navigation_ids', JSON.stringify(itemIdsOnCurrentPage));
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <i className="ri ri-arrow-up-down-line text-muted-foreground/60 ml-1" />;
    }
    return sortConfig.direction === 'ascending'
      ? <i className="ri ri-arrow-up-line text-primary ml-1" />
      : <i className="ri ri-arrow-down-line text-primary ml-1" />;
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    setSelectedIds(checked === true ? items.map((item) => item.id) : []);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((selectedId) => selectedId !== id)
    );
  };

  const renderSortableHeader = (label: string, sortKey: string) => (
    <th>
      {requestSort ? (
        <button
          className="flex items-center text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          onClick={() => requestSort(sortKey as keyof T)}
        >
          {label} {getSortIcon(sortKey)}
        </button>
      ) : (
        label
      )}
    </th>
  );

  const renderRow = (item: T, index: number) => {
    const baseHref = viewType === 'client' ? `/clients/${item.id}` :
                 viewType === 'dropped' ? `/dropped-leads/${item.id}` :
                 `/leads/${item.id}`;
    const href = `${baseHref}?${searchParams.toString()}`;

    return (
      <tr key={item.id} data-state={selectedIds.includes(item.id) ? 'selected' : undefined}>
        <td>
          <Checkbox
            id={`select-lead-${item.id}`}
            aria-label={`Select lead ${item.name}`}
            checked={selectedIds.includes(item.id)}
            onCheckedChange={(checked) => handleSelectOne(item.id, !!checked)}
            className="border-muted-foreground/45"
          />
        </td>
        <td>
          <div className="flex flex-col">
            <Link
              href={href}
              className="font-semibold text-sm text-primary hover:underline underline-offset-2"
              onClick={(e) => {
                if (onViewDetails) {
                  e.preventDefault();
                  onViewDetails(item);
                } else {
                  handleRowClick();
                }
              }}
            >
              {item.name}
            </Link>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
              {item.phone && (
                <span className="flex items-center gap-1">
                  <i className="ri-phone-fill text-muted-foreground/70" /> {item.phone}
                </span>
              )}
              {item.email && (
                <span className="flex items-center gap-1">
                  <i className="ri-mail-fill text-muted-foreground/70" /> {item.email}
                </span>
              )}
            </div>
          </div>
        </td>
        {(!columnVisibility || columnVisibility.status) && (
          <td>
            <span className={`${getStatusBadgeClass(item.status)} capitalize`}>
              {item.status}
            </span>
          </td>
        )}
        {viewType === 'dropped' && (!columnVisibility || columnVisibility.dropReason) && (
          <td>{(item as DroppedLead).dropReason || '-'}</td>
        )}
        {(!columnVisibility || columnVisibility.lastCommentText) && (
          <td>
            <div className="font-medium truncate max-w-[200px]">{item.lastCommentText || '-'}</div>
            {item.lastCommentDate && (
              <div className="text-[10px] text-muted-foreground mt-0.5">{formatDate(item.lastCommentDate)}</div>
            )}
          </td>
        )}
        {(viewType === 'active' || viewType === 'client') && (!columnVisibility || columnVisibility.nextFollowUpDate) && (
          <td className="text-muted-foreground">
            {(item as Lead | Client).nextFollowUpDate
              ? `${formatDate((item as Lead | Client).nextFollowUpDate)} ${(item as Lead | Client).nextFollowUpTime || ''}`.trim()
              : '-'}
          </td>
        )}
        {(!columnVisibility || columnVisibility.followupCount) && (
          <td className="text-center font-semibold">{item.followupCount || 0}</td>
        )}
        {viewType === 'active' && (!columnVisibility || columnVisibility.calls) && (
          <td className="text-center">0</td>
        )}
        {(!columnVisibility || columnVisibility.kilowatt) && (
          <td className="font-semibold">{item.kilowatt !== undefined ? `${item.kilowatt} kW` : '-'}</td>
        )}
        {viewType === 'active' && (!columnVisibility || columnVisibility.source) && (
          <td>
            {(item as Lead).source ? (
              <span className={getSourceBadgeClass((item as Lead).source)}>
                {(item as Lead).source}
              </span>
            ) : '-'}
          </td>
        )}
        {(!columnVisibility || columnVisibility.priority) && (
          <td>
            {item.priority ? (
              <span className={`${getPriorityBadgeClass(item.priority)} capitalize`}>
                {item.priority}
              </span>
            ) : '-'}
          </td>
        )}
        {(!columnVisibility || columnVisibility.assignedTo) && (
          <td className="font-medium">{item.assignedTo || '-'}</td>
        )}

        {onEdit && onDelete && (
          <td className="text-right">
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                onClick={() => onEdit(item)}
                title="Edit Lead"
              >
                <i className="ri-edit-2-line text-lg" />
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                    title="Delete Lead"
                  >
                    <i className="ri-delete-bin-line text-lg" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete &quot;{item.name}&quot;.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(item.id)}
                      className={buttonVariants({ variant: "destructive" })}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </td>
        )}
      </tr>
    );
  };

  return (
    <div className="space-y-4">
      {/* Dhonu card with borderless card-header and dhonu-table */}
      <Card className="shadow-sm border-0 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="dhonu-table">
              <thead>
                <tr>
                  <th className="w-[44px]">
                    <Checkbox
                      id="selectAll"
                      aria-label="Select all items"
                      checked={items.length > 0 && selectedIds.length === items.length}
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      className="border-muted-foreground/45"
                    />
                  </th>
                  {renderSortableHeader('Contact Info', 'name')}
                  {(!columnVisibility || columnVisibility.status) && renderSortableHeader('Stage', 'status')}
                  {viewType === 'dropped' && (!columnVisibility || columnVisibility.dropReason) && renderSortableHeader('Drop Reason', 'dropReason')}
                  {(!columnVisibility || columnVisibility.lastCommentText) && renderSortableHeader('Last comment', 'lastCommentText')}
                  {(viewType === 'active' || viewType === 'client') && (!columnVisibility || columnVisibility.nextFollowUpDate) && renderSortableHeader('Next follow-up', 'nextFollowUpDate')}
                  {(!columnVisibility || columnVisibility.followupCount) && renderSortableHeader('Followups', 'followupCount')}
                  {viewType === 'active' && (!columnVisibility || columnVisibility.calls) && <th>Calls</th>}
                  {(!columnVisibility || columnVisibility.kilowatt) && renderSortableHeader('Kilowatt', 'kilowatt')}
                  {viewType === 'active' && (!columnVisibility || columnVisibility.source) && renderSortableHeader('Source', 'source')}
                  {(!columnVisibility || columnVisibility.priority) && renderSortableHeader('Priority', 'priority')}
                  {(!columnVisibility || columnVisibility.assignedTo) && renderSortableHeader('Assigned To', 'assignedTo')}
                  {onEdit && onDelete && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {items.map(renderRow)}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Empty state — Dhonu style */}
      {items.length === 0 && (
        <div className="text-center py-12 bg-card border-0 rounded-xl shadow-sm">
          <div className="avatar-circle-primary mx-auto mb-3">
            <i className="ri ri-group-line text-xl" />
          </div>
          <h3 className="text-sm font-bold text-foreground">No items found.</h3>
          <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or add a new item.</p>
        </div>
      )}
    </div>
  );
}
