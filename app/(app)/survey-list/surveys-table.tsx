

'use client';

import type { SiteSurvey, SurveySortConfig, ConsumerCategoryType, UserOptionType } from '@/types';
import React from 'react';
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
import { Edit2, Trash2, MoreVertical, ArrowUpDown, ClipboardList, IndianRupee } from 'lucide-react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';

interface SurveysTableProps {
  surveys: SiteSurvey[];
  onEditSurvey?: (survey: SiteSurvey) => void;
  onDeleteSurvey?: (surveyId: string) => void;
  sortConfig?: SurveySortConfig | null;
  requestSort?: (key: keyof SiteSurvey) => void;
  columnVisibility?: Record<string, boolean>;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
}

const formatDateInternal = (dateString?: string) => {
  if (!dateString) return '-';
  try {
    const date = parseISO(dateString);
    if (isValid(date)) {
      return format(date, 'dd MMM, yyyy');
    }
    return dateString; 
  } catch (e) {
    return dateString; 
  }
};

const allColumnsConfig: { key: keyof SiteSurvey; label: string }[] = [
    { key: 'surveyNumber', label: 'Survey No.' },
    { key: 'consumerName', label: 'Client Name' },
    { key: 'location', label: 'Location' },
    { key: 'date', label: 'Survey Date' },
    { key: 'surveyorName', label: 'Surveyor' },
    { key: 'consumerCategory', label: 'Category' },
    { key: 'numberOfMeters', label: 'No. of Meters' },
    { key: 'meterRating', label: 'Meter Rating' },
    { key: 'meterPhase', label: 'Meter Phase' },
    { key: 'electricityAmount', label: 'Avg. Bill (₹)' },
    { key: 'consumerLoadType', label: 'Load Type' },
    { key: 'roofType', label: 'Roof Type' },
    { key: 'buildingHeight', label: 'Building Height' },
    { key: 'shadowFreeArea', label: 'Shadow-Free Area' },
    { key: 'discom', label: 'DISCOM' },
    { key: 'sanctionedLoad', label: 'Sanctioned Load' },
    { key: 'remark', label: 'Remark' },
];

export function SurveysTable({ surveys, onEditSurvey, onDeleteSurvey, sortConfig, requestSort, columnVisibility = {}, selectedIds, setSelectedIds }: SurveysTableProps) {
  
  const getSortIndicator = (key: keyof SiteSurvey) => {
    if (!requestSort || !sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    }
    return sortConfig.direction === 'ascending' ? 
      <ArrowUpDown className="ml-1 h-3 w-3 transform rotate-0 text-primary" /> : 
      <ArrowUpDown className="ml-1 h-3 w-3 transform rotate-180 text-primary" />;
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    setSelectedIds(checked === true ? surveys.map((item) => item.id) : []);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((selectedId) => selectedId !== id)
    );
  };
  
  const renderCell = (survey: SiteSurvey, key: keyof SiteSurvey) => {
    const value = survey[key] as any;
    
    switch (key) {
      case 'consumerName':
        const customerLink = survey.leadId ? `/leads/${survey.leadId}` : survey.clientId ? `/clients/${survey.clientId}` : '#';
        return <Link href={customerLink} className="hover:underline text-primary">{value || '-'}</Link>;
      case 'date':
        return formatDateInternal(value);
      case 'surveyorName':
        return (
             <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                    <AvatarImage src={`https://placehold.co/40x40.png?text=${value?.charAt(0) || 'S'}`} data-ai-hint="user avatar" alt={value || 'Surveyor'} />
                    <AvatarFallback>{value ? value.charAt(0).toUpperCase() : 'S'}</AvatarFallback>
                </Avatar>
                <span className="text-xs">{value || '-'}</span>
            </div>
        );
      case 'electricityAmount':
        return value ? <span className="flex items-center"><IndianRupee className="h-3 w-3 mr-0.5" />{Number(value).toLocaleString('en-IN')}</span> : '-';
      case 'surveyNumber':
        return value.slice(-8);
      case 'remark':
        return <p className="truncate max-w-[200px]">{value || '-'}</p>;
      default:
        return value || '-';
    }
  }

  const visibleColumns = allColumnsConfig.filter(col => columnVisibility[col.key] ?? true);

  return (
    <div className="space-y-4">
      <Card className="shadow-sm border-none">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/40">
                  <TableHead className="w-[50px] text-muted-foreground">
                    <Checkbox id="selectAllSurveys" aria-label="Select all surveys" 
                      checked={surveys.length > 0 && selectedIds.length === surveys.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  {visibleColumns.map(col => (
                    <TableHead key={col.key} className="text-muted-foreground whitespace-nowrap">
                      {requestSort ? (
                        <Button variant="ghost" size="sm" className="px-1 py-0 h-auto text-xs" onClick={() => requestSort(col.key)}>
                          {col.label} {getSortIndicator(col.key)}
                        </Button>
                      ) : (
                        col.label
                      )}
                    </TableHead>
                  ))}
                  {onEditSurvey && onDeleteSurvey && <TableHead className="text-right text-muted-foreground">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {surveys.map((survey) => (
                  <TableRow key={survey.id} className="hover:bg-muted/20 text-xs">
                    <TableCell>
                      <Checkbox id={`select-survey-${survey.id}`} aria-label={`Select survey ${survey.surveyNumber}`} 
                        checked={selectedIds.includes(survey.id)}
                        onCheckedChange={(checked) => handleSelectOne(survey.id, !!checked)}
                      />
                    </TableCell>
                    {visibleColumns.map(col => (
                       <TableCell key={col.key} className="py-2 px-4 whitespace-nowrap">{renderCell(survey, col.key)}</TableCell>
                    ))}
                    {onEditSurvey && onDeleteSurvey && (
                      <TableCell className="text-right py-2 px-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEditSurvey(survey)} disabled>
                              <Edit2 className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/50" disabled>
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete survey "{survey.surveyNumber}".
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => onDeleteSurvey(survey.id)} className={buttonVariants({ variant: "destructive" })}>
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
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {surveys.length === 0 && (
        <div className="text-center text-muted-foreground py-12">
            <ClipboardList className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <h3 className="text-lg font-medium">No surveys found.</h3>
            <p className="text-sm">Try adjusting your filters or add a new survey.</p>
        </div>
      )}
    </div>
  );
}
