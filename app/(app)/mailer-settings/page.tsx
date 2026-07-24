'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, AlertTriangle, Loader2 } from 'lucide-react';
import { useSession } from '@/hooks/use-sessions';
import { useToast } from '@/hooks/use-toast';
import { getMailerSettings, saveMailerSettings, type MailerConfig } from '@/app/actions/mailer-actions';

export default function MailerSettingsPage() {
  const session = useSession();
  const { toast } = useToast();
  
  const [config, setConfig] = useState<MailerConfig>({
    host: '',
    port: '',
    secure: false,
    user: '',
    pass: '',
    backupEmailTo: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchConfig() {
      if (session && session.role === 'Admin') {
        try {
          const fetchedConfig = await getMailerSettings();
          setConfig({
            ...fetchedConfig,
            pass: '' // Do not render the password to the frontend
          });
        } catch (error) {
          toast({ title: 'Error', description: 'Failed to load mailer settings', variant: 'destructive' });
        } finally {
          setIsLoading(false);
        }
      }
    }
    fetchConfig();
  }, [session, toast]);

  if (session && session.role !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold">Unauthorized Access</h2>
        <p className="text-muted-foreground">Only administrators can access this page.</p>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const result = await saveMailerSettings(config);
      if (result.success) {
        toast({ title: 'Success', description: 'Mailer settings saved successfully.' });
        // Clear password field after save
        setConfig(prev => ({ ...prev, pass: '' }));
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to save settings.', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="SMTP Mailer Settings"
        description="Configure your SMTP server for database backups and system alerts."
        icon={Mail}
      />
      <div className="grid gap-6 md:grid-cols-2 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>SMTP Configuration</CardTitle>
            <CardDescription>
              Enter the credentials for the email account that will send system alerts and backups.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="host">SMTP Host</Label>
                  <Input 
                    id="host" 
                    value={config.host} 
                    onChange={e => setConfig({...config, host: e.target.value})} 
                    placeholder="e.g. smtp.gmail.com" 
                    required 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="port">SMTP Port</Label>
                    <Input 
                      id="port" 
                      value={config.port} 
                      onChange={e => setConfig({...config, port: e.target.value})} 
                      placeholder="e.g. 587 or 465" 
                      required 
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-8">
                    <Checkbox 
                      id="secure" 
                      checked={config.secure}
                      onCheckedChange={(checked) => setConfig({...config, secure: checked === true})}
                    />
                    <Label htmlFor="secure">Secure (SSL/TLS)</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user">SMTP User (Email)</Label>
                  <Input 
                    id="user" 
                    type="email"
                    value={config.user} 
                    onChange={e => setConfig({...config, user: e.target.value})} 
                    placeholder="e.g. alerts@yourcompany.com" 
                    required 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pass">SMTP Password (or App Password)</Label>
                  <Input 
                    id="pass" 
                    type="password"
                    value={config.pass} 
                    onChange={e => setConfig({...config, pass: e.target.value})} 
                    placeholder="Leave blank to keep existing password" 
                  />
                  <p className="text-xs text-muted-foreground">
                    If using Gmail, generate an App Password. Do not use your personal password.
                  </p>
                </div>

                <hr className="my-6" />

                <div className="space-y-2">
                  <Label htmlFor="backupEmailTo">Receiver Email Address(es)</Label>
                  <Input 
                    id="backupEmailTo" 
                    type="text"
                    value={config.backupEmailTo} 
                    onChange={e => setConfig({...config, backupEmailTo: e.target.value})} 
                    placeholder="e.g. admin@example.com, ceo@example.com" 
                    required 
                  />
                  <p className="text-xs text-muted-foreground">
                    These email addresses will receive the scheduled backups and crash alerts. Separate multiple emails with a comma.
                  </p>
                </div>

                <Button type="submit" className="w-full mt-4" disabled={isSaving}>
                  {isSaving ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                  ) : 'Save Configuration'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
