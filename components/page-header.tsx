import type { LucideIcon } from 'lucide-react';
import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string | React.ReactNode;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  breadcrumbs?: string[];
}

/**
 * PageHeader — Dhonu page-title-head pattern
 * Left: h4.page-main-title + optional breadcrumbs (ol.breadcrumb)
 * Right: optional description text
 * Below title area: actions row
 */
export function PageHeader({ title, description, icon: Icon, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="mb-5 w-full">
      {/* Dhonu page-title-head row: title left, breadcrumb right */}
      <div className="dhonu-page-title-head">
        <div>
          <h1 className="dhonu-page-main-title">
            {Icon && <Icon className="inline-block h-4 w-4 mr-2 opacity-70 -mt-0.5" />}
            {title}
          </h1>
        </div>
        {/* Breadcrumb — right aligned */}
        <nav aria-label="breadcrumb">
          <ol className="dhonu-breadcrumb">
            <li>Soryouth</li>
            {breadcrumbs && breadcrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                <li className="dhonu-breadcrumb-sep">›</li>
                <li className={i === breadcrumbs.length - 1 ? 'dhonu-breadcrumb-active' : ''}>{crumb}</li>
              </React.Fragment>
            ))}
            {!breadcrumbs && (
              <>
                <li className="dhonu-breadcrumb-sep">›</li>
                <li className="dhonu-breadcrumb-active">{title}</li>
              </>
            )}
          </ol>
        </nav>
      </div>

      {/* Actions and description row — below title line */}
      {(description || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
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
