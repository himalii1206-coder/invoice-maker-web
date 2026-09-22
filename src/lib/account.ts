import { api } from './api';
import { ApiResponse } from '@/types/index';

/** Account-level security: password, device sessions and two-factor auth. */

export interface DeviceSession {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  device: string;
  isCurrent: boolean;
  lastUsedAt: string;
  createdAt: string;
  expiresAt: string;
}

export interface TwoFactorStatus {
  enabled: boolean;
  confirmedAt: string | null;
  recoveryCodesRemaining: number;
}

export interface TwoFactorSetup {
  secret: string;
  /** otpauth:// URI to render as a QR code. */
  otpauthUrl: string;
}

export const accountApi = {
  async changePassword(payload: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ revokedSessions: number }> {
    const { data } = await api.post<ApiResponse<{ revokedSessions: number }>>(
      '/auth/change-password',
      payload
    );
    return data.data ?? { revokedSessions: 0 };
  },

  async listSessions(): Promise<DeviceSession[]> {
    const { data } = await api.get<ApiResponse<DeviceSession[]>>('/auth/sessions');
    return data.data ?? [];
  },

  async revokeSession(id: string): Promise<void> {
    await api.delete(`/auth/sessions/${id}`);
  },

  async revokeOtherSessions(): Promise<{ revokedSessions: number }> {
    const { data } = await api.delete<ApiResponse<{ revokedSessions: number }>>(
      '/auth/sessions/others'
    );
    return data.data ?? { revokedSessions: 0 };
  },

  async twoFactorStatus(): Promise<TwoFactorStatus> {
    const { data } = await api.get<ApiResponse<TwoFactorStatus>>('/auth/2fa');
    return data.data as TwoFactorStatus;
  },

  async beginTwoFactorSetup(): Promise<TwoFactorSetup> {
    const { data } = await api.post<ApiResponse<TwoFactorSetup>>('/auth/2fa/setup');
    return data.data as TwoFactorSetup;
  },

  async enableTwoFactor(code: string): Promise<{ recoveryCodes: string[] }> {
    const { data } = await api.post<ApiResponse<{ recoveryCodes: string[] }>>('/auth/2fa/enable', {
      code
    });
    return data.data as { recoveryCodes: string[] };
  },

  async disableTwoFactor(password: string): Promise<void> {
    await api.post('/auth/2fa/disable', { password });
  },

  async regenerateRecoveryCodes(password: string): Promise<{ recoveryCodes: string[] }> {
    const { data } = await api.post<ApiResponse<{ recoveryCodes: string[] }>>(
      '/auth/2fa/recovery-codes',
      { password }
    );
    return data.data as { recoveryCodes: string[] };
  }
};
