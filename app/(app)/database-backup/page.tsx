'use client';

import { useState, useRef } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Download, UploadCloud, AlertTriangle } from 'lucide-react';
import { useSession } from '@/hooks/use-sessions';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function DatabaseBackupPage() {
  const session = useSession();
  const { toast } = useToast();
  const [isRestoring, setIsRestoring] = useState(false);
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
        description="Manage your SQLite database backups and restore from previous versions."
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
          <CardContent>
            <Button onClick={handleBackup} className="w-full">
              Download Backup (.db)
            </Button>
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
    </>
  );
}
