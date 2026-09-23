'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { teamApi, InviteDetails, ROLE_LABELS } from '@/lib/team';
import { getApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Building2, ArrowRight, AlertTriangle, Lock, UserCheck } from 'lucide-react';
import { toast } from 'react-toastify';

/**
 * Landing page for an emailed invitation link.
 *
 * The token in the URL is the credential, so this route is public. What it asks
 * for depends on whether the invitee already has an account: an existing user
 * just confirms, a new one chooses a name and password.
 */
function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();

  const token = searchParams.get('token') ?? '';

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!token) {
      setLoadError('This invitation link is missing its token.');
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const details = await teamApi.describeInvite(token);
        if (!cancelled) setInvite(details);
      } catch (err: any) {
        if (!cancelled) setLoadError(getApiErrorMessage(err, 'This invitation is no longer valid.'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();

    if (invite?.requiresSignup && password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await teamApi.acceptInvite({
        token,
        ...(invite?.requiresSignup ? { firstName, lastName, password } : {})
      });

      // Accepting signs the user straight in, so the tokens go straight to
      // storage and the dashboard is the next stop.
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
      await refreshUser();

      toast.success(`Welcome to ${invite?.businessName ?? 'the team'}!`);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Could not accept this invitation'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-warm-bg flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center mb-2">
            <Logo className="w-12 h-12" size={48} />
          </div>
          <h1 className="text-2xl font-bold text-warm-text tracking-tight">
            Team Invitation
          </h1>
        </div>

        <div className="bg-warm-surface border border-warm-border/80 shadow-warmLg p-6 sm:p-8 space-y-5 rounded-none">
          {isLoading ? (
            <p className="text-xs text-warm-textMuted text-center py-6">
              Checking your invitation...
            </p>
          ) : loadError || !invite ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 text-xs bg-amber-50 border border-amber-200 text-amber-900 p-3">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{loadError}</p>
              </div>
              <p className="text-xs text-warm-textMuted">
                Invitations expire after 7 days and can only be used once. Ask whoever invited you to
                send a new one.
              </p>
              <Link href="/login">
                <Button className="w-full h-11 text-sm font-semibold">Go to Sign In</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="p-4 bg-warm-accentLight/40 border border-warm-accent/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-warm-accent shrink-0" />
                  <span className="text-sm font-bold text-warm-text">{invite.businessName}</span>
                </div>
                <p className="text-xs text-warm-textMuted">
                  You have been invited as{' '}
                  <span className="font-bold text-warm-text">{ROLE_LABELS[invite.role]}</span>, for{' '}
                  <span className="font-semibold text-warm-text">{invite.email}</span>.
                </p>
              </div>

              <form onSubmit={handleAccept} className="space-y-4">
                {invite.requiresSignup ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="First Name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First name"
                        required
                      />
                      <Input
                        label="Last Name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last name"
                      />
                    </div>

                    <Input
                      label="Choose a Password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      leftIcon={<Lock className="w-4 h-4" />}
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />

                    <Input
                      label="Confirm Password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      leftIcon={<Lock className="w-4 h-4" />}
                      autoComplete="new-password"
                      error={
                        confirmPassword && confirmPassword !== password
                          ? 'Passwords do not match'
                          : undefined
                      }
                      required
                    />
                  </>
                ) : (
                  <div className="flex items-start gap-2.5 text-xs bg-warm-input/40 border border-warm-border/60 p-3">
                    <UserCheck className="w-4 h-4 text-warm-accent shrink-0 mt-0.5" />
                    <p className="text-warm-textMuted">
                      You already have an InvoiceMaker account for this email. Accepting adds this
                      business to it - your existing password still works.
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 text-sm font-semibold"
                  isLoading={isSubmitting}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Accept Invitation
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  // `useSearchParams` needs a Suspense boundary during prerender.
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-warm-bg flex items-center justify-center">
          <p className="text-xs text-warm-textMuted">Loading invitation...</p>
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
