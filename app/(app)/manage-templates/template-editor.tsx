
'use client';

import { useState, useTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue, SelectSeparator } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { saveTemplate } from './actions';
import type { Template, DocumentType, CustomSetting } from '@/types';
import { PLACEHOLDER_DEFINITIONS_PROPOSAL } from '@/lib/constants';
import { Copy, Loader2, UploadCloud, File, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getDocumentTypes, getFinancialDocumentTypes } from '@/app/(app)/settings/actions';


const templateSchema = z.object({
  name: z.string().min(3, 'Template name must be at least 3 characters long.'),
  type: z.string().min(1, 'Please select a template type.'),
  originalDocxPath: z.string().min(1, 'A document must be uploaded.'),
  placeholdersJson: z.string().optional(),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

interface TemplateEditorProps {
  template: Template | null;
  documentTypes: CustomSetting[];
}

export function TemplateEditor({ template }: TemplateEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [extractedPlaceholders, setExtractedPlaceholders] = useState<string[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(template?.originalDocxPath || null);
  
  const [documentTypes, setDocumentTypes] = useState<CustomSetting[]>([]);
  const [financialDocumentTypes, setFinancialDocumentTypes] = useState<CustomSetting[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: template?.name || '',
      type: template?.type || undefined,
      originalDocxPath: template?.originalDocxPath || '',
      placeholdersJson: template?.placeholdersJson || '[]',
    },
  });
  
  const watchedTemplateType = form.watch('type');

  useEffect(() => {
    async function fetchTypes() {
        setIsLoadingTypes(true);
        const [docTypes, finDocTypes] = await Promise.all([
            getDocumentTypes(),
            getFinancialDocumentTypes()
        ]);
        setDocumentTypes(docTypes);
        setFinancialDocumentTypes(finDocTypes);
        setIsLoadingTypes(false);
    }
    fetchTypes();
  }, []);

  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name,
        type: template.type,
        originalDocxPath: template.originalDocxPath,
        placeholdersJson: template.placeholdersJson || '[]',
      });
      setUploadedFileName(template.originalDocxPath);
      if (template.placeholdersJson) {
        setExtractedPlaceholders(JSON.parse(template.placeholdersJson));
      }
    }
  }, [template, form]);

  const handleCopyPlaceholder = (placeholder: string) => {
    navigator.clipboard.writeText(placeholder);
    toast({
      title: 'Copied!',
      description: `${placeholder} copied to clipboard.`,
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!/\.(docx|dotx)$/i.test(file.name)) {
        toast({ title: "Invalid File Type", description: "Please upload a .docx or .dotx file.", variant: "destructive" });
        return;
    }

    setIsUploading(true);
    setExtractedPlaceholders([]);
    
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('folder', 'templates');

    try {
        const uploadResponse = await fetch('/api/templates/upload', {
            method: 'POST',
            body: uploadFormData,
        });

        if (!uploadResponse.ok) throw new Error('Failed to upload file.');
        const uploadResult = await uploadResponse.json();
        
        form.setValue('originalDocxPath', uploadResult.filePath, { shouldValidate: true, shouldDirty: true });
        setUploadedFileName(file.name);
        
        if (!form.getValues('name')) {
            form.setValue('name', file.name.replace(/\.(docx|dotx)$/i, ''));
        }
        toast({ title: "Upload Successful", description: `File '${file.name}' has been uploaded.` });
        
        const currentType = form.getValues('type');
        const isFinancial = financialDocumentTypes.some(f => f.name === currentType);

        if (currentType && currentType !== 'Proposal') {
            const extractFormData = new FormData();
            extractFormData.append('file', file);
            const extractResponse = await fetch('/api/templates/extract-placeholders', {
                method: 'POST',
                body: extractFormData,
            });
            if (!extractResponse.ok) throw new Error('Failed to extract placeholders.');
            const extractResult = await extractResponse.json();
            setExtractedPlaceholders(extractResult.placeholders || []);
            form.setValue('placeholdersJson', JSON.stringify(extractResult.placeholders || []));
            toast({ title: "Placeholders Extracted", description: `${extractResult.placeholders?.length || 0} placeholders found.`});
        }

    } catch (error) {
        toast({
            title: "Processing Failed",
            description: (error as Error).message,
            variant: "destructive",
        });
    } finally {
        setIsUploading(false);
    }
  };

  const onSubmit = (values: TemplateFormValues) => {
    startTransition(async () => {
      // The `type` from `values.type` is already the correct string selected in the dropdown.
      // No need for extra logic.
      const dataToSave = {
        id: template?.id,
        name: values.name,
        type: values.type, // Directly use the selected value
        originalDocxPath: values.originalDocxPath,
        placeholdersJson: values.placeholdersJson,
      };

      const result = await saveTemplate(dataToSave as any);
      if (result) {
        toast({
          title: 'Template Saved',
          description: `Template "${result.name}" has been saved successfully.`,
        });
        router.push('/manage-templates');
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to save the template.',
          variant: 'destructive',
        });
      }
    });
  };

  const renderPlaceholders = () => {
    if (watchedTemplateType === 'Proposal') {
      const placeholders = PLACEHOLDER_DEFINITIONS_PROPOSAL;
      return (
          <Accordion type="multiple" className="w-full">
            {Object.entries(placeholders).map(([groupName, groupPlaceholders]) => (
              <AccordionItem value={groupName} key={groupName}>
                <AccordionTrigger>{groupName}</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {(groupPlaceholders as any[]).map(p => (
                      <div key={p.placeholder} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                        <div>
                          <p className="font-mono text-xs font-semibold">{p.placeholder}</p>
                          <p className="text-xs text-muted-foreground">{p.description}</p>
                        </div>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCopyPlaceholder(p.placeholder)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
      );
    }
    
    if (extractedPlaceholders.length > 0) {
      return (
        <div className="space-y-2">
          <h4 className="font-medium">Extracted Placeholders</h4>
           {extractedPlaceholders.map(p => (
              <div key={p} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                <p className="font-mono text-xs font-semibold">{p}</p>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCopyPlaceholder(p)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
        </div>
      );
    }
    
    return <p className="text-sm text-muted-foreground">Select a template type and upload a file to see available placeholders.</p>;
  }

  return (
    <div className="grid md:grid-cols-3 gap-8">
      <div className="md:col-span-2">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Template Details</CardTitle>
                 <CardDescription>
                  Upload a DOCX file to be used as a template. The structure and styling will be preserved. For non-proposal documents, placeholders will be automatically extracted.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Standard Commercial Proposal" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!!template || isLoadingTypes}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={isLoadingTypes ? "Loading types..." : "Select a type"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                             <SelectItem value="Proposal">Proposal</SelectItem>
                             <SelectSeparator />
                             <SelectGroup>
                                 <SelectLabel>Document Types</SelectLabel>
                                 {documentTypes.map(docType => (
                                     <SelectItem key={docType.id} value={docType.name}>{docType.name}</SelectItem>
                                 ))}
                             </SelectGroup>
                              <SelectSeparator />
                             <SelectGroup>
                                 <SelectLabel>Financial Document Types</SelectLabel>
                                 {financialDocumentTypes.map(docType => (
                                     <SelectItem key={docType.id} value={docType.name}>{docType.name}</SelectItem>
                                 ))}
                             </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="originalDocxPath"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template File</FormLabel>
                      <FormControl>
                        <div>
                          <Input id="docx-upload" type="file" accept=".docx,.dotx" onChange={handleFileUpload} className="hidden" disabled={isUploading}/>
                          <label htmlFor="docx-upload" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-10 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer">
                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UploadCloud className="mr-2 h-4 w-4"/>}
                            <span>{isUploading ? 'Uploading...' : 'Upload .docx / .dotx'}</span>
                          </label>
                        </div>
                      </FormControl>
                      {uploadedFileName && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground p-2 border rounded-md">
                          <File className="h-4 w-4" />
                          <span className="flex-grow">{uploadedFileName.split('/').pop()}</span>
                           <a href={form.getValues('originalDocxPath')} target="_blank" rel="noopener noreferrer" download className="text-primary hover:underline" title="Download Template">
                            <Download className="h-4 w-4"/>
                          </a>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isPending || isUploading} className="mt-6">
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Template
                </Button>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>

      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Available Placeholders</CardTitle>
            <CardDescription>Click to copy and then paste them (including the `Curly` brackets) into your Word document template.</CardDescription>
          </CardHeader>
          <CardContent>
            {renderPlaceholders()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
