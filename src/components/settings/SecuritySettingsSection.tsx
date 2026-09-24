'use client';

import React, { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/context/AuthContext';
import { accountApi, DeviceSession, TwoFactorStatus, TwoFactorSetup } from '@/lib/account';
import { getApiErrorMessage } from '@/lib/api';
import {
  KeyRound,
  Smartphone,
  LogOut,
  Laptop,
  CheckCircle2,
  Clock,
  Copy,
  ShieldCheck,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-toastify';

const formatWhen = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

export function SecuritySettingsSection() {
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const [twoFactor, setTwoFactor] = useState<TwoFactorStatus | null>(null);
  const [setupData, setSetupData] = useState<TwoFactorSetup | null>(null);
  /**
   * The QR image is generated in the browser. The otpauth URI contains the TOTP
   * secret, so it must never be handed to a third-party image service.
   */
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const [isBusy2fa, setIsBusy2fa] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  const [disableModalOpen, setDisableModalOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [regenerateModalOpen, setRegenerateModalOpen] = useState(false);
  const [regeneratePassword, setRegeneratePassword] = useState('');
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [confirmRevokeOthers, setConfirmRevokeOthers] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      setIsLoadingSessions(true);
      setSessions(await accountApi.listSessions());
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Could not load your active sessions'));
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  const loadTwoFactor = useCallback(async () => {
    try {
      setTwoFactor(await accountApi.twoFactorStatus());
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Could not load two-factor status'));
    }
  }, []);

  useEffect(() => {
    loadSessions();
    loadTwoFactor();
  }, [loadSessions, loadTwoFactor]);

  useEffect(() => {
    if (!setupData) {
      setQrDataUrl(null);
      return;
    }

    let cancelled = false;
    QRCode.toDataURL(setupData.otpauthUrl, { width: 220, margin: 1 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        // The setup key is shown as text beside this, so enrolment still works.
        if (!cancelled) setQrDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [setupData]);

  // ---------------------------------------------------------------------------
  // Password
  // ---------------------------------------------------------------------------

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      const result = await accountApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success(
        result.revokedSessions > 0
          ? `Password changed. ${result.revokedSessions} other session(s) were signed out.`
          : 'Password changed successfully'
      );
      // Keep only the current active session in state
      setSessions((prev) => prev.filter((s) => s.isCurrent));
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Could not change your password'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Sessions
  // ---------------------------------------------------------------------------

  const handleRevokeSession = async () => {
    if (!confirmRevokeId) return;
    const targetId = confirmRevokeId;
    setRevokingId(targetId);
    try {
      await accountApi.revokeSession(targetId);
      toast.success('That device has been signed out');
      setSessions((prev) => prev.filter((s) => s.id !== targetId));
      setConfirmRevokeId(null);
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Could not sign that device out'));
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeOthers = async () => {
    setRevokingId('others');
    try {
      const result = await accountApi.revokeOtherSessions();
      toast.success(
        result.revokedSessions > 0
          ? `${result.revokedSessions} other session(s) signed out`
          : 'There were no other active sessions'
      );
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      setConfirmRevokeOthers(false);
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Could not sign the other devices out'));
    } finally {
      setRevokingId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Two-factor
  // ---------------------------------------------------------------------------

  const handleBeginSetup = async () => {
    setIsBusy2fa(true);
    try {
      setSetupData(await accountApi.beginTwoFactorSetup());
      setSetupCode('');
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Could not start two-factor setup'));
    } finally {
      setIsBusy2fa(false);
    }
  };

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBusy2fa(true);
    try {
      const result = await accountApi.enableTwoFactor(setupCode);
      setRecoveryCodes(result.recoveryCodes);
      setSetupData(null);
      setSetupCode('');
      await loadTwoFactor();
      toast.success('Two-factor authentication is now active');
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'That code was not accepted'));
    } finally {
      setIsBusy2fa(false);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBusy2fa(true);
    try {
      await accountApi.disableTwoFactor(disablePassword);
      setDisableModalOpen(false);
      setDisablePassword('');
      await loadTwoFactor();
      toast.success('Two-factor authentication disabled');
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Could not disable two-factor authentication'));
    } finally {
      setIsBusy2fa(false);
    }
  };

  const handleRegenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBusy2fa(true);
    try {
      const result = await accountApi.regenerateRecoveryCodes(regeneratePassword);
      setRecoveryCodes(result.recoveryCodes);
      setRegenerateModalOpen(false);
      setRegeneratePassword('');
      await loadTwoFactor();
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Could not generate new recovery codes'));
    } finally {
      setIsBusy2fa(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error('Your browser blocked the copy. Select the text and copy it manually.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Change Password */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex items-center gap-2.5">
          <div className="p-1.5 bg-warm-accentLight text-warm-accent">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
              Change Account Password
            </h3>
            <p className="text-xs text-warm-textMuted">
              Changing your password signs out every other device
            </p>
          </div>
        </div>

        <CardContent className="p-5">
          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              autoComplete="current-password"
              required
            />

            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
              required
            />

            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter the new password"
              autoComplete="new-password"
              error={
                confirmPassword && confirmPassword !== newPassword
                  ? 'Passwords do not match'
                  : undefined
              }
              required
            />

            <Button type="submit" isLoading={isChangingPassword} leftIcon={<KeyRound className="w-4 h-4" />}>
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 2. Two-Factor Authentication */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-warm-accentLight text-warm-accent">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                Two-Factor Authentication
              </h3>
              <p className="text-xs text-warm-textMuted">
                A 6-digit code from your authenticator app, on top of your password
              </p>
            </div>
          </div>

          <span
            className={`px-3 py-1 text-xs font-bold uppercase tracking-wider border ${
              twoFactor?.enabled
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-warm-input text-warm-textMuted border-warm-border'
            }`}
          >
            {twoFactor?.enabled ? 'Active' : 'Not enabled'}
          </span>
        </div>

        <CardContent className="p-5 space-y-4">
          {twoFactor?.enabled ? (
            <>
              <div className="flex items-start gap-2 text-xs text-warm-text bg-emerald-50 border border-emerald-200 p-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">
                    Protected since {twoFactor.confirmedAt ? formatWhen(twoFactor.confirmedAt) : '-'}
                  </p>
                  <p className="text-warm-textMuted mt-0.5">
                    {twoFactor.recoveryCodesRemaining} recovery code(s) remaining. Each one works
                    once if you lose your phone.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRegenerateModalOpen(true)}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Regenerate Recovery Codes
                </Button>
                <Button variant="danger" size="sm" onClick={() => setDisableModalOpen(true)}>
                  Disable Two-Factor
                </Button>
              </div>
            </>
          ) : setupData ? (
            <form onSubmit={handleEnable} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="shrink-0">
                  {qrDataUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={qrDataUrl}
                      alt="Two-factor QR code"
                      width={180}
                      height={180}
                      className="border border-warm-border bg-white p-2"
                    />
                  ) : (
                    <div className="w-[180px] h-[180px] border border-warm-border bg-warm-input/40 flex items-center justify-center text-[11px] text-warm-textMuted text-center p-3">
                      Enter the setup key manually
                    </div>
                  )}
                </div>

                <div className="space-y-3 min-w-0 flex-1">
                  <p className="text-xs text-warm-text">
                    Scan this with Google Authenticator, Authy or 1Password, then enter the 6-digit
                    code it shows.
                  </p>

                  <div className="p-3 bg-warm-input/40 border border-warm-border/60 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-warm-textSubtle block">
                      Or enter this key manually
                    </span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-warm-text break-all">
                        {setupData.secret}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(setupData.secret, 'Setup key')}
                        className="text-warm-textMuted hover:text-warm-accent shrink-0"
                        aria-label="Copy setup key"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <Input
                    label="Verification Code"
                    value={setupCode}
                    onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" isLoading={isBusy2fa} disabled={setupCode.length !== 6}>
                  Verify &amp; Activate
                </Button>
                <Button type="button" variant="ghost" onClick={() => setSetupData(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-warm-textMuted">
                Without a second factor, your password alone protects every invoice and customer
                record in this business.
              </p>
              <Button
                onClick={handleBeginSetup}
                isLoading={isBusy2fa}
                leftIcon={<ShieldCheck className="w-4 h-4" />}
              >
                Set Up Two-Factor Authentication
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Active Sessions */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-warm-accentLight text-warm-accent">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                Signed-In Devices
              </h3>
              <p className="text-xs text-warm-textMuted">
                Every browser currently holding a session for {user?.email}
              </p>
            </div>
          </div>

          {sessions.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmRevokeOthers(true)}
              isLoading={revokingId === 'others'}
              leftIcon={<LogOut className="w-3.5 h-3.5" />}
            >
              Sign Out Everywhere Else
            </Button>
          )}
        </div>

        <CardContent className="p-5">
          {isLoadingSessions ? (
            <p className="text-xs text-warm-textMuted py-4 text-center">Loading sessions...</p>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-warm-textMuted py-4 text-center">
              No active sessions found.
            </p>
          ) : (
            <div className="space-y-2.5">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="p-3.5 bg-warm-input/40 border border-warm-border/60 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-warm-text">{session.device}</span>
                      {session.isCurrent && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                          This device
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3 h-3 text-warm-textMuted" />
                      <span className="text-[11px] text-warm-textMuted truncate">
                        Last used {formatWhen(session.lastUsedAt)}
                        {session.ipAddress ? ` · ${session.ipAddress}` : ''}
                      </span>
                    </div>
                  </div>

                  {!session.isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmRevokeId(session.id)}
                      isLoading={revokingId === session.id}
                    >
                      Sign out
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recovery codes - shown once, right after they are generated */}
      <Modal
        isOpen={Boolean(recoveryCodes)}
        onClose={() => setRecoveryCodes(null)}
        title="Save Your Recovery Codes"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-900 p-3">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              This is the only time these codes are shown. Store them somewhere safe - each one
              signs you in once if you lose access to your authenticator app.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 p-4 bg-warm-input/40 border border-warm-border/60">
            {(recoveryCodes ?? []).map((code) => (
              <code key={code} className="text-xs font-mono text-warm-text">
                {code}
              </code>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              leftIcon={<Copy className="w-4 h-4" />}
              onClick={() => copyToClipboard((recoveryCodes ?? []).join('\n'), 'Recovery codes')}
            >
              Copy All
            </Button>
            <Button onClick={() => setRecoveryCodes(null)}>I have saved them</Button>
          </div>
        </div>
      </Modal>

      {/* Disabling 2FA lowers account security, so it asks for the password */}
      <Modal
        isOpen={disableModalOpen}
        onClose={() => setDisableModalOpen(false)}
        title="Disable Two-Factor Authentication"
      >
        <form onSubmit={handleDisable} className="space-y-4">
          <p className="text-xs text-warm-textMuted">
            Your account will be protected by its password alone. Confirm with your password to
            continue.
          </p>

          <Input
            label="Password"
            type="password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setDisableModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" isLoading={isBusy2fa}>
              Disable
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={regenerateModalOpen}
        onClose={() => setRegenerateModalOpen(false)}
        title="Regenerate Recovery Codes"
      >
        <form onSubmit={handleRegenerate} className="space-y-4">
          <p className="text-xs text-warm-textMuted">
            Your existing recovery codes stop working immediately. Confirm with your password to
            generate a fresh set.
          </p>

          <Input
            label="Password"
            type="password"
            value={regeneratePassword}
            onChange={(e) => setRegeneratePassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setRegenerateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isBusy2fa}>
              Generate New Codes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Revoke other sessions confirmation */}
      <ConfirmDialog
        isOpen={confirmRevokeOthers}
        onClose={() => setConfirmRevokeOthers(false)}
        onConfirm={handleRevokeOthers}
        title="Sign out everywhere else?"
        message="All other active device sessions for your account will be immediately revoked."
        confirmLabel="Sign Out Others"
        isDanger
        isLoading={revokingId === 'others'}
      />

      {/* Revoke single session confirmation */}
      <ConfirmDialog
        isOpen={Boolean(confirmRevokeId)}
        onClose={() => setConfirmRevokeId(null)}
        onConfirm={handleRevokeSession}
        title="Sign out this device?"
        message="This session will be invalidated and that device will need to sign in again."
        confirmLabel="Sign Out Device"
        isDanger
        isLoading={Boolean(revokingId && revokingId === confirmRevokeId)}
      />
    </div>
  );
}
