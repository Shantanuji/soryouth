import { type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DhonuStatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  trendLabel?: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

const variantMap = {
  primary: 'avatar-stat-primary',
  success: 'avatar-stat-success',
  warning: 'avatar-stat-warning',
  danger:  'avatar-stat-danger',
  info:    'avatar-stat-info',
};

const borderMap = {
  primary: 'border-primary',
  success: 'border-sky-500',
  warning: 'border-secondary',
  danger:  'border-rose-500',
  info:    'border-sky-400',
};

export function DhonuStatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp = true,
  trendLabel = 'Since last month',
  variant = 'primary',
}: DhonuStatCardProps) {
  return (
    <Card className="group border border-border/50 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 overflow-hidden h-full bg-card relative">
      {/* Decorative background blob */}
      <div className={cn(
        "absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-150",
        borderMap[variant].replace('border-', 'bg-')
      )} />

      <CardContent className="p-4 flex flex-col justify-between h-full relative z-10">
        {/* Title with left accent border */}
        <div className="mb-4">
          <div className={cn("border-l-4 pl-2 text-[12px] font-semibold text-muted-foreground uppercase tracking-wider", borderMap[variant])}>
            {title}
          </div>
        </div>

        {/* Icon and Value */}
        <div className="flex items-center gap-4 mb-4">
          <div className={cn("h-12 w-12 rounded-xl shadow-sm flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110", variantMap[variant])}>
            <Icon className="h-6 w-6" />
          </div>
          <h3 className="text-[28px] font-extrabold tracking-tight text-foreground leading-none">
            {value}
          </h3>
        </div>

        {/* Trend */}
        {trend && (
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground font-medium mt-auto">
            <span className={trendUp ? 'text-sky-500 font-semibold' : 'text-rose-500 font-semibold'}>
              {trendUp ? '▲' : '▼'} {trend}
            </span>
            <span>{trendLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
