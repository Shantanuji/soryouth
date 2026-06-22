
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, CheckCircle2, XCircle, ArrowLeft, FileText, Download } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { getFinancialDocumentById, reviewFinancialDocument } from '@/app/(app)/documents/actions';
import type { FinancialDocument } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/hooks/use-sessions';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function ApproveFinancialDocumentPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const session = useSession();
    const documentId = typeof params.documentId === 'string' ? params.documentId : '';
    
    const [document, setDocument] = useState<FinancialDocument | null>(null);
    const [viewableUrl, setViewableUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, startSubmitTransition] = useTransition();

    useEffect(() => {
        if (documentId) {
            setIsLoading(true);
            getFinancialDocumentById(documentId)
                .then(async (doc) => {
                    setDocument(doc);
                    if (doc?.pdfUrl) {
                        try {
                            const s3Key = new URL(doc.pdfUrl).pathname.substring(1);
                            const response = await fetch(`/api/s3/presigned-url?key=${encodeURIComponent(s3Key)}`);
                             if (!response.ok) {
                                throw new Error('Failed to get secure URL.');
                             }
                             const data = await response.json();
                             setViewableUrl(data.url);
                        } catch (e) {
                            toast({ title: 'Error', description: 'Could not load document preview.', variant: 'destructive'});
                        }
                    }
                    setIsLoading(false);
                })
                .catch(err => {
                    toast({ title: 'Error', description: 'Failed to load document.', variant: 'destructive' });
                    setIsLoading(false);
                });
        }
    }, [documentId, toast]);

    const handleReview = (status: 'Approved' | 'Rejected') => {
        if (!document) return;
        startSubmitTransition(async () => {
            const result = await reviewFinancialDocument(document.id, status);
            if (result.success) {
                toast({ title: 'Success', description: `Document has been ${status.toLowerCase()}.` });
                router.push(`/documents/${encodeURIComponent(document.documentType)}`);
            } else {
                toast({ title: 'Error', description: result.error || 'Failed to update status.', variant: 'destructive' });
            }
        });
    };

    const isAdmin = session?.role === 'Admin';

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    if (!document) {
        return (
            <>
                <PageHeader title="Document Not Found" icon={FileText} />
                <p>The requested document could not be found or you do not have permission to view it.</p>
            </>
        );
    }

    return (
        <>
            <PageHeader 
                title={`Review: ${document.documentType}`} 
                description={`For client: ${document.clientName}`}
                icon={ShieldCheck}
                actions={<Button variant="outline" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-2"/>Back</Button>}
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                     <Card className="h-[80vh]">
                        <CardHeader className="flex flex-row justify-between items-center">
                            <CardTitle>Document Preview</CardTitle>
                            {viewableUrl && <Button asChild variant="outline" size="sm"><a href={viewableUrl} download><Download className="mr-2 h-4 w-4"/>Download PDF</a></Button>}
                        </CardHeader>
                        <CardContent className="p-0 h-[calc(100%-80px)]">
                           {viewableUrl ? (
                                <iframe src={viewableUrl} className="w-full h-full border-0" title="Document Preview"/>
                           ) : (
                               <div className="flex justify-center items-center h-full text-muted-foreground">
                                   <Loader2 className="h-6 w-6 animate-spin"/>
                                   <p className="ml-2">Loading secure preview...</p>
                               </div>
                           )}
                        </CardContent>
                     </Card>
                </div>
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Review & Action</CardTitle>
                            <CardDescription>
                                Review the document and either approve or reject it.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h4 className="font-semibold">Current Status</h4>
                                <Badge variant={document.status === 'Approved' ? 'default' : document.status === 'Rejected' ? 'destructive' : 'secondary'}>
                                    {document.status}
                                </Badge>
                            </div>
                             {document.reviewedAt && (
                                <div>
                                    <h4 className="font-semibold">Reviewed By</h4>
                                    <p className="text-sm">{document.reviewedBy?.name || 'N/A'} on {format(new Date(document.reviewedAt), 'dd MMM yyyy')}</p>
                                </div>
                             )}
                        </CardContent>
                        {isAdmin && (
                            <CardFooter className="flex flex-col gap-2">
                                <Button 
                                    className="w-full bg-primary hover:bg-primary/90"
                                    onClick={() => handleReview('Approved')}
                                    disabled={isSubmitting || document.status === 'Approved'}
                                >
                                    {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                                    Approve
                                </Button>
                                <Button
                                    variant="destructive" 
                                    className="w-full"
                                    onClick={() => handleReview('Rejected')}
                                    disabled={isSubmitting || document.status === 'Rejected'}
                                >
                                     {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <XCircle className="h-4 w-4 mr-2" />}
                                    Reject
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                </div>
            </div>
        </>
    )

}
