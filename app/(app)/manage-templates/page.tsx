
'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardPaste, PlusCircle, Edit, Trash2, FileText, Settings, Banknote, Files, Loader2 } from 'lucide-react';
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
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="ml-2 text-sm text-muted-foreground">Loading templates...</p>
        </div>
      );
    }
    if (templateList.length === 0) {
      return <p className="text-xs text-muted-foreground py-6 text-center bg-card border border-border/50 rounded-xl shadow-sm">No templates found for this category.</p>;
    }
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templateList.map(template => (
          <Card key={template.id} className="flex flex-col border border-border/80 shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-all duration-200">
             <CardHeader className="flex flex-row items-start gap-3 pb-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-grow space-y-0.5">
                <CardTitle className="text-sm font-bold text-foreground line-clamp-1">{template.name}</CardTitle>
                <CardDescription className="text-[11px] text-muted-foreground">
                  Last updated: {format(new Date(template.updatedAt), 'dd MMM, yyyy')}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex-grow pt-0 pb-3">
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[11px] text-muted-foreground font-medium">Type:</span>
                <Badge variant="softInfo" className="text-[10px] py-0 px-2 font-semibold capitalize">{template.type}</Badge>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 bg-muted/15 border-t border-border/40 p-3">
              <Button asChild variant="outline" size="sm" className="h-8 text-xs font-semibold hover:bg-muted">
                <Link href={`/manage-templates/${template.id}`}>
                  <Edit className="mr-1.5 h-3.5 w-3.5" />
                  Edit
                </Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="h-8 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white border-transparent">
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
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
                    <AlertDialogAction onClick={() => handleDelete(template.id)} disabled={isDeleting} className="bg-rose-600 hover:bg-rose-700 text-white">
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
              <Settings className="mr-2 h-4 w-4" /> Manage Document Types
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
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 h-auto md:h-10">
          <TabsTrigger value="proposal" className="flex-wrap h-auto py-2 sm:py-1.5 sm:h-10">
            <FileText className="mr-2 h-4 w-4" />
            <span className="truncate">Proposal Templates</span>
            <span className="ml-1">({proposalTemplates.length})</span>
          </TabsTrigger>
          <TabsTrigger value="document" className="flex-wrap h-auto py-2 sm:py-1.5 sm:h-10">
            <Files className="mr-2 h-4 w-4" />
            <span className="truncate">Document Templates</span>
            <span className="ml-1">({documentTemplates.length})</span>
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex-wrap h-auto py-2 sm:py-1.5 sm:h-10">
            <Banknote className="mr-2 h-4 w-4" />
            <span className="truncate">Financial Templates</span>
            <span className="ml-1">({financialTemplates.length})</span>
          </TabsTrigger>
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
