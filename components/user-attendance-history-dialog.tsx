'use client';

import { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { getUserHRMSDashboard } from '@/app/(app)/attendance/hrms-actions';
import { Clock, MapPin, Monitor, Globe, LogIn, LogOut, Navigation, CheckCircle, RefreshCw, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';

type UserAttendanceHistoryDialogProps = {
  userId: string;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
};

export function UserAttendanceHistoryDialog({ userId, userName, isOpen, onClose }: UserAttendanceHistoryDialogProps) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tickingWorkedSeconds, setTickingWorkedSeconds] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getUserHRMSDashboard(userId);
      if (res.success && res.data) {
        setData(res.data);
        
        // Setup worked time ticking if currently punched in
        const punch = res.data.attendanceDetails;
        if (punch && punch.isPunchedIn && punch.punchInTime) {
          const startTime = new Date(punch.punchInTime).getTime();
          const diff = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
          setTickingWorkedSeconds(diff);
        } else if (punch && punch.workDuration) {
          setTickingWorkedSeconds(punch.workDuration * 60);
        } else {
          setTickingWorkedSeconds(0);
        }
      } else {
        setError(res.error || 'Failed to fetch HRMS records.');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && userId) {
      loadData();
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isOpen, userId]);

  // Timer Tick Interval for live Worked Hours in admin view
  useEffect(() => {
    const punch = data?.attendanceDetails;
    if (punch && punch.isPunchedIn && punch.punchInTime) {
      const startTime = new Date(punch.punchInTime).getTime();
      timerRef.current = setInterval(() => {
        const elapsed = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
        setTickingWorkedSeconds(elapsed);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [data]);

  const formatDuration = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };

  const getTimelineIcon = (type: string) => {
    switch (type) {
      case 'Login':
        return <LogIn className="h-4 w-4 text-emerald-500" />;
      case 'Logout':
        return <LogOut className="h-4 w-4 text-rose-500" />;
      case 'PunchIn':
        return <Clock className="h-4 w-4 text-sky-500" />;
      case 'PunchOut':
        return <CheckCircle className="h-4 w-4 text-amber-500" />;
      case 'LocationChanged':
        return <Navigation className="h-4 w-4 text-indigo-500" />;
      default:
        return <Globe className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Determine active dynamic status
  const getOverallStatus = () => {
    if (!data) return 'Offline';
    const presence = data.user.presenceStatus;
    const punch = data.attendanceDetails;
    const isPunched = punch && !punch.punchOutTime;

    if (presence === 'Online') {
      return isPunched ? 'Working (Online)' : 'Online';
    } else {
      return isPunched ? 'Working (Offline)' : 'Offline';
    }
  };

  const getOverallStatusBadge = (status: string) => {
    switch (status) {
      case 'Working (Online)':
        return <Badge className="bg-emerald-500 text-white border-0 font-bold">Working (Online)</Badge>;
      case 'Working (Offline)':
        return <Badge className="bg-amber-500 text-white border-0 font-bold animate-pulse">Working (Offline)</Badge>;
      case 'Online':
        return <Badge className="bg-sky-500 text-white border-0 font-bold">Online</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground border-0 font-bold">Offline</Badge>;
    }
  };

  // We read saved shift hours from localstorage as fallback or default 8
  const shiftHours = 8;
  const shiftSeconds = shiftHours * 3600;
  const progressPercent = Math.min(100, (tickingWorkedSeconds / shiftSeconds) * 100);
  const remainingSeconds = Math.max(0, shiftSeconds - tickingWorkedSeconds);
  const overtimeSeconds = Math.max(0, tickingWorkedSeconds - shiftSeconds);
  const isShiftDone = tickingWorkedSeconds >= shiftSeconds;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-6 scrollbar-none rounded-xl">
        <DialogHeader className="pb-2 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <span>HRMS Employee Report: {userName}</span>
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Separated Authentication, Attendance records, and Live Presence tracking logs.
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading} className="h-8">
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
                Reload
              </Button>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-20">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-500 font-semibold">{error}</div>
        ) : !data ? (
          <div className="p-12 text-center text-muted-foreground">No records found.</div>
        ) : (
          <div className="space-y-6 mt-4">
            {/* Status Summary Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="p-3 bg-muted/20 border-border/50">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Employee Status</p>
                <div className="mt-1">{getOverallStatusBadge(getOverallStatus())}</div>
              </Card>

              <Card className="p-3 bg-muted/20 border-border/50">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Presence Status</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${data.user.presenceStatus === 'Online' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span className="text-sm font-bold capitalize">{data.user.presenceStatus}</span>
                </div>
              </Card>

              <Card className="p-3 bg-muted/20 border-border/50">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Last Seen</p>
                <p className="text-sm font-bold mt-1 text-foreground">
                  {data.user.lastSeen ? format(new Date(data.user.lastSeen), 'hh:mm:ss a') : 'Never'}
                </p>
              </Card>

              <Card className="p-3 bg-muted/20 border-border/50">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Latest Device & Browser</p>
                <p className="text-xs font-bold mt-1 text-foreground truncate">
                  {data.currentDevice} ({data.currentBrowser})
                </p>
              </Card>
            </div>

            {/* Geolocation Section */}
            {data.user.lastKnownLocation && (
              <Card className="p-3 bg-sky-500/5 border-sky-500/10 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-sky-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-sky-600 dark:text-sky-400 uppercase">Last Known Location</p>
                  <p className="text-xs font-semibold text-foreground truncate mt-0.5">{data.user.lastKnownLocation}</p>
                </div>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Daily Shift Timers */}
              <div className="md:col-span-6 space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-1.5 border-b pb-1.5">
                  <Clock className="h-4.5 w-4.5 text-primary" />
                  <span>Today's Shift Statistics</span>
                </h3>

                {data.attendanceDetails ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="bg-muted/10 border rounded-lg p-2.5">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Worked Time</p>
                        <p className="font-mono text-base font-bold text-foreground tabular-nums">
                          {formatDuration(tickingWorkedSeconds)}
                        </p>
                      </div>

                      <div className="bg-muted/10 border rounded-lg p-2.5">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                          {isShiftDone ? 'Overtime' : 'Remaining Time'}
                        </p>
                        {isShiftDone ? (
                          <p className="font-mono text-base font-bold text-amber-500 dark:text-amber-400 tabular-nums">
                            +{formatDuration(overtimeSeconds)}
                          </p>
                        ) : (
                          <p className="font-mono text-base font-bold text-foreground/80 tabular-nums">
                            {formatDuration(remainingSeconds)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-muted-foreground">Shift Progress</span>
                        <span className="text-foreground">{progressPercent.toFixed(1)}%</span>
                      </div>
                      <Progress value={progressPercent} className="h-2 bg-muted rounded-full" />
                    </div>

                    <div className="bg-muted/5 border rounded-lg p-3 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shift Punch In:</span>
                        <span className="font-semibold">
                          {format(new Date(data.attendanceDetails.punchInTime), 'hh:mm:ss a')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shift Punch Out:</span>
                        <span className="font-semibold">
                          {data.attendanceDetails.punchOutTime 
                            ? format(new Date(data.attendanceDetails.punchOutTime), 'hh:mm:ss a') 
                            : 'Active / Not Punched Out'}
                        </span>
                      </div>
                      {data.attendanceDetails.punchInLocation && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Punch In Coordinates:</span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {data.attendanceDetails.punchInLocation}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                    No active shift punch registered today.
                  </div>
                )}
              </div>

              {/* Chronological Audit Timeline */}
              <div className="md:col-span-6 space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-1.5 border-b pb-1.5">
                  <Globe className="h-4.5 w-4.5 text-primary" />
                  <span>Chronological Timeline Logs</span>
                </h3>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-none">
                  {data.timeline && data.timeline.length > 0 ? (
                    data.timeline.map((event: any, idx: number) => (
                      <div key={event.id} className="relative pl-6 pb-2 last:pb-0">
                        {/* Vertical line connector */}
                        {idx < data.timeline.length - 1 && (
                          <span className="absolute left-[9px] top-4 bottom-0 w-0.5 bg-border/60" />
                        )}
                        <span className="absolute left-0 top-0.5 flex h-5.5 w-5.5 items-center justify-center rounded-full bg-muted border border-border/80 shrink-0">
                          {getTimelineIcon(event.eventType)}
                        </span>
                        <div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-foreground capitalize">{event.eventType}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(event.timestamp), 'dd MMM, hh:mm a')}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{event.details}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                      No timeline events recorded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Location History Logs */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold flex items-center gap-1.5 border-b pb-1.5">
                <MapPin className="h-4.5 w-4.5 text-primary" />
                <span>Resolved Location Logs History</span>
              </h3>

              <div className="border border-border/80 rounded-lg overflow-hidden bg-card">
                <Table className="w-full text-xs">
                  <TableHeader className="bg-muted/15 border-b border-border/60">
                    <TableRow>
                      <TableHead className="py-2.5">Time</TableHead>
                      <TableHead className="py-2.5">City</TableHead>
                      <TableHead className="py-2.5">Resolved Address</TableHead>
                      <TableHead className="py-2.5">Coordinates</TableHead>
                      <TableHead className="py-2.5">IP Address</TableHead>
                      <TableHead className="py-2.5">Device</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/40">
                    {data.locationHistory && data.locationHistory.length > 0 ? (
                      data.locationHistory.map((log: any) => (
                        <TableRow key={log.id} className="hover:bg-muted/5">
                          <TableCell className="py-2 text-muted-foreground">
                            {format(new Date(log.timestamp), 'dd MMM, hh:mm a')}
                          </TableCell>
                          <TableCell className="py-2 font-bold text-foreground">{log.city || 'Unknown'}</TableCell>
                          <TableCell className="py-2 max-w-[200px] truncate text-muted-foreground" title={log.address}>
                            {log.address || '-'}
                          </TableCell>
                          <TableCell className="py-2 font-mono text-[10px] text-muted-foreground">
                            {log.latitude.toFixed(4)}, {log.longitude.toFixed(4)}
                          </TableCell>
                          <TableCell className="py-2 text-muted-foreground font-mono">{log.ip || '127.0.0.1'}</TableCell>
                          <TableCell className="py-2 text-muted-foreground text-[10px]">
                            {log.device} ({log.browser})
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No location tracking coordinates registered.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
