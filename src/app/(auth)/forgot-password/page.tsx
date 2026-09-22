'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-toastify';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
      toast.success('Password reset instructions sent to your email.');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-warm-bg flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
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
            Reset Password
          </h1>
          <p className="text-xs text-warm-textMuted max-w-xs mx-auto">
            Enter your account email address and we will send you a password recovery link.
          </p>
        </div>

        <div className="bg-warm-surface border border-warm-border/80 shadow-warmLg p-6 sm:p-8 rounded-none">
          {isSubmitted ? (
            <div className="text-center space-y-4 py-2">
              <div className="w-12 h-12 rounded-none bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-warm-text">Reset Link Sent!</h3>
              <p className="text-xs text-warm-textMuted leading-relaxed">
                If an account exists for <span className="font-semibold text-warm-text">{email}</span>, you will receive password reset instructions shortly.
              </p>
              <Button
                variant="outline"
                className="w-full mt-4 text-xs font-semibold"
                onClick={() => setIsSubmitted(false)}
              >
                Try another email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />

              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold mt-2"
                isLoading={isLoading}
              >
                Send Password Reset Link
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-warm-textMuted">
          <Link href="/login" className="inline-flex items-center gap-1 font-bold text-warm-accent hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
