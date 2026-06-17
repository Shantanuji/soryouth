import type { LucideIcon } from 'lucide-react';
import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string | React.ReactNode;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, icon: Icon, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-1 w-full">
      {/* Dhonu Breadcrumbs Row */}
      <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-1">
        <div>
          <h1 className="text-base font-extrabold text-foreground tracking-tight">{title}</h1>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-muted-foreground/80 uppercase tracking-wider">
          <span>Soryouth</span>
          <span>&gt;</span>
          <span>CRM</span>
          <span>&gt;</span>
          <span className="text-foreground/85">{title}</span>
        </div>
      </div>
      
      {/* Actions and description row */}
      {(description || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-1">
          {description && (
            <div className="text-xs text-muted-foreground font-medium">
              {typeof description === 'string' ? <p>{description}</p> : description}
            </div>
          )}
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
              {actions}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
