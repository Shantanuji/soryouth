'use client';

import { useState, useRef, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Download, UploadCloud, AlertTriangle, Mail } from 'lucide-react';
import { useSession } from '@/hooks/use-sessions';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getBackupSchedule, saveBackupSchedule } from '@/app/actions/backup-actions';
import { Input } from '@/components/ui/input';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function DatabaseBackupPage() {
  const session = useSession();
  const { toast } = useToast();
  const [isRestoring, setIsRestoring] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [localBackups, setLocalBackups] = useState<any[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('00:00');
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (session && session.role !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold">Unauthorized Access</h2>
        <p className="text-muted-foreground">Only administrators can access this page.</p>
      </div>
    );
  }

  const loadLocalBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const { fetchLocalBackups } = await import('@/app/actions/backup-actions');
      const backups = await fetchLocalBackups();
      setLocalBackups(backups);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const loadSchedule = async () => {
    try {
      const time = await getBackupSchedule();
      setScheduleTime(time);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (session && session.role === 'Admin') {
      loadLocalBackups();
      loadSchedule();
    }
  }, [session]);

  const handleSaveSchedule = async () => {
    setIsSavingSchedule(true);
    try {
      await saveBackupSchedule(scheduleTime);
      toast({ title: 'Schedule Saved', description: `Auto-backup is now scheduled for ${scheduleTime} daily.` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save the backup schedule.', variant: 'destructive' });
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleBackup = async () => {
    try {
      const response = await fetch('/api/database/backup');
      if (!response.ok) {
        toast({ title: 'Backup Failed', description: 'Failed to download the database.', variant: 'destructive' });
        return;
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Extract filename from header or fallback to default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'soryouth-backup.db';
      if (contentDisposition && contentDisposition.includes('filename=')) {
        filename = contentDisposition.split('filename=')[1].replace(/"/g, '');
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({ title: 'Backup Successful', description: 'Database backup downloaded successfully.' });
    } catch (error) {
      toast({ title: 'Backup Error', description: 'An error occurred while downloading the backup.', variant: 'destructive' });
    }
  };

  const handleEmailBackup = async () => {
    setIsEmailing(true);
    try {
      const response = await fetch('/api/database/backup/email', {
        method: 'POST',
      });
      const result = await response.json();
      
      if (response.ok && result.success) {
        toast({ title: 'Email Sent', description: 'Database backup has been sent to the configured email address.' });
      } else {
        toast({ title: 'Email Failed', description: result.error || 'Failed to email the database backup.', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Email Error', description: 'An error occurred while sending the backup email.', variant: 'destructive' });
    } finally {
      setIsEmailing(false);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm(`Are you sure you want to restore the database from ${file.name}? This will overwrite all current data and cannot be undone.`)) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsRestoring(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/database/restore', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: 'Restore Successful',
          description: 'Database restored successfully. Please restart the application if you encounter any issues.',
        });
      } else {
        toast({
          title: 'Restore Failed',
          description: result.error || 'An error occurred during restoration.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Restore Error',
        description: 'Failed to communicate with the server.',
        variant: 'destructive',
      });
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <PageHeader
        title="Database Backup & Restore"
        description="Manage your database backups and restore from previous versions."
        icon={Database}
      />
      <div className="grid gap-6 md:grid-cols-2 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" /> Backup Database
            </CardTitle>
            <CardDescription>
              Download a copy of the current database file. Keep this file safe.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={handleBackup} className="w-full">
              <Download className="mr-2 h-4 w-4" /> Download Backup (.db)
            </Button>
            <Button onClick={handleEmailBackup} variant="outline" className="w-full" disabled={isEmailing}>
              <Mail className="mr-2 h-4 w-4" /> {isEmailing ? 'Sending...' : 'Email Backup to Admin'}
            </Button>
            
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Daily Auto-Backup Schedule
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                Select the time when the automatic daily backup should occur.
              </p>
              <div className="flex items-center gap-2">
                <Input 
                  type="time" 
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full"
                />
                <Button onClick={handleSaveSchedule} disabled={isSavingSchedule}>
                  {isSavingSchedule ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UploadCloud className="h-5 w-5" /> Restore Database
            </CardTitle>
            <CardDescription>
              Upload a previously downloaded backup file to restore the database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Restoring a database will overwrite all current data. In development environments, you may need to restart the Next.js server after restoring.
              </AlertDescription>
            </Alert>
            <input
              type="file"
              accept=".db,.sqlite,.sqlite3"
              className="hidden"
              ref={fileInputRef}
              onChange={handleRestore}
            />
            <Button
              variant="destructive"
              className="w-full"
              disabled={isRestoring}
              onClick={() => fileInputRef.current?.click()}
            >
              {isRestoring ? 'Restoring...' : 'Restore Database'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" /> Server Backups
            </CardTitle>
            <CardDescription>
              These backups are securely stored on your Ubuntu server. They are automatically created before any email transmission. Only the latest 30 are kept.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingBackups ? (
              <p className="text-sm text-muted-foreground">Loading backups...</p>
            ) : localBackups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No local backups found.</p>
            ) : (
              <div className="space-y-2">
                {localBackups.map((backup) => (
                  <div key={backup.name} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <p className="font-medium text-sm">{backup.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(backup.createdAt), 'PPpp')} • {(backup.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/api/database/download-local?filename=${backup.name}`} download>
                        <Download className="h-4 w-4 mr-2" /> Download
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
