
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DOCUMENT_TYPES_CONFIG } from '@/lib/constants';
import { Loader2, ArrowLeft, FileText, Trash2, Eye, Edit, ShieldCheck, Clock } from 'lucide-react';
import { getGeneratedDocuments, deleteGeneratedDocument, getFinancialDocuments, deleteFinancialDocument } from '../actions';
import type { GeneratedDocument, FinancialDocument, CustomSetting, FinancialDocumentStatus } from '@/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ProposalPreviewDialog } from '@/app/(app)/proposals/proposal-preview-dialog';
import { getDocumentTypes, getFinancialDocumentTypes } from '@/app/(app)/settings/actions';
import { DocumentCreationDialog } from '../document-creation-dialog';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/hooks/use-sessions';

type AnyDocument = (GeneratedDocument & { docCategory?: 'standard' }) | (FinancialDocument & { docCategory?: 'financial' });

export default function GeneratedDocumentsPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const session = useSession();
    const [isDeleting, startDeleteTransition] = useTransition();

    const documentTypeParam = params.documentType;
    const documentType = documentTypeParam ? decodeURIComponent(Array.isArray(documentTypeParam) ? documentTypeParam[0] : documentTypeParam) : undefined;
    
    const [documents, setDocuments] = useState<AnyDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isValidDocType, setIsValidDocType] = useState(false);
    const [previewData, setPreviewData] = useState<{ pdfUrl: string, docxUrl: string, documentId: string, isFinancialDocument: boolean } | null>(null);

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [documentToEdit, setDocumentToEdit] = useState<AnyDocument | null>(null);

    const refreshDocuments = async () => {
        if (!documentType) return;
        setIsLoading(true);
        // Determine if the document type is valid and its category
        const [stdDocTypes, finDocTypes] = await Promise.all([
            getDocumentTypes(),
            getFinancialDocumentTypes()
        ]);
        const isStandard = stdDocTypes.some(d => d.name === documentType);
        const isFinancial = finDocTypes.some(f => f.name === documentType);

        if (!isStandard && !isFinancial) {
            setIsValidDocType(false);
            setIsLoading(false);
            return;
        }
        setIsValidDocType(true);
        
        // Fetch the correct documents based on type
        let fetchedDocs: AnyDocument[] = [];
        if (isFinancial) {
             const finDocs = await getFinancialDocuments(documentType);
             fetchedDocs = finDocs.map(d => ({ ...d, docCategory: 'financial' }));
        } else {
             const genDocs = await getGeneratedDocuments(documentType);
             fetchedDocs = genDocs.map(d => ({ ...d, docCategory: 'standard' }));
        }
        setDocuments(fetchedDocs);
        setIsLoading(false);
    };
    
    useEffect(() => {
        refreshDocuments();
    }, [documentType]);
    
    const handleDelete = (doc: AnyDocument) => {
        startDeleteTransition(async () => {
            const deleteAction = doc.docCategory === 'financial' ? deleteFinancialDocument : deleteGeneratedDocument;
            const result = await deleteAction(doc.id);

            if(result.success) {
                toast({ title: 'Document Deleted', description: `Successfully deleted document for ${doc.clientName}.` });
                setDocuments(prev => prev.filter(d => d.id !== doc.id));
            } else {
                toast({ title: 'Error', description: result.error || 'Failed to delete the document.', variant: 'destructive' });
            }
        });
    };

    const handleEdit = (doc: AnyDocument) => {
        setDocumentToEdit(doc);
        setIsCreateDialogOpen(true);
    };

    const handleGenerationSuccess = (data: { pdfUrl: string; docxUrl: string; documentId: string; isFinancialDocument: boolean; }) => {
        setIsCreateDialogOpen(false);
        setDocumentToEdit(null);
        refreshDocuments();
        setPreviewData(data);
    };

    const closeCreationDialogs = () => {
        setIsCreateDialogOpen(false);
        setDocumentToEdit(null);
    };

    const getStatusBadgeVariant = (status: FinancialDocumentStatus) => {
        switch (status) {
          case 'Approved': return 'default';
          case 'Pending': return 'secondary';
          case 'Rejected': return 'destructive';
          default: return 'outline';
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    if (!isValidDocType || !documentType) {
         return (
             <>
                <PageHeader
                    title="Invalid Document Type"
                    description="The document type specified in the URL does not exist."
                    icon={FileText}
                    actions={
                        <Button onClick={() => router.push('/documents')} variant="outline">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Doc Types
                        </Button>
                    }
                />
                 <Card className="mt-6">
                    <CardContent className="pt-6 text-center text-muted-foreground">
                        <p>Please select a valid document type from the Documents page.</p>
                    </CardContent>
                </Card>
            </>
         );
    }

    return (
        <>
            <PageHeader
                title={documentType!}
                description={`Manage all generated ${documentType!.toLowerCase()} documents.`}
                icon={FileText}
                actions={
                    <Button onClick={() => router.push('/documents')} variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Document Types
                    </Button>
                }
            />
            {documents.length === 0 ? (
                <Card className="mt-6">
                    <CardContent className="pt-6 text-center text-muted-foreground">
                        <FileText className="mx-auto h-12 w-12 mb-4" />
                        <h3 className="text-xl font-semibold mb-2">No Documents Found</h3>
                        <p>No documents of this type have been generated yet.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {documents.map((doc) => {
                        const isFinancial = doc.docCategory === 'financial';
                        const isApproved = isFinancial && (doc as FinancialDocument).status === 'Approved';
                        const isPending = isFinancial && (doc as FinancialDocument).status === 'Pending';
                        const isAdmin = session?.role === 'Admin';

                        return (
                            <Card key={doc.id} className="flex flex-col">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="font-headline">{doc.clientName}</CardTitle>
                                        {isFinancial && <Badge variant={getStatusBadgeVariant((doc as FinancialDocument).status)}>{(doc as FinancialDocument).status}</Badge>}
                                    </div>
                                    <CardDescription>
                                        Generated: {format(new Date(doc.createdAt), 'dd MMM, yyyy p')}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow" />
                                <CardFooter className="flex justify-end gap-2">
                                    {(doc.docCategory === 'standard' || isApproved) && (
                                        <>
                                            <Button variant="outline" size="sm" onClick={() => setPreviewData({ pdfUrl: doc.pdfUrl, docxUrl: doc.docxUrl, documentId: doc.id, isFinancialDocument: isFinancial })}>
                                                <Eye className="mr-2 h-4 w-4" /> View
                                            </Button>
                                            <Button variant="secondary" size="sm" onClick={() => handleEdit(doc)}>
                                                <Edit className="mr-2 h-4 w-4" /> Edit
                                            </Button>
                                        </>
                                    )}
                                    {isPending && isAdmin && (
                                        <Button asChild size="sm">
                                            <Link href={`/financial-documents/approve/${doc.id}`}>
                                                <ShieldCheck className="mr-2 h-4 w-4" /> Approve/Reject
                                            </Link>
                                        </Button>
                                    )}
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="icon" title="Delete Document" disabled={isDeleting}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently delete both the PDF and DOCX files for "{doc.clientName}". This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(doc)} disabled={isDeleting} className={buttonVariants({ variant: 'destructive'})}>
                                                    {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>
            )}
             {previewData && (
                <ProposalPreviewDialog
                    isOpen={!!previewData}
                    onClose={() => setPreviewData(null)}
                    pdfUrl={previewData.pdfUrl}
                    docxUrl={previewData.docxUrl}
                    documentId={previewData.documentId}
                    isFinancialDocument={previewData.isFinancialDocument}
                />
            )}
            {isCreateDialogOpen && (
                <DocumentCreationDialog
                  isOpen={isCreateDialogOpen}
                  onClose={closeCreationDialogs}
                  documentType={documentToEdit?.documentType || documentType!}
                  templateId={documentToEdit?.templateId || null}
                  documentToEdit={documentToEdit}
                  onSuccess={handleGenerationSuccess}
                />
            )}
        </>
    );
}
