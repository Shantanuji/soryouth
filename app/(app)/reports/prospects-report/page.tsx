
'use client';

import React, { useState, useTransition, useMemo, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type DataType = 'leads' | 'clients';
type SubType = 'active' | 'dropped' | 'inactive';

export default function ProspectsReportPage() {
  const [dataType, setDataType] = useState<DataType>('leads');
  const [subType, setSubType] = useState<SubType>('active');
  const [isDownloading, startDownloadTransition] = useTransition();
  const { toast } = useToast();

  const subTypeOptions = useMemo(() => {
    if (dataType === 'leads') {
      return [
        { value: 'active', label: 'Active Leads' },
        { value: 'dropped', label: 'Dropped Leads' },
      ];
    }
    if (dataType === 'clients') {
      return [
        { value: 'active', label: 'Active Clients' },
        { value: 'inactive', label: 'Inactive Clients' },
      ];
    }
    return [];
  }, [dataType]);

  // Effect to reset subType when dataType changes
  useEffect(() => {
    if (dataType === 'leads') {
      setSubType('active');
    } else if (dataType === 'clients') {
      setSubType('active');
    }
  }, [dataType]);

  const handleDownload = async () => {
    startDownloadTransition(async () => {
      try {
        const response = await fetch('/api/reports/prospects/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataType, subType }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Server responded with status: ${response.status}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = response.headers.get('Content-Disposition')?.split('filename=')[1] || 'report.xlsx';
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
      <PageHeader title="Export Prospects Report" icon={Download} />
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Configure Your Export</CardTitle>
          <CardDescription>
            Select the type of data you want to export. The report will include all available details for the selected group.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Data Type</label>
            <Select value={dataType} onValueChange={(v) => setDataType(v as DataType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select data type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leads">Leads</SelectItem>
                <SelectItem value="clients">Clients</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Sub-Type</label>
            <Select value={subType} onValueChange={(v) => setSubType(v as SubType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select sub-type..." />
              </SelectTrigger>
              <SelectContent>
                {subTypeOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleDownload} disabled={isDownloading} className="w-full">
            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download Report
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
