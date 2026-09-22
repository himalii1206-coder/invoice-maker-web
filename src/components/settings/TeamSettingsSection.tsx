'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/context/AuthContext';
import {
  teamApi,
  TeamMember,
  TeamResponse,
  AssignableRole,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS
} from '@/lib/team';
import { getApiErrorMessage } from '@/lib/api';
import { Users, UserPlus, Shield, Mail, Copy, Trash2, Check, Clock } from 'lucide-react';
import { toast } from 'react-toastify';

/**
 * Rows in the permission matrix. The server is the authority - this is a
 * readable restatement of `PERMISSIONS` in the API, shown so an owner can see
 * what a role actually grants before handing it out.
 */
const PERMISSION_ROWS: Array<{ label: string; roles: AssignableRole[] }> = [
  { label: 'Create & edit invoices', roles: ['ADMIN', 'ACCOUNTANT', 'STAFF'] },
  { label: 'Manage customers & products', roles: ['ADMIN', 'ACCOUNTANT', 'STAFF'] },
  { label: 'Record payments', roles: ['ADMIN', 'ACCOUNTANT'] },
  { label: 'Delete invoices', roles: ['ADMIN', 'ACCOUNTANT'] },
  { label: 'Purchases & vendor bills', roles: ['ADMIN', 'ACCOUNTANT'] },
  { label: 'Reports & analytics', roles: ['ADMIN', 'ACCOUNTANT'] },
  { label: 'Change business settings', roles: ['ADMIN'] },
  { label: 'Manage the team', roles: [] }
];

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  INVITED: 'bg-amber-50 text-amber-800 border-amber-200',
  SUSPENDED: 'bg-red-50 text-red-800 border-red-200'
};

