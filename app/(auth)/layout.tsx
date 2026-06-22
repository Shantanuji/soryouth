
import type { ReactNode } from 'react';
import { Toaster } from '@/components/ui/toaster';
import Image from 'next/image';
import { APP_NAME } from '@/lib/constants';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    /*
      Dhonu auth-box: full-screen centered layout
      Background: bg-background (light: #F8FAFC / dark: near-black #0F172A)
    */
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Content column — matches Dhonu col-xxl-4 col-md-6 col-sm-8 */}
      <div className="w-full max-w-md">

        {/* Brand block — above card, centered */}
        <div className="text-center mb-6">
          {/* Official Soryouth Logo */}
          <div className="inline-flex items-center justify-center mb-4">
            <Image
              src="/assets/images/logo-light.png"
              alt={APP_NAME}
              width={180}
              height={48}
              className="object-contain h-12 w-auto dark:hidden"
              priority
            />
            <Image
              src="/assets/images/logo-dark.png"
              alt={APP_NAME}
              width={180}
              height={48}
              className="object-contain h-12 w-auto hidden dark:block"
              priority
            />
          </div>
          <h4 className="text-xl font-extrabold text-foreground tracking-tight">Welcome</h4>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
            Let&apos;s get you signed in. Enter your credentials to continue.
          </p>
        </div>

        {/* Card — matches Dhonu "card p-4" */}
        <main>
          {children}
        </main>

        {/* Footer copyright */}
        <p className="text-center text-xs text-muted-foreground mt-5">
          © {new Date().getFullYear()} {APP_NAME} — Solar CRM Platform
        </p>
      </div>

      <Toaster />
    </div>
  );
}
