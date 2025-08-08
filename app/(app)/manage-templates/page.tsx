
'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardPaste, PlusCircle, Edit, Trash2, FileText, Settings, Banknote, Files } from 'lucide-react';
import type { Template, CustomSetting } from '@/types';
import { getTemplates, deleteTemplate } from './actions';
import { getDocumentTypes, getFinancialDocumentTypes } from '@/app/(app)/settings/actions';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { SettingsDialog } from '@/app/(app)/settings/settings-dialog';

export default function ManageTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [documentTypes, setDocumentTypes] = useState<CustomSetting[]>([]);
  const [financialDocumentTypes, setFinancialDocumentTypes] = useState<CustomSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    const [fetchedTemplates, fetchedDocTypes, fetchedFinDocTypes] = await Promise.all([
      getTemplates(),
      getDocumentTypes(),
      getFinancialDocumentTypes(),
    ]);
    setTemplates(fetchedTemplates);
    setDocumentTypes(fetchedDocTypes);
    setFinancialDocumentTypes(fetchedFinDocTypes);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = (templateId: string) => {
    startDeleteTransition(async () => {
      const result = await deleteTemplate(templateId);
      if (result.success) {
        toast({ title: 'Template Deleted', description: 'The template has been successfully deleted.' });
        fetchData(); // Re-fetch templates to update the list
      } else {
        toast({ title: 'Error', description: 'Failed to delete the template.', variant: 'destructive' });
      }
    });
  };

  const documentTypeNames = documentTypes.map(d => d.name);
  const financialDocumentTypeNames = financialDocumentTypes.map(f => f.name);

  const proposalTemplates = templates.filter(t => t.type === 'Proposal');
  const documentTemplates = templates.filter(t => documentTypeNames.includes(t.type));
  const financialTemplates = templates.filter(t => financialDocumentTypeNames.includes(t.type));


  const renderTemplateList = (templateList: Template[]) => {
    if (isLoading) {
      return <p>Loading templates...</p>;
    }
    if (templateList.length === 0) {
      return <p className="text-sm text-muted-foreground py-4">No templates found for this category.</p>;
    }
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templateList.map(template => (
          <Card key={template.id} className="flex flex-col">
             <CardHeader className="flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>{template.name}</CardTitle>
                <CardDescription>
                  Last updated: {format(new Date(template.updatedAt), 'dd MMM, yyyy')}
                </CardDescription>
              </div>
              <Badge variant="outline">{template.type}</Badge>
            </CardHeader>
            <CardContent className="flex-grow" />
            <CardFooter className="flex justify-end gap-2">
              <Button asChild variant="secondary" size="sm">
                <Link href={`/manage-templates/${template.id}`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the template "{template.name}". This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(template.id)} disabled={isDeleting}>
                      {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title="Manage Templates"
        description="Create, edit, and manage your proposal and document templates."
        icon={ClipboardPaste}
        actions={
          <div className="flex gap-2">
             <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Manage Document Types
            </Button>
            <Button asChild>
              <Link href="/manage-templates/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Template
              </Link>
            </Button>
          </div>
        }
      />
      <Tabs defaultValue="proposal">
        <TabsList className="grid w-auto grid-cols-3">
          <TabsTrigger value="proposal"><FileText className="mr-2 h-4 w-4" />Proposal Templates ({proposalTemplates.length})</TabsTrigger>
          <TabsTrigger value="document"><Files className="mr-2 h-4 w-4" />Document Templates ({documentTemplates.length})</TabsTrigger>
          <TabsTrigger value="financial"><Banknote className="mr-2 h-4 w-4" />Financial Templates ({financialTemplates.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="proposal" className="mt-6">
          {renderTemplateList(proposalTemplates)}
        </TabsContent>
        <TabsContent value="document" className="mt-6">
          {renderTemplateList(documentTemplates)}
        </TabsContent>
        <TabsContent value="financial" className="mt-6">
          {renderTemplateList(financialTemplates)}
        </TabsContent>
      </Tabs>
      <SettingsDialog 
        isOpen={isSettingsOpen}
        onClose={() => {
            setIsSettingsOpen(false);
            fetchData();
        }}
        settingTypes={[
            { title: 'Document Types', type: 'DOCUMENT_TYPE'},
            { title: 'Financial Document Types', type: 'FINANCIAL_DOCUMENT_TYPE'},
        ]}
      />
    </>
  );
}