export function TeamSettingsSection() {
  const { user } = useAuth();

  const [team, setTeam] = useState<TeamResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AssignableRole>('ACCOUNTANT');
  const [isInviting, setIsInviting] = useState(false);
  /** Kept on screen when SMTP is off, so the owner can share the link by hand. */
  const [pendingInviteUrl, setPendingInviteUrl] = useState<string | null>(null);

  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setTeam(await teamApi.list());
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Could not load your team'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const canManage = (team?.assignableRoles.length ?? 0) > 0;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    try {
      const result = await teamApi.invite({ email: inviteEmail.trim(), role: inviteRole });

      if (result.emailSent) {
        toast.success(`Invitation sent to ${result.member.email}`);
        setShowInviteModal(false);
      } else {
        // Nothing was emailed, so closing the modal would lose the only copy
        // of the link.
        setPendingInviteUrl(result.inviteUrl);
        toast.info('Email is not configured on this server. Copy the link and share it yourself.');
      }

      setInviteEmail('');
      await load();
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Could not send the invitation'));
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (member: TeamMember, role: AssignableRole) => {
    setUpdatingRoleId(member.id);
    try {
      await teamApi.updateRole(member.id, role);
      toast.success(`${member.email} is now ${ROLE_LABELS[role]}`);
      await load();
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Could not change that role'));
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleRemove = async () => {
    if (!memberToRemove) return;
    setIsRemoving(true);
    try {
      await teamApi.remove(memberToRemove.id);
      toast.success(`${memberToRemove.email} no longer has access`);
      setMemberToRemove(null);
      await load();
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Could not remove that team member'));
    } finally {
      setIsRemoving(false);
    }
  };

  const copyInviteUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Invitation link copied');
    } catch {
      toast.error('Your browser blocked the copy. Select the link and copy it manually.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Team Members List */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-warm-accentLight text-warm-accent">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                Team Members &amp; Collaborators
              </h3>
              <p className="text-xs text-warm-textMuted">
                Invite accountants and billing staff, and control what each of them can do
              </p>
            </div>
          </div>

          {canManage && (
            <Button
              size="sm"
              onClick={() => {
                setPendingInviteUrl(null);
                setShowInviteModal(true);
              }}
              leftIcon={<UserPlus className="w-3.5 h-3.5" />}
            >
              Invite Member
            </Button>
          )}
        </div>

        <CardContent className="p-5">
          {isLoading ? (
            <p className="text-xs text-warm-textMuted py-4 text-center">Loading team...</p>
          ) : (
            <div className="space-y-2.5">
              {(team?.members ?? []).map((member) => {
                const isSelf = member.userId === user?.id;

                return (
                  <div
                    key={member.id}
                    className="p-3.5 bg-warm-input/40 border border-warm-border/60 flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-warm-text truncate">
                          {member.name}
                        </span>
                        {isSelf && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-warm-accentLight text-warm-accent border border-warm-accent/30">
                            You
                          </span>
                        )}
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                            STATUS_STYLES[member.status] ?? STATUS_STYLES.INVITED
                          }`}
                        >
                          {member.status === 'ACTIVE' ? (
                            <Check className="w-2.5 h-2.5 inline mr-0.5" />
                          ) : (
                            <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                          )}
                          {member.status.toLowerCase()}
                        </span>
                      </div>
                      <span className="text-[11px] text-warm-textMuted truncate block">
                        {member.email}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {member.isOwner || !canManage ? (
                        <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-warm-surface border border-warm-border text-warm-text">
                          {ROLE_LABELS[member.role]}
                        </span>
                      ) : (
                        <>
                          <Select
                            value={member.role}
                            options={(team?.assignableRoles ?? []).map((role) => ({
                              value: role,
                              label: ROLE_LABELS[role]
                            }))}
                            onChange={(e) =>
                              handleRoleChange(member, e.target.value as AssignableRole)
                            }
                            disabled={updatingRoleId === member.id}
                            containerClassName="w-40"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setMemberToRemove(member)}
                            aria-label={`Remove ${member.email}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {!canManage && (
                <p className="text-[11px] text-warm-textMuted pt-1">
                  Only the business owner can invite people or change roles.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Permission Matrix */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex items-center gap-2.5">
          <div className="p-1.5 bg-warm-accentLight text-warm-accent">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
              Role Permission Matrix
            </h3>
            <p className="text-xs text-warm-textMuted">
              Enforced by the server, not just hidden in the interface
            </p>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-warm-border/50 bg-warm-input/40">
                  <th className="text-left p-3 font-bold text-warm-text uppercase tracking-wider text-[10px]">
                    Capability
                  </th>
                  {(['ADMIN', 'ACCOUNTANT', 'STAFF'] as AssignableRole[]).map((role) => (
                    <th
                      key={role}
                      className="p-3 font-bold text-warm-text uppercase tracking-wider text-[10px] text-center"
                    >
                      {ROLE_LABELS[role]}
                    </th>
                  ))}
                  <th className="p-3 font-bold text-warm-text uppercase tracking-wider text-[10px] text-center">
                    Owner
                  </th>
                </tr>
              </thead>
              <tbody>
                {PERMISSION_ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-warm-border/30 last:border-0">
                    <td className="p-3 text-warm-text">{row.label}</td>
                    {(['ADMIN', 'ACCOUNTANT', 'STAFF'] as AssignableRole[]).map((role) => (
                      <td key={role} className="p-3 text-center">
                        {row.roles.includes(role) ? (
                          <Check className="w-3.5 h-3.5 text-emerald-700 inline" />
                        ) : (
                          <span className="text-warm-textSubtle">-</span>
                        )}
                      </td>
                    ))}
                    <td className="p-3 text-center">
                      <Check className="w-3.5 h-3.5 text-emerald-700 inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Invite modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          setPendingInviteUrl(null);
        }}
        title="Invite a Team Member"
      >
        {pendingInviteUrl ? (
          <div className="space-y-4">
            <p className="text-xs text-warm-textMuted">
              The invitation was created but not emailed. Send this link to the person yourself - it
              expires in 7 days and works once.
            </p>

            <div className="p-3 bg-warm-input/40 border border-warm-border/60 break-all">
              <code className="text-[11px] font-mono text-warm-text">{pendingInviteUrl}</code>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                leftIcon={<Copy className="w-4 h-4" />}
                onClick={() => copyInviteUrl(pendingInviteUrl)}
              >
                Copy Link
              </Button>
              <Button
                onClick={() => {
                  setPendingInviteUrl(null);
                  setShowInviteModal(false);
                }}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="accountant@business.com"
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <Select
              label="Role"
              value={inviteRole}
              options={(team?.assignableRoles ?? []).map((role) => ({
                value: role,
                label: ROLE_LABELS[role]
              }))}
              onChange={(e) => setInviteRole(e.target.value as AssignableRole)}
              helperText={ROLE_DESCRIPTIONS[inviteRole]}
            />

            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="ghost" onClick={() => setShowInviteModal(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isInviting}>
                Send Invitation
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(memberToRemove)}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleRemove}
        title="Remove team member"
        message={`${memberToRemove?.email} will immediately lose access to this business. Their own account is not deleted.`}
        confirmLabel="Remove access"
        isDanger
        isLoading={isRemoving}
      />
    </div>
  );
}
