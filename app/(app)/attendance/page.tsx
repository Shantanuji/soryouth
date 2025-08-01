
'use client';

import { useEffect, useState, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CheckSquare, MapPin, CalendarIcon } from 'lucide-react';
import { getAttendanceData } from './actions';
import type { Attendance, User } from '@/types';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DateRange } from 'react-day-picker';
import { format, parse, startOfDay, endOfDay, isWithinInterval, subDays } from 'date-fns';
import { cn } from '@/lib/utils';

function LocationLink({ location }: { location?: string | null }) {
    if (!location) return <span>-</span>;
    return (
        <Link
            href={`https://www.google.com/maps?q=${location}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-primary hover:underline"
        >
            <MapPin className="h-4 w-4" />
            <span>View Map</span>
        </Link>
    );
}

export default function AttendancePage() {
    const [allRecords, setAllRecords] = useState<Attendance[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [selectedUserId, setSelectedUserId] = useState<string>('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 7),
        to: new Date(),
    });

    useEffect(() => {
        const fetchRecords = async () => {
            setIsLoading(true);
            const { records, users } = await getAttendanceData();
            setAllRecords(records);
            setUsers(users);
            setIsLoading(false);
        };
        fetchRecords();
    }, []);

    const filteredRecords = useMemo(() => {
        return allRecords.filter(record => {
            const userMatch = selectedUserId === 'all' || record.userId === selectedUserId;
            
            let dateMatch = true;
            if (dateRange?.from) {
                const punchInDate = parse(record.punchInTime, 'dd-MM-yyyy HH:mm:ss', new Date());
                const from = startOfDay(dateRange.from);
                const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
                dateMatch = isWithinInterval(punchInDate, { start: from, end: to });
            }

            return userMatch && dateMatch;
        });
    }, [allRecords, selectedUserId, dateRange]);

    return (
        <>
            <PageHeader
                title="Attendance Records"
                description="View all user punch-in and punch-out records."
                icon={CheckSquare}
            />
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <CardTitle>All Records</CardTitle>
                        <div className="flex flex-wrap gap-2">
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
                                <PopoverContent className="w-auto p-0" align="end">
                                    <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} showOutsideDays={false}/>
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
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Punch In Time</TableHead>
                                    <TableHead>Punch In Location</TableHead>
                                    <TableHead>Punch Out Time</TableHead>
                                    <TableHead>Punch Out Location</TableHead>
                                    <TableHead className="text-right">Work Duration</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRecords.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            No attendance records found for the selected filters.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredRecords.map(record => (
                                        <TableRow key={record.id}>
                                            <TableCell className="font-medium">{record.userName}</TableCell>
                                            <TableCell>{record.punchInTime}</TableCell>
                                            <TableCell><LocationLink location={record.punchInLocation} /></TableCell>
                                            <TableCell>{record.punchOutTime || <Badge variant="secondary">Punched In</Badge>}</TableCell>
                                            <TableCell><LocationLink location={record.punchOutLocation} /></TableCell>
                                            <TableCell className="text-right font-mono">{record.workDuration}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </>
    );
}
