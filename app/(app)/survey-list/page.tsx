

'use client';

import React, { useState, useMemo, useEffect, useTransition } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SiteSurvey, SurveySortConfig } from '@/types';
import { Search, PlusCircle, Settings2, ListChecks, Rows, ListFilter, Trash2 } from 'lucide-react';
import { SurveysTable } from './surveys-table';
import { useToast } from "@/hooks/use-toast";
import { getSiteSurveys, deleteSurveys } from '@/app/(app)/site-survey/actions';
import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';
import { AlertDialogTrigger, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Define all possible columns for the survey list
const allColumns: Record<keyof Omit<SiteSurvey, 'id' | 'createdAt' | 'updatedAt' | 'leadId' | 'clientId' | 'droppedLeadId' | 'surveyorId' | 'electricityBillFiles' | 'status'>, string> = {
    surveyNumber: 'Survey No.',
    consumerName: 'Client Name',
    location: 'Location',
    date: 'Survey Date',
    surveyorName: 'Surveyor',
    consumerCategory: 'Category',
    numberOfMeters: 'No. of Meters',
    meterRating: 'Meter Rating',
    meterPhase: 'Meter Phase',
    electricityAmount: 'Avg. Bill (₹)',
    consumerLoadType: 'Load Type',
    roofType: 'Roof Type',
    buildingHeight: 'Building Height',
    shadowFreeArea: 'Shadow-Free Area',
    discom: 'DISCOM',
    sanctionedLoad: 'Sanctioned Load',
    remark: 'Remark',
};


export default function SurveyListPage() {
  const router = useRouter();
  const [surveys, setSurveys] = useState<SiteSurvey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, startDeleteTransition] = useTransition();
  const { toast } = useToast();
  const [sortConfig, setSortConfig] = useState<SurveySortConfig | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    surveyNumber: true,
    consumerName: true,
    location: true,
    date: true,
    surveyorName: true,
    consumerCategory: true,
    numberOfMeters: false,
    meterRating: false,
    meterPhase: false,
    electricityAmount: false,
    consumerLoadType: false,
    roofType: false,
    buildingHeight: false,
    shadowFreeArea: false,
    discom: false,
    sanctionedLoad: false,
    remark: true,
  });

  const refreshData = async () => {
    setIsLoading(true);
    const fetchedSurveys = await getSiteSurveys();
    setSurveys(fetchedSurveys);
    setIsLoading(false);
  }

  useEffect(() => {
    refreshData();
  }, []);

  const handleBulkDelete = () => {
    startDeleteTransition(async () => {
      const result = await deleteSurveys(selectedIds);
      if (result.success) {
        toast({ title: "Surveys Deleted", description: `${selectedIds.length} survey(s) have been deleted.` });
        setSelectedIds([]);
        await refreshData();
      } else {
        toast({ title: "Error", description: result.error || "Failed to delete surveys.", variant: "destructive" });
      }
      setIsAlertOpen(false);
    });
  };

  const allFilteredSurveys = useMemo(() => {
    let currentSurveys = [...surveys];
    
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      currentSurveys = currentSurveys.filter(survey => 
        survey.consumerName.toLowerCase().includes(lowercasedTerm) ||
        survey.surveyNumber.toLowerCase().includes(lowercasedTerm) ||
        survey.location.toLowerCase().includes(lowercasedTerm) ||
        survey.surveyorName.toLowerCase().includes(lowercasedTerm)
      );
    }
    
    if (sortConfig !== null) {
      currentSurveys.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === undefined && bValue === undefined) return 0;
        if (aValue === undefined) return sortConfig.direction === 'ascending' ? 1 : -1;
        if (bValue === undefined) return sortConfig.direction === 'ascending' ? -1 : 1;
        
        if (['date', 'createdAt', 'updatedAt'].includes(sortConfig.key)) {
            const dateA = new Date(aValue as string).getTime();
            const dateB = new Date(bValue as string).getTime();
            return sortConfig.direction === 'ascending' ? dateA - dateB : dateB - dateA;
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'ascending'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
           return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
        }

        return 0;
      });
    }
    return currentSurveys;
  }, [surveys, sortConfig, searchTerm]);

  const paginatedSurveys = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return allFilteredSurveys.slice(start, end);
  }, [allFilteredSurveys, currentPage, pageSize]);

  const totalPages = Math.ceil(allFilteredSurveys.length / pageSize);

  const requestSort = (key: keyof SiteSurvey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  if (isLoading) {
    return <PageHeader title="Survey List" description="Loading surveys..." icon={ListChecks} />;
  }

  return (
    <>
      <PageHeader
        title="Survey List"
        description="Manage all site surveys."
        icon={ListChecks}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {selectedIds.length > 0 ? (
                <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete ({selectedIds.length})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete {selectedIds.length} survey(s) and their associated files. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBulkDelete} disabled={isDeleting}>
                        {isDeleting ? 'Deleting...' : 'Yes, delete'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsSearchOpen(true)}>
                <Search className="mr-2 h-4 w-4" /> Search
              </Button>
            )}
            <Button size="sm" onClick={() => router.push('/site-survey')}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Survey
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Settings2 className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>View Options</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <ListFilter className="mr-2 h-4 w-4" />
                            <span>Columns</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {Object.entries(allColumns).map(([key, label]) => (
                                    <DropdownMenuCheckboxItem
                                        key={key}
                                        className="capitalize"
                                        checked={columnVisibility[key]}
                                        onCheckedChange={(value) =>
                                            setColumnVisibility((prev) => ({ ...prev, [key]: !!value }))
                                        }
                                    >
                                        {label}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <Rows className="mr-2 h-4 w-4" />
                            <span>Rows per page</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                                <DropdownMenuRadioGroup value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setCurrentPage(1); }}>
                                    {[10, 20, 50, 100].map(size => (
                                        <DropdownMenuRadioItem key={size} value={String(size)}>{size}</DropdownMenuRadioItem>
                                    ))}
                                </DropdownMenuRadioGroup>
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />
      
      <SurveysTable 
        surveys={paginatedSurveys} 
        onEditSurvey={(survey) => { 
            toast({title: "Edit Survey Clicked", description: `Survey: ${survey.surveyNumber}. Form not implemented.`})
        }}
        sortConfig={sortConfig}
        requestSort={requestSort}
        columnVisibility={columnVisibility}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
      />

       <div className="flex items-center justify-between pt-4">
        <div className="text-sm text-muted-foreground">
          Showing {paginatedSurveys.length} of {allFilteredSurveys.length} surveys.
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage >= totalPages}>
            Next
          </Button>
        </div>
      </div>
       
       {isSearchOpen && (
        <AlertDialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Search Surveys</AlertDialogTitle>
              <AlertDialogDescription>
                Search by consumer name, survey number, location, or surveyor.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="search-input" className="sr-only">Search</Label>
              <Input 
                id="search-input"
                placeholder="e.g. John Doe, SRV-123, Mumbai..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {setSearchTerm(''); setIsSearchOpen(false);}}>Clear & Close</AlertDialogCancel>
              <AlertDialogAction onClick={() => setIsSearchOpen(false)}>Apply</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
