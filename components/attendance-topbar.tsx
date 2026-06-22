'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { punchIn, punchOut, getCurrentUserAttendanceStatus } from '@/app/(app)/attendance/actions';
import { Loader2 } from 'lucide-react';
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

export function AttendanceTopbar() {
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [punchInTime, setPunchInTime] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const refreshAttendanceStatus = async () => {
    try {
      const status = await getCurrentUserAttendanceStatus();
      setIsPunchedIn(status.isPunchedIn);
      setPunchInTime(status.punchInTime || null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAttendanceStatus();
  }, []);

  const handlePunchInOut = () => {
    setIsProcessing(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const location = { latitude, longitude };
          
          const action = isPunchedIn ? punchOut : punchIn;
          const result = await action(location);

          if (result && result.success) {
            toast({ title: 'Success', description: `You have successfully punched ${isPunchedIn ? 'out' : 'in'}.` });
            await refreshAttendanceStatus();
          } else {
            toast({ title: 'Error', description: result?.error || 'An unknown error occurred.', variant: 'destructive' });
          }
        } catch (e) {
          console.error("Punch in/out failed:", e);
          toast({ title: 'Error', description: 'An unexpected server error occurred.', variant: 'destructive' });
        } finally {
          setIsProcessing(false);
        }
      },
      (error) => {
        toast({
          title: 'Location Error',
          description: `Could not get your location: ${error.message}. Please enable location services.`,
          variant: 'destructive',
        });
        setIsProcessing(false);
      }
    );
  };

  if (isLoading) {
    return <div className="h-8 w-24 animate-pulse bg-muted rounded-full"></div>;
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-8 rounded-full border px-3 text-xs font-semibold shadow-sm transition-all hover:shadow-md ${
            isPunchedIn 
              ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20' 
              : 'border-muted-foreground/20 bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <span className="relative flex h-2 w-2 mr-2">
              {isPunchedIn && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isPunchedIn ? 'bg-primary' : 'bg-muted-foreground'}`}></span>
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
      </AlertDialogTrigger>
      
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isPunchedIn ? "Punch Out of Work?" : "Punch In to Work?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isPunchedIn 
              ? "Are you sure you want to end your shift and punch out? Your active time will be recorded."
              : "Are you sure you want to start your shift and punch in now? Your active time and location will be recorded."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handlePunchInOut}>
            {isPunchedIn ? "Yes, Punch Out" : "Yes, Punch In"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
