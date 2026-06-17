import './globals.css';
import { Inter, Hanken_Grotesk } from 'next/font/google';
import type { ReactNode } from 'react';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const hankenGrotesk = Hanken_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-hanken-grotesk',
});

export const metadata = {
  title: 'Soryouth - CRM & Renewable Energy Solutions',
  description: 'Manage leads, proposals, and documents for your solar business with Soryouth.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${hankenGrotesk.variable}`}>
      <head>
        <meta name="viewport" content="width=auto, initial-scale=1.0" />
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
