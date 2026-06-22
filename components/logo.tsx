'use client';

import Image from 'next/image';
import { APP_NAME } from '@/lib/constants';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
}

export function Logo({ className, iconOnly = false }: LogoProps) {
  const { toggleSidebar, state } = useSidebar();
  
  const isCollapsed = state === 'collapsed';

  return (
    <button
      onClick={toggleSidebar}
      className={cn(
        "flex h-auto items-center justify-center gap-2 p-0 bg-transparent border-0 cursor-pointer focus-visible:outline-none transition-transform hover:scale-[1.02] active:scale-[0.98]",
        className
      )}
      aria-label="Toggle Sidebar"
    >
      {isCollapsed || iconOnly ? (
        <div className="h-10 w-10 flex items-center justify-center shrink-0">
          <Image
            src="/assets/images/logo-icon.png"
            alt={APP_NAME}
            width={40}
            height={40}
            className="object-contain h-10 w-10"
          />
        </div>
      ) : (
        <div className="flex items-center justify-center h-11 shrink-0 w-full">
          <Image
            src="/assets/images/logo-light.png"
            alt={APP_NAME}
            width={180}
            height={44}
            className="object-contain h-11 w-auto dark:hidden"
            priority
          />
          <Image
            src="/assets/images/logo-dark.png"
            alt={APP_NAME}
            width={180}
            height={44}
            className="object-contain h-11 w-auto hidden dark:block"
            priority
          />
        </div>
      )}
    </button>
  );
}
