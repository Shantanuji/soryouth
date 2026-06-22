
import { cn } from '@/lib/utils';

/**
 * DhonuBadge — matches Dhonu badge-soft-* pattern
 * Usage: <DhonuBadge variant="success">Active</DhonuBadge>
 */
interface DhonuBadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'secondary';
  className?: string;
}

const variantClasses = {
  primary: 'badge-soft-primary',
  success: 'badge-soft-success',
  danger: 'badge-soft-danger',
  warning: 'badge-soft-warning',
  info: 'badge-soft-info',
  secondary: 'badge-soft-secondary',
};

export function DhonuBadge({ children, variant = 'primary', className }: DhonuBadgeProps) {
  return (
    <span className={cn(variantClasses[variant], className)}>
      {children}
    </span>
  );
}
