'use client';

import { useEffect, useRef } from 'react';
import { reportCrashToServer } from '@/app/actions/crash-actions';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const hasReported = useRef(false);

  useEffect(() => {
    // Only report once per crash instance to prevent spamming
    if (!hasReported.current) {
      hasReported.current = true;
      console.error('Global Error Boundary caught an error:', error);
      
      const errorMessage = `Message: ${error.message}\nDigest: ${error.digest}\nStack: ${error.stack}`;
      
      // Silently report crash to server (which handles email backup with a 1-hour cooldown)
      reportCrashToServer(errorMessage).catch((err) => {
        console.error('Failed to report crash to server:', err);
      });
    }
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 text-center">
          <AlertTriangle className="h-16 w-16 text-destructive mb-6" />
          <h1 className="text-4xl font-bold mb-4">Something went wrong!</h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-md">
            A critical error occurred. The system administrator has been automatically notified and a database backup has been secured.
          </p>
          <div className="flex gap-4">
            <Button onClick={() => reset()} variant="default">
              Try again
            </Button>
            <Button onClick={() => window.location.href = '/'} variant="outline">
              Return Home
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
