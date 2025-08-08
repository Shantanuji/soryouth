
'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ListChecks, CalendarIcon, Download, Printer, Loader2, Phone, MessageSquare, Mail, Users as VisitIcon, Sigma, CheckSquare as WhatsappIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getUsers } from '@/app/(app)/users/actions';
import { getAllFollowUps } from '@/app/(app)/leads-list/actions';
import type { User, FollowUp } from '@/types';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function FollowUpReportPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 7), to: new Date() });
  const [users, setUsers] = useState<User[]>([]);
  const [allFollowUps, setAllFollowUps] = useState<FollowUp[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, startDownloadTransition] = useTransition();
  const { toast } = useToast();
  
  const fetchData = async () => {
    setIsLoading(true);
    const [fetchedUsers, fetchedFollowUps] = await Promise.all([getUsers(), getAllFollowUps()]);
    setUsers(fetchedUsers);
    setAllFollowUps(fetchedFollowUps);
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

    return allFollowUps.filter(followUp => {
        const dateMatches = dateInterval ? isWithinInterval(parseISO(followUp.createdAt), dateInterval) : true;
        
        let userMatches = true;
        if (selectedUserId !== 'all') {
            const selectedUserName = users.find(u => u.id === selectedUserId)?.name;
            userMatches = followUp.createdBy === selectedUserName;
        }
        
        return dateMatches && userMatches;
    });
  }, [allFollowUps, users, dateRange, selectedUserId, isLoading]);


  const handleDownload = async () => {
    startDownloadTransition(async () => {
        if (!dateRange?.from || !dateRange?.to) {
            toast({ title: "Error", description: "Please select a date range.", variant: "destructive"});
            return;
        }

        try {
            const response = await fetch('/api/reports/follow-up/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from: dateRange.from.toISOString(),
                    to: dateRange.to.toISOString(),
                    userId: selectedUserId,
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
            const filename = response.headers.get('Content-Disposition')?.split('filename=')[1] || 'follow-up-report.xlsx';
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
      <PageHeader title="Follow-up report" icon={ListChecks} />

      <Card className='items-center'>
        <CardHeader>
          <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-2 items-center">
                 <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn("w-[260px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? ( dateRange.to ? (<> {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")} </>) : (format(dateRange.from, "LLL dd, y"))) : (<span>Pick a date range</span>)}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/>
                    </PopoverContent>
                </Popover>
                 <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select User" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        {users.map(user => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
                    </SelectContent>
                </Select>
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
                <Card className="shadow-inner">
                    <CardHeader className="flex flex-row justify-between items-center">
                        <div>
                            <CardTitle>soryouth renewable energy private limited</CardTitle>
                            <CardDescription>9967691159 / soryouthenergy@gmail.com</CardDescription>
                        </div>
                         <img src="https://placehold.co/150x50.png?text=Soryouth" data-ai-hint="logo placeholder" alt="Bytepaper logo placeholder" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-center font-semibold mb-4">Follow-up report</p>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>#</TableHead>
                                    <TableHead>Date & Time</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Comment</TableHead>
                                    <TableHead>User</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredData.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} className="text-center h-24">No data for selected filters.</TableCell></TableRow>
                                ) : (
                                    filteredData.map((row, index) => {
                                        const customer = row.lead || row.client;
                                        return (
                                        <TableRow key={row.id}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{format(parseISO(row.createdAt), 'dd-MM-yyyy p')}</TableCell>
                                            <TableCell>{customer?.name || '-'}</TableCell>
                                            <TableCell>{customer?.phone || '-'}</TableCell>
                                            <TableCell>{row.type}</TableCell>
                                            <TableCell>{row.comment || '-'}</TableCell>
                                            <TableCell>{row.createdBy || '-'}</TableCell>
                                        </TableRow>
                                    )})
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
