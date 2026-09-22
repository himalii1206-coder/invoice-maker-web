'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Mail, Lock, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, verifyTwoFactor, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Set once the password has been accepted but the account needs a second
   * factor. Holding it here keeps the challenge in memory only - it is never
   * written to storage.
   */
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsSubmitting(true);
      const challenge = await login(data);
      if (challenge) setChallengeToken(challenge.challengeToken);
    } catch {
      // Error handled by AuthContext toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeToken) return;

    try {
      setIsSubmitting(true);
      await verifyTwoFactor(challengeToken, twoFactorCode.trim());
    } catch {
      // A rejected code may also mean the 5 minute challenge expired; the toast
      // from the context says which, and the user can step back to retry.
      setTwoFactorCode('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-warm-bg flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Logo & Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center mb-2">
            <Image
              src="/images/logo.png"
              alt="InvoiceMaker Logo"
              width={52}
              height={52}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-warm-text tracking-tight">
            Sign in to InvoiceMaker
          </h1>
          <p className="text-xs text-warm-textMuted max-w-xs mx-auto">
            Manage your business invoices, customers, payments, and GST compliance cleanly.
          </p>
        </div>

        {/* Two-Factor Challenge */}
        {challengeToken ? (
          <div className="bg-warm-surface border border-warm-border/80 shadow-warmLg p-6 sm:p-8 space-y-5 rounded-none">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 bg-warm-accentLight text-warm-accent shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                  Two-Factor Verification
                </h2>
                <p className="text-xs text-warm-textMuted mt-0.5">
                  Enter the 6-digit code from your authenticator app, or one of your recovery codes.
                </p>
              </div>
            </div>

            <form onSubmit={onVerify} className="space-y-4">
              <Input
                label="Authentication Code"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                placeholder="000000"
                autoComplete="one-time-code"
                autoFocus
                required
              />

              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold"
                isLoading={isSubmitting || isLoading}
                disabled={twoFactorCode.trim().length < 6}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Verify &amp; Continue
              </Button>

              <button
                type="button"
                onClick={() => {
                  setChallengeToken(null);
                  setTwoFactorCode('');
                }}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-warm-textMuted hover:text-warm-accent"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to sign in
              </button>
            </form>
          </div>
        ) : (
        /* Login Form Card */
        <div className="bg-warm-surface border border-warm-border/80 shadow-warmLg p-6 sm:p-8 space-y-5 rounded-none">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="Enter your email"
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              required
              {...register('email')}
            />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-warm-textMuted">
                  Password
                </span>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-warm-accent hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                type="password"
                placeholder="Enter your password"
                leftIcon={<Lock className="w-4 h-4" />}
                error={errors.password?.message}
                required
                {...register('password')}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold mt-2"
              isLoading={isSubmitting || isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to Account
            </Button>
          </form>

          <div className="p-3 bg-warm-accentLight/50 border border-warm-border/40 text-center rounded-none">
            <p className="text-[11px] font-semibold text-warm-textMuted">
              New to InvoiceMaker? Register your business in 30 seconds.
            </p>
          </div>
        </div>
        )}

        {/* Footer Link */}
        <p className="text-center text-xs text-warm-textMuted">
          Don’t have a business account?{' '}
          <Link href="/register" className="font-bold text-warm-accent hover:underline">
            Register Business
          </Link>
        </p>
      </div>
    </div>
  );
}
