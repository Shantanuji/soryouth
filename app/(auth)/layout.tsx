
import type { ReactNode } from 'react';
import { Toaster } from '@/components/ui/toaster';


export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
