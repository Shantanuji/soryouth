
'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download, Loader2, ShieldCheck } from 'lucide-react';
import { useSession } from '@/hooks/use-sessions';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface DocumentPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string | null;
  docxUrl: string | null;
  documentId?: string;
  isFinancialDocument?: boolean;
}

// Helper function to fetch a presigned URL
const fetchPresignedUrl = async (s3Url: string | null): Promise<string | null> => {
    if (!s3Url) return null;
    try {
        const s3Key = new URL(s3Url).pathname.substring(1);
        const response = await fetch(`/api/s3/presigned-url?key=${encodeURIComponent(s3Key)}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to get secure URL.');
        }
        const data = await response.json();
        return data.url;
    } catch (err) {
        console.error(`Failed to fetch presigned URL for ${s3Url}:`, err);
        throw err; // Re-throw to be caught by the caller
    }
};


export function ProposalPreviewDialog({ isOpen, onClose, pdfUrl, docxUrl, documentId, isFinancialDocument }: DocumentPreviewDialogProps) {
  const [viewableUrl, setViewableUrl] = useState<string | null>(null);
  const [downloadableDocxUrl, setDownloadableDocxUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const session = useSession();
  const isAdmin = session?.role === 'Admin';

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError(null);
      setViewableUrl(null);
      setDownloadableDocxUrl(null);

      const fetchAllUrls = async () => {
        try {
          const [primaryUrl, docx] = await Promise.all([
            fetchPresignedUrl(pdfUrl),
            fetchPresignedUrl(docxUrl),
          ]);
          
          if (!primaryUrl) {
            setError("No file URL provided or failed to get a secure link for it.");
          }

          setViewableUrl(primaryUrl);
          setDownloadableDocxUrl(docx);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching secure links.');
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchAllUrls();
    }
  }, [isOpen, pdfUrl, docxUrl]);

  const isImage = viewableUrl && /\.(jpg|jpeg|png|gif)$/i.test(new URL(viewableUrl).pathname);
  const isPdf = viewableUrl && !isImage;

  const handlePrint = () => {
    if (!viewableUrl) return;

    if (isImage) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head><title>Print</title></head>
                    <body style="margin:0; text-align:center;">
                        <img src="${viewableUrl}" style="max-width:100%; max-height:100vh;" onload="window.print();window.close();" />
                    </body>
                </html>
            `);
            printWindow.document.close();
        }
        return;
    }
    
    // For PDF
    fetch(viewableUrl)
      .then(res => res.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = blobUrl;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          setTimeout(() => {
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
            } catch (err) {
              window.open(viewableUrl, '_blank');
            } finally {
              setTimeout(() => {
                if (document.body.contains(iframe)) document.body.removeChild(iframe);
                URL.revokeObjectURL(blobUrl);
              }, 1000);
            }
          }, 100);
        };
      })
      .catch(() => {
         window.open(viewableUrl, '_blank');
      });
  };

  const shouldShowActions = !isFinancialDocument || (isFinancialDocument && isAdmin);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Document Preview</DialogTitle>
          <DialogDescription>
            {isFinancialDocument && !isAdmin 
              ? "This is a preview. An administrator must approve this document before it can be downloaded or printed."
              : "Preview your generated document. You can also print or download it."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow border rounded-md overflow-hidden bg-muted/20 flex items-center justify-center">
          {isLoading && <Loader2 className="h-8 w-8 animate-spin" />}
          {error && <p className="text-destructive text-center p-4">Error loading preview: {error}</p>}
          {!isLoading && !error && viewableUrl && (
            <>
                {isImage && (
                    <img src={viewableUrl} alt="Document Preview" className="w-full h-full object-contain p-2"/>
                )}
                {isPdf && (
                    <iframe
                        src={viewableUrl}
                        title="Document PDF Preview"
                        className="w-full h-full"
                        frameBorder="0"
                    />
                )}
            </>
          )}
        </div>
        <DialogFooter className="sm:justify-between pt-4 flex-wrap">
          <div className="flex flex-wrap gap-2">
            {shouldShowActions && (
                <>
                    <Button asChild variant="secondary" disabled={!viewableUrl}>
                      <a href={viewableUrl || '#'} download>
                          <Download className="mr-2 h-4 w-4" />
                          Download {isImage ? 'Image' : 'PDF'}
                      </a>
                    </Button>
                    {docxUrl && (
                      <Button asChild variant="secondary" disabled={!downloadableDocxUrl}>
                        <a href={downloadableDocxUrl || '#'} download>
                            <Download className="mr-2 h-4 w-4" />
                            Download Word
                        </a>
                      </Button>
                    )}
                </>
            )}
             {isFinancialDocument && isAdmin && documentId && (
                <Button asChild>
                    <Link href={`/financial-documents/approve/${documentId}`}>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Approve Document
                    </Link>
                </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {shouldShowActions && (
                <Button onClick={handlePrint} disabled={!viewableUrl}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
