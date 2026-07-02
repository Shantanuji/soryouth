'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { punchIn, punchOut, getCurrentUserAttendanceStatus } from '@/app/(app)/attendance/actions';
import { Loader2, Clock, Play, Square, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function formatDurationSeconds(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatTimeOnly(dateString?: string): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch (e) {
    return dateString;
  }
}

export function AttendanceTopbar() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const [attendance, setAttendance] = useState<{
    isPunchedIn: boolean;
    punchInTime?: string;
    punchInTimeRaw?: string;
    punchOutTime?: string;
    punchOutTimeRaw?: string;
    cumulativeWorkedSeconds: number;
    shiftHours: number;
    hasCompletedToday?: boolean;
  } | null>(null);

  const [shiftHours, setShiftHours] = useState(8);
  const [workedSeconds, setWorkedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const refreshAttendanceStatus = async () => {
    try {
      const status = await getCurrentUserAttendanceStatus();
      setAttendance(status);
      setShiftHours(status.shiftHours);
      
      if (status.isPunchedIn && status.punchInTimeRaw) {
        const startTime = new Date(status.punchInTimeRaw).getTime();
        const activeSeconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
        setWorkedSeconds(status.cumulativeWorkedSeconds + activeSeconds);
      } else {
        setWorkedSeconds(status.cumulativeWorkedSeconds);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAttendanceStatus();

    const handleUpdate = () => {
      refreshAttendanceStatus();
    };

    window.addEventListener('attendance-update', handleUpdate);
    return () => {
      window.removeEventListener('attendance-update', handleUpdate);
    };
  }, []);

  // Timer Tick Interval
  useEffect(() => {
    if (attendance?.isPunchedIn && attendance.punchInTimeRaw) {
      const startTime = new Date(attendance.punchInTimeRaw).getTime();
      
      timerRef.current = setInterval(() => {
        const activeSeconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
        setWorkedSeconds(attendance.cumulativeWorkedSeconds + activeSeconds);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (attendance) {
        setWorkedSeconds(attendance.cumulativeWorkedSeconds);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [attendance]);

  const handlePunchAction = async () => {
    setIsProcessing(true);
    if (!navigator.geolocation) {
      toast({
        title: 'Error',
        description: 'Geolocation is not supported by your browser.',
        variant: 'destructive',
      });
      setIsProcessing(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const location = { latitude, longitude };
          const action = attendance?.isPunchedIn ? punchOut : punchIn;
          const result = await action(location);

          if (result && result.success) {
            toast({
              title: 'Success',
              description: `Shift successfully punched ${attendance?.isPunchedIn ? 'out' : 'in'}.`,
            });
            window.dispatchEvent(new Event('attendance-update'));
            setIsOpen(false);
          } else {
            toast({
              title: 'Error',
              description: result?.error || 'Failed to register shift entry.',
              variant: 'destructive',
            });
          }
        } catch (e) {
          console.error(e);
          toast({
            title: 'Error',
            description: 'A server error occurred during punch in/out.',
            variant: 'destructive',
          });
        } finally {
          setIsProcessing(false);
        }
      },
      (error) => {
        toast({
          title: 'Location Required',
          description: `Location access is required: ${error.message}. Please enable location permissions.`,
          variant: 'destructive',
        });
        setIsProcessing(false);
      }
    );
  };

  if (isLoading) {
    return <div className="h-8 w-24 animate-pulse bg-muted rounded-full"></div>;
  }

  const isPunchedIn = !!attendance?.isPunchedIn;
  const isCompleted = !!attendance?.hasCompletedToday;
  const punchInTime = attendance?.punchInTime;
  
  const shiftSeconds = shiftHours * 3600;
  const progressPercent = Math.min(100, (workedSeconds / shiftSeconds) * 100);
  const remainingSeconds = Math.max(0, shiftSeconds - workedSeconds);
  const overtimeSeconds = Math.max(0, workedSeconds - shiftSeconds);
  const isShiftDone = workedSeconds >= shiftSeconds;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-8 rounded-full border px-3 text-xs font-semibold shadow-sm transition-all hover:shadow-md ${
            isPunchedIn 
              ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20' 
              : isCompleted
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                : 'border-muted-foreground/20 bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <span className="relative flex h-2 w-2 mr-2">
              {isPunchedIn && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                isPunchedIn 
                  ? 'bg-primary' 
                  : isCompleted 
                    ? 'bg-emerald-500' 
                    : 'bg-muted-foreground'
              }`}></span>
            </span>
          )}
          {isPunchedIn ? (
            <>
              <span className="hidden sm:inline">Active since {punchInTime}</span>
              <span className="sm:hidden">Active</span>
            </>
          ) : (
            'Punch In'
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-4 mt-2 space-y-4" align="end">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm font-bold">
            <Clock className="h-4.5 w-4.5 text-primary" />
            <span>Attendance Details</span>
          </div>
          <div>
            {isPunchedIn && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                Shift Active
              </Badge>
            )}
            {isCompleted && (
              <Badge variant="outline" className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 text-[10px]">
                Completed
              </Badge>
            )}
            {!isPunchedIn && !isCompleted && (
              <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">
                Not Started
              </Badge>
            )}
          </div>
        </div>

        {/* Shift Duration Info */}
        <div className="text-xs text-muted-foreground flex items-center justify-between select-none bg-muted/20 p-2 rounded-lg border border-border/50">
          <span>Shift Duration:</span>
          <span className="font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/40 text-xs">
            {shiftHours} Hours
          </span>
        </div>

        {/* Dynamic Timers */}
        {workedSeconds > 0 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-muted/40 p-2 rounded-lg border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Worked</p>
                <p className="font-mono font-bold text-foreground">{formatDurationSeconds(workedSeconds)}</p>
              </div>
              <div className="bg-muted/40 p-2 rounded-lg border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                  {isShiftDone ? 'Overtime' : 'Remaining'}
                </p>
                {isShiftDone ? (
                  <p className="font-mono font-bold text-amber-500 dark:text-amber-400">+{formatDurationSeconds(overtimeSeconds)}</p>
                ) : (
                  <p className="font-mono font-bold text-foreground/80">{formatDurationSeconds(remainingSeconds)}</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-muted-foreground">Completion Progress</span>
                <span className="text-foreground">{progressPercent.toFixed(1)}%</span>
              </div>
              <Progress value={progressPercent} className="h-2 bg-muted rounded-full" />
              {isShiftDone && (
                <p className="text-[10px] text-amber-500 font-semibold flex items-center gap-1 mt-0.5">
                  <CheckCircle className="h-3 w-3" /> Shift Completed
                </p>
              )}
            </div>
          </div>
        ) : (
          /* Not Punched In alert */
          <div className="flex gap-2 bg-amber-500/5 border border-amber-500/15 text-[11px] text-amber-600 dark:text-amber-400 p-2.5 rounded-lg">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Click below to punch in and start tracking your daily shift hours.</span>
          </div>
        )}

        {/* Action Button */}
        <Button
          size="sm"
          onClick={handlePunchAction}
          disabled={isProcessing}
          className={`w-full py-4 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 ${
            isPunchedIn 
              ? 'bg-rose-500 hover:bg-rose-600 text-white' 
              : 'bg-emerald-500 hover:bg-emerald-600 text-white'
          }`}
        >
          {isProcessing ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : isPunchedIn ? (
            <>
              <Square className="h-3 w-3 fill-white" />
              <span>Punch Out</span>
            </>
          ) : (
            <>
              <Play className="h-3 w-3 fill-white" />
              <span>Punch In</span>
            </>
          )}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
