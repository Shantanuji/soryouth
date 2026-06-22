"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        // Auto-detect success toasts if they are default or undefined
        let inferredVariant = variant;
        if (!variant || variant === "default") {
          if (title) {
            const t = String(title).toLowerCase();
            if (
              t.includes('success') || 
              t.includes('saved') || 
              t.includes('updated') || 
              t.includes('deleted') || 
              t.includes('created') || 
              t.includes('completed')
            ) {
              inferredVariant = 'success';
            }
          }
        }

        // Select the appropriate icon based on the variant
        let ToastIcon = null;
        if (inferredVariant === 'success') {
          ToastIcon = <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mr-2 shrink-0" />;
        } else if (inferredVariant === 'destructive') {
          ToastIcon = <AlertCircle className="h-5 w-5 text-destructive mr-2 shrink-0" />;
        } else if (inferredVariant === 'warning') {
          ToastIcon = <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-2 shrink-0" />;
        } else if (title) {
          ToastIcon = <Info className="h-5 w-5 text-primary mr-2 shrink-0" />;
        }

        return (
          <Toast key={id} variant={inferredVariant} {...props}>
            <div className="flex items-start">
              {ToastIcon}
              <div className="grid gap-1">
                {title && <ToastTitle className="mt-0.5">{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
