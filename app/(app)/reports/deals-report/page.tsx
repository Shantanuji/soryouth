
'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Handshake, CalendarIcon, Download, Printer, Loader2, IndianRupee } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getUsers } from '@/app/(app)/users/actions';
import { getAllDeals } from '@/app/(app)/deals/actions';
import type { User, Deal, DealPipelineType, DealStage } from '@/types';
import { DEAL_PIPELINES } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function DealsReportPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 30), to: new Date() });
  const [users, setUsers] = useState<User[]>([]);
  const [allDeals, setAllDeals] = useState<Deal[]>([]);
  
  const [selectedCreatedById, setSelectedCreatedById] = useState<string>('all');
  const [selectedAssignedToId, setSelectedAssignedToId] = useState<string>('all');
  const [selectedPipeline, setSelectedPipeline] = useState<DealPipelineType | 'all'>('all');
  const [selectedStage, setSelectedStage] = useState<DealStage | 'all'>('all');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [minKilowatt, setMinKilowatt] = useState('');
  const [maxKilowatt, setMaxKilowatt] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, startDownloadTransition] = useTransition();
  const { toast } = useToast();
  
  const fetchData = async () => {
    setIsLoading(true);
    const [fetchedUsers, fetchedDeals] = await Promise.all([getUsers(), getAllDeals()]);
    setUsers(fetchedUsers);
    setAllDeals(fetchedDeals);
    setIsLoading(false);
  };
  
  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    if (isLoading) return [];

    const fromDate = dateRange?.from ? startOfDay(dateRange.from) : undefined;
    const toDate = dateRange?.to ? endOfDay(dateRange.to) : undefined;
    const dateInterval = fromDate && toDate ? { start: fromDate, end: toDate } : null;

    const minVal = parseFloat(minValue);
    const maxVal = parseFloat(maxValue);
    const minKw = parseFloat(minKilowatt);
    const maxKw = parseFloat(maxKilowatt);

    return allDeals.filter(deal => {
        const dateMatches = dateInterval ? isWithinInterval(parseISO(deal.poWoDate), dateInterval) : true;
        const createdByMatches = selectedCreatedById === 'all' || deal.createdBy === users.find(u => u.id === selectedCreatedById)?.name;
        const assignedToMatches = selectedAssignedToId === 'all' || deal.assignedTo === users.find(u => u.id === selectedAssignedToId)?.name;
        const pipelineMatches = selectedPipeline === 'all' || deal.pipeline === selectedPipeline;
        const stageMatches = selectedStage === 'all' || deal.stage === selectedStage;
        const valueMatches = (isNaN(minVal) || deal.dealValue >= minVal) && (isNaN(maxVal) || deal.dealValue <= maxVal);
        const kilowattMatches = (isNaN(minKw) || (deal.kilowatt ?? 0) >= minKw) && (isNaN(maxKw) || (deal.kilowatt ?? 0) <= maxKw);
        
        return dateMatches && createdByMatches && assignedToMatches && pipelineMatches && stageMatches && valueMatches && kilowattMatches;
    });
  }, [allDeals, users, dateRange, selectedCreatedById, selectedAssignedToId, selectedPipeline, selectedStage, isLoading, minValue, maxValue, minKilowatt, maxKilowatt]);

  const stagesForSelectedPipeline = useMemo(() => {
    if (selectedPipeline === 'all') return [];
    return DEAL_PIPELINES[selectedPipeline] || [];
  }, [selectedPipeline]);

  useEffect(() => {
    setSelectedStage('all');
  }, [selectedPipeline]);

  const handleDownload = async () => {
    startDownloadTransition(async () => {
        if (!dateRange?.from || !dateRange?.to) {
            toast({ title: "Error", description: "Please select a date range.", variant: "destructive"});
            return;
        }

        try {
            const response = await fetch('/api/reports/deals/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from: dateRange.from.toISOString(),
                    to: dateRange.to.toISOString(),
                    createdById: selectedCreatedById,
                    assignedToId: selectedAssignedToId,
                    pipeline: selectedPipeline,
                    stage: selectedStage,
                    minValue,
                    maxValue,
                    minKilowatt,
                    maxKilowatt,
                }),
            });

            if (!response.ok) {
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Server responded with status: ${response.status}`);
                } else {
                    throw new Error(`Server error: Received an unexpected response (status: ${response.status}).`);
                }
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const filename = response.headers.get('Content-Disposition')?.split('filename=')[1] || 'deals-report.xlsx';
            a.download = filename.replace(/"/g, '');
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            
            toast({ title: 'Success', description: 'Your report is downloading.' });
        } catch (error) {
            toast({ title: 'Download Failed', description: (error as Error).message, variant: 'destructive' });
        }
    });
  };

  return (
    <>
      <PageHeader title="Deals Report" icon={Handshake} />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-4 items-center justify-center">
              <div className="flex flex-wrap gap-2 items-center">
                 <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn("w-[240px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? ( dateRange.to ? (<> {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")} </>) : (format(dateRange.from, "LLL dd, y"))) : (<span>Pick a date range</span>)}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} showOutsideDays={false}/>
                    </PopoverContent>
                </Popover>
                  <Select value={selectedCreatedById} onValueChange={setSelectedCreatedById}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Created By" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Users (Created)</SelectItem>
                        {users.map(user => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <Select value={selectedAssignedToId} onValueChange={setSelectedAssignedToId}>
                    <SelectTrigger className="w-[180px]">
                         <SelectValue placeholder="Assigned To" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Users (Assigned)</SelectItem>
                        {users.map(user => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={selectedPipeline} onValueChange={(v) => setSelectedPipeline(v as DealPipelineType | 'all')}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Deal Type" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Deal Types</SelectItem>
                        {Object.keys(DEAL_PIPELINES).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={selectedStage} onValueChange={(v) => setSelectedStage(v as DealStage | 'all')} disabled={selectedPipeline === 'all'}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Deal Stage" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Stages</SelectItem>
                        {stagesForSelectedPipeline.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                    <div className="grid w-full max-w-[120px] items-center gap-1.5">
                        <Label htmlFor="min-value" className="text-xs">Min Value</Label>
                        <Input type="number" id="min-value" placeholder="e.g., 50000" value={minValue} onChange={(e) => setMinValue(e.target.value)} className="h-9"/>
                    </div>
                     <div className="grid w-full max-w-[120px] items-center gap-1.5">
                        <Label htmlFor="max-value" className="text-xs">Max Value</Label>
                        <Input type="number" id="max-value" placeholder="e.g., 500000" value={maxValue} onChange={(e) => setMaxValue(e.target.value)} className="h-9"/>
                    </div>
                    <div className="grid w-full max-w-[120px] items-center gap-1.5">
                        <Label htmlFor="min-kw" className="text-xs">Min kW</Label>
                        <Input type="number" id="min-kw" placeholder="e.g., 10" value={minKilowatt} onChange={(e) => setMinKilowatt(e.target.value)} className="h-9"/>
                    </div>
                     <div className="grid w-full max-w-[120px] items-center gap-1.5">
                        <Label htmlFor="max-kw" className="text-xs">Max kW</Label>
                        <Input type="number" id="max-kw" placeholder="e.g., 100" value={maxKilowatt} onChange={(e) => setMaxKilowatt(e.target.value)} className="h-9"/>
                    </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => toast({title: "Coming Soon!", description: "Print functionality will be added soon."})}><Printer className="mr-2 h-4 w-4"/>Print report</Button>
                <Button onClick={handleDownload} disabled={isDownloading}>
                    {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4"/>}
                    Download
                </Button>
              </div>
          </div>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
                <Card className="shadow-inner w-auto">
                    <CardHeader className="flex flex-row justify-between items-center">
                        <div>
                            <CardTitle>Soryouth Renewable Energy Private Limited</CardTitle>
                            <CardDescription>Deals Report</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>#</TableHead>
                                    <TableHead>Client Name</TableHead>
                                    <TableHead>Pipeline</TableHead>
                                    <TableHead>Stage</TableHead>
                                    <TableHead>PO/WO Date</TableHead>
                                    <TableHead>Capacity (kW)</TableHead>
                                    <TableHead>Deal Value</TableHead>
                                    <TableHead>Created By</TableHead>
                                    <TableHead>Assigned To</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredData.length === 0 ? (
                                    <TableRow><TableCell colSpan={9} className="text-center h-24">No data for selected filters.</TableCell></TableRow>
                                ) : (
                                    filteredData.map((deal, index) => (
                                        <TableRow key={deal.id}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{deal.clientName}</TableCell>
                                            <TableCell>{deal.pipeline}</TableCell>
                                            <TableCell>{deal.stage}</TableCell>
                                            <TableCell>{format(parseISO(deal.poWoDate), 'dd MMM, yyyy')}</TableCell>
                                            <TableCell>{deal.kilowatt ?? '-'}</TableCell>
                                            <TableCell className="flex items-center">
                                                <IndianRupee className="h-4 w-4 mr-0.5" />
                                                {deal.dealValue.toLocaleString('en-IN')}
                                            </TableCell>
                                            <TableCell>{deal.createdBy || 'N/A'}</TableCell>
                                            <TableCell>{deal.assignedTo || 'N/A'}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </CardContent>
      </Card>
    </>
  );
}
