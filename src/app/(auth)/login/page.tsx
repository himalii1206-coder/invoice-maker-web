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
import { Mail, Lock, ArrowRight } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await login(data);
    } catch {
      // Error handled by AuthContext toast
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

        {/* Login Form Card */}
        <div className="bg-warm-surface border border-warm-border/80 shadow-warmLg p-6 sm:p-8 space-y-5 rounded-none">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="owner@yourcompany.com"
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
                placeholder="••••••••"
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
