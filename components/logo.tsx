'use client';

import { AppLogoIcon } from '@/components/app-logo-icon';
import { APP_NAME } from '@/lib/constants';
import { useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
}

export function Logo({ className, iconOnly = false }: LogoProps) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      variant="ghost"
      className={cn(
        "flex h-auto w-auto items-center justify-start p-0 text-left hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0",
        className
      )}
      onClick={toggleSidebar}
    >
      <AppLogoIcon className="h-6 w-6 text-primary" />
      {!iconOnly && (
        <span className="ml-2 truncate text-lg font-extrabold tracking-wider uppercase text-primary group-data-[collapsible=icon]:hidden">
          {APP_NAME}
        </span>
      )}
    </Button>
  );
}
