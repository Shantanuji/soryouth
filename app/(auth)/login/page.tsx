'use client';

import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import React, { useEffect, useActionState } from 'react';
import { login } from '@/app/(auth)/actions';

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
        bg-primary hover:bg-primary/90 text-white
        font-semibold text-sm py-2.5 px-4 rounded-md
        transition-all duration-150 shadow-sm
        disabled:opacity-60 disabled:cursor-not-allowed
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
      "
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {pending ? 'Signing in...' : 'Sign In'}
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
    /*
      Dhonu card p-4 — white card with soft shadow
      Contains: email field, password field, remember me + forgot, submit button, sign up link
    */
    <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6 sm:p-8">
      <form action={formAction} className="space-y-5">

        {/* Email field */}
        <div>
          <label htmlFor="email" className="dhonu-form-label">
            Email address <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <i className="ri ri-mail-line text-base" />
            </span>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              className="pl-9"
            />
          </div>
        </div>

        {/* Password field */}
        <div>
          <label htmlFor="password" className="dhonu-form-label">
            Password <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <i className="ri ri-lock-line text-base" />
            </span>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              className="pl-9"
            />
          </div>
        </div>

        {/* Remember me + Forgot password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground select-none">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
            />
            Keep me signed in
          </label>
          <Link href="#" className="text-sm text-muted-foreground hover:text-primary hover:underline underline-offset-3 transition-colors">
            Forgot Password?
          </Link>
        </div>

        {/* Submit — Dhonu d-grid btn btn-primary fw-semibold py-2 */}
        <SubmitButton />
      </form>

      {/* Sign up link — Dhonu footer inside card */}
      <p className="text-center text-sm text-muted-foreground mt-6 mb-0">
        New here?{' '}
        <Link href="#" className="font-semibold text-primary hover:underline underline-offset-3 transition-colors">
          Create an account
        </Link>
      </p>
    </div>
  );
}
