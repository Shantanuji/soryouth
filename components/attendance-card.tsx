'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { punchIn, punchOut, getCurrentUserAttendanceStatus } from '@/app/(app)/attendance/actions';
import { Clock, Play, Square, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

function formatDurationSeconds(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
}

function formatTimeOnly(dateString?: string): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  } catch (e) {
    return dateString;
  }
}

export function AttendanceCard() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shiftHours, setShiftHours] = useState(8);
  const shiftSeconds = shiftHours * 3600;
  
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

  const [workedSeconds, setWorkedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = async () => {
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
      console.error('Failed to get attendance status:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    const handleUpdate = () => {
      fetchStatus();
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
    return (
      <Card className="border-0 shadow-sm animate-pulse bg-card">
        <CardContent className="h-[220px] flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isPunchedIn = !!attendance?.isPunchedIn;
  const isCompleted = !!attendance?.hasCompletedToday;
  
  const progressPercent = Math.min(100, (workedSeconds / shiftSeconds) * 100);
  const remainingSeconds = Math.max(0, shiftSeconds - workedSeconds);
  const overtimeSeconds = Math.max(0, workedSeconds - shiftSeconds);
  const isShiftDone = workedSeconds >= shiftSeconds;

  return (
    <Card className="border border-border/60 shadow-sm bg-card overflow-hidden hover:shadow-md transition-shadow duration-300 max-w-3xl">
      <div className="bg-gradient-to-r from-sky-500/10 to-indigo-500/5 h-1 w-full" />
      <CardHeader className="p-4 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4.5 w-4.5 text-sky-500" />
            <CardTitle className="text-sm font-bold">Shift Attendance Control</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isPunchedIn && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-semibold animate-pulse py-0.5">
                Active
              </Badge>
            )}
            {isCompleted && (
              <Badge variant="outline" className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 text-[10px] font-semibold py-0.5">
                Completed
              </Badge>
            )}
            {!isPunchedIn && !isCompleted && (
              <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px] font-semibold py-0.5">
                Not Started
              </Badge>
            )}
          </div>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1.5 select-none mt-1">
          <span>Shift Duration:</span>
          <span className="font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/40">
            {shiftHours} Hours
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-1 space-y-4">
        {workedSeconds > 0 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/10 border rounded-lg p-2 text-center">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Worked Time</p>
                <p className="font-mono text-sm sm:text-base font-bold text-foreground tabular-nums">
                  {formatDurationSeconds(workedSeconds)}
                </p>
              </div>

              <div className="bg-muted/10 border rounded-lg p-2 text-center">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                  {isShiftDone ? 'Overtime' : 'Remaining Time'}
                </p>
                {isShiftDone ? (
                  <p className="font-mono text-sm sm:text-base font-bold text-amber-500 dark:text-amber-400 tabular-nums">
                    +{formatDurationSeconds(overtimeSeconds)}
                  </p>
                ) : (
                  <p className="font-mono text-sm sm:text-base font-bold text-foreground/80 tabular-nums">
                    {formatDurationSeconds(remainingSeconds)}
                  </p>
                )}
              </div>
            </div>

            {/* Shift completion progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-muted-foreground">Progress</span>
                <span className="text-foreground">{progressPercent.toFixed(1)}%</span>
              </div>
              <Progress value={progressPercent} className="h-1.5 bg-muted rounded-full" />
              {isShiftDone && (
                <div className="flex items-center gap-1 text-[10px] text-amber-500 font-bold">
                  <CheckCircle className="h-3 w-3" />
                  <span>Shift Completed</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Info Box for Not Punched In */
          <div className="flex gap-2.5 bg-amber-500/5 border border-amber-500/10 rounded-lg p-3 text-xs text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold">Not Punched In Yet</h4>
              <p className="mt-0.5 text-muted-foreground text-[11px]">
                Please punch in below to begin tracking your work hours and location.
              </p>
            </div>
          </div>
        )}

        {/* Punch In / Out Actions Footer */}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handlePunchAction}
            disabled={isProcessing}
            className={`w-full py-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              isPunchedIn 
                ? 'bg-rose-500 hover:bg-rose-600 text-white' 
                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            }`}
          >
            {isProcessing ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : isPunchedIn ? (
              <>
                <Square className="h-3.5 w-3.5 fill-white" />
                <span>Punch Out</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-white" />
                <span>Punch In</span>
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
