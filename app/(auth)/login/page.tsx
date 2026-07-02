'use client';

import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2 } from 'lucide-react';
import React, { useEffect, useActionState } from 'react';
import { login } from '@/app/(auth)/actions';
import Image from 'next/image';
import { APP_NAME } from '@/lib/constants';
import { DarkModeToggle } from '@/components/topbar-actions';

const initialState = {
  error: '',
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="
        w-full flex items-center justify-center gap-2
        bg-[#1976F3] hover:bg-[#0D47A1] text-white
        font-semibold text-sm py-3 px-4 rounded-xl
        transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5
        disabled:opacity-60 disabled:cursor-not-allowed
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
      "
    >
      {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
      {pending ? 'Signing in...' : 'Login →'}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useActionState(login, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state?.error) {
      toast({
        title: "Login Failed",
        description: state.error,
        variant: "destructive",
      });
    }
  }, [state, toast]);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full bg-background relative overflow-hidden">
      
      {/* Mobile-only background accents */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none lg:hidden z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[30rem] h-[30rem] rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[20rem] h-[20rem] rounded-full bg-primary/10 blur-3xl" />
      </div>

      {/* LEFT SIDE: Branding Section (Hidden on Mobile) */}
      <div className="relative flex-1 lg:w-[55%] hidden lg:flex flex-col justify-between bg-gradient-to-br from-blue-50 to-white dark:from-slate-900 dark:to-slate-950 p-8 lg:p-16 overflow-hidden">
        {/* Abstract Background Accents */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] right-[-5%] w-[40rem] h-[40rem] rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[30rem] h-[30rem] rounded-full bg-primary/10 blur-3xl" />
        </div>

        {/* Top Logo */}
        <div className="relative z-10 flex items-center gap-2">
            <Image
              src="/assets/images/logo-light.png"
              alt={APP_NAME}
              width={160}
              height={40}
              className="object-contain h-10 w-auto dark:hidden"
              priority
            />
            <Image
              src="/assets/images/logo-dark.png"
              alt={APP_NAME}
              width={160}
              height={40}
              className="object-contain h-10 w-auto hidden dark:block"
              priority
            />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 mt-12 lg:mt-0 flex-grow flex flex-col justify-center">
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-foreground mb-6 font-headline leading-tight">
                Power Up Your Solar Business with <span className="text-[#1976F3]">Soryouth CRM</span>
            </h1>
            <p className="text-lg lg:text-xl text-muted-foreground mb-10 max-w-xl leading-relaxed">
                The complete CRM for Solar EPC, Rooftop Solar Installers, AMC Providers, and Renewable Energy Companies.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                {[
                    'Lead Management',
                    'Proposal Generation',
                    'Client Management',
                    'Site Survey Reports',
                    'AMC Management',
                    'Document Automation',
                    'Service Tickets',
                    'Reports & Analytics'
                ].map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-[#1976F3]" />
                        <span className="text-foreground font-medium">{feature}</span>
                    </div>
                ))}
            </div>
        </div>

        {/* Bottom Footer for left side */}
        <div className="relative z-10 mt-12 text-sm text-muted-foreground hidden lg:block">
             &copy; {new Date().getFullYear()} Soryouth CRM. All rights reserved.
        </div>
      </div>

      {/* RIGHT SIDE: Login Section */}
      <div className="flex-1 lg:w-[45%] flex flex-col relative bg-background">
        
        {/* Minimal Header */}
        <div className="absolute top-0 right-0 p-6 z-20 w-full flex justify-end">
             <DarkModeToggle />
        </div>

        {/* Login Form Container */}
        <div className="flex-grow flex items-center justify-center p-6 lg:p-12 mt-12 lg:mt-0">
            <div className="w-full max-w-[420px] bg-card/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 p-8 sm:p-10 relative overflow-hidden">
                {/* Subtle top border accent */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#1976F3] to-[#FF6B00]"></div>
                
                <div className="text-center mb-8">
                    {/* Mobile Logo Only visible on small screens */}
                    <div className="flex justify-center mb-6 lg:hidden">
                        <Image
                            src="/assets/images/logo-light.png"
                            alt={APP_NAME}
                            width={140}
                            height={36}
                            className="object-contain h-9 w-auto dark:hidden"
                        />
                        <Image
                            src="/assets/images/logo-dark.png"
                            alt={APP_NAME}
                            width={140}
                            height={36}
                            className="object-contain h-9 w-auto hidden dark:block"
                        />
                    </div>
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-[#1976F3]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Welcome Back</h2>
                    <p className="text-sm text-muted-foreground mt-2">Sign in to your Soryouth CRM account</p>
                </div>

                <form action={formAction} className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium text-foreground">
                            Email Address <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="you@company.com"
                                required
                                className="pl-10 h-12 rounded-xl bg-background/50 focus:bg-background transition-colors"
                            />
                            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-medium text-foreground">
                            Password <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                required
                                className="pl-10 h-12 rounded-xl bg-background/50 focus:bg-background transition-colors"
                            />
                            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground select-none group">
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-border accent-[#1976F3] transition-colors cursor-pointer"
                            />
                            <span className="group-hover:text-foreground transition-colors">Remember Me</span>
                        </label>
                        <Link href="#" className="text-sm font-medium text-[#1976F3] hover:text-[#0D47A1] transition-colors">
                            Forgot Password?
                        </Link>
                    </div>

                    <div className="pt-2">
                        <SubmitButton />
                    </div>
                </form>
            </div>
            
            {/* Minimal Footer */}
            <div className="absolute bottom-6 w-full flex flex-col justify-center items-center gap-2 text-xs text-muted-foreground">
                <div className="flex gap-4">
                   <Link href="#" className="hover:text-foreground transition-colors">Privacy Policy</Link>
                   <span>&bull;</span>
                   <Link href="#" className="hover:text-foreground transition-colors">Terms of Service</Link>
                </div>
                <div className="lg:hidden">
                    &copy; {new Date().getFullYear()} Soryouth CRM.
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
