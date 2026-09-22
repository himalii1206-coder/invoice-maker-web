import { api } from './api';
import { ApiResponse } from '@/types/index';

export type TeamRole = 'OWNER' | 'ADMIN' | 'ACCOUNTANT' | 'STAFF' | 'MEMBER';
export type MemberStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED';

/** Roles that can actually be handed out; OWNER is never assignable. */
export type AssignableRole = Extract<TeamRole, 'ADMIN' | 'ACCOUNTANT' | 'STAFF'>;

export interface TeamMember {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  role: TeamRole;
  status: MemberStatus;
  isOwner: boolean;
  invitedAt: string | null;
  acceptedAt: string | null;
}

export interface TeamResponse {
  members: TeamMember[];
  assignableRoles: AssignableRole[];
  /** The server's own rules, mirrored so the UI can explain them accurately. */
  permissionMatrix: Record<string, TeamRole>;
}

export interface InviteResult {
  member: TeamMember;
  /** Shown so the inviter can share it by hand when SMTP is not configured. */
  inviteUrl: string;
  emailSent: boolean;
}

export interface InviteDetails {
  email: string;
  role: TeamRole;
  businessName: string;
  /** True when the invitee has no account yet and must choose a password. */
  requiresSignup: boolean;
}

export const ROLE_LABELS: Record<TeamRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  ACCOUNTANT: 'Accountant',
  STAFF: 'Staff',
  MEMBER: 'Staff'
};

export const ROLE_DESCRIPTIONS: Record<AssignableRole, string> = {
  ADMIN: 'Everything except managing the team and transferring ownership',
  ACCOUNTANT: 'Invoices, payments, purchases and reports',
  STAFF: 'Create and view invoices, customers and products'
};

export const teamApi = {
  async list(): Promise<TeamResponse> {
    const { data } = await api.get<ApiResponse<TeamResponse>>('/team');
    return data.data as TeamResponse;
  },

  async invite(payload: { email: string; role: AssignableRole }): Promise<InviteResult> {
    const { data } = await api.post<ApiResponse<InviteResult>>('/team/invites', payload);
    return data.data as InviteResult;
  },

  async updateRole(memberId: string, role: AssignableRole): Promise<TeamMember> {
    const { data } = await api.patch<ApiResponse<TeamMember>>(`/team/${memberId}/role`, { role });
    return data.data as TeamMember;
  },

  async remove(memberId: string): Promise<void> {
    await api.delete(`/team/${memberId}`);
  },

  // The two invitation endpoints are public: the token in the link is the
  // credential, and the invitee may not have an account yet.
  async describeInvite(token: string): Promise<InviteDetails> {
    const { data } = await api.get<ApiResponse<InviteDetails>>(`/team/invites/${token}`);
    return data.data as InviteDetails;
  },

  async acceptInvite(payload: {
    token: string;
    firstName?: string;
    lastName?: string;
    password?: string;
  }): Promise<{ accessToken: string; refreshToken: string; user: any; company: any }> {
    const { data } = await api.post<ApiResponse<any>>('/team/invites/accept', payload);
    return data.data;
  }
};
