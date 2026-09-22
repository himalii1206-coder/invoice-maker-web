import { api } from './api';
import { ApiResponse } from '@/types/index';

export interface CompanyProfile {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  gstin?: string | null;
  pan?: string | null;
  logoUrl?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  branch?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UpdateCompanyPayload = Partial<
  Omit<CompanyProfile, 'id' | 'createdAt' | 'updatedAt' | 'logoUrl'>
>;

export const companyApi = {
  async get(): Promise<CompanyProfile> {
    const { data } = await api.get<ApiResponse<CompanyProfile>>('/company');
    return data.data as CompanyProfile;
  },

  async update(payload: UpdateCompanyPayload): Promise<CompanyProfile> {
    const { data } = await api.put<ApiResponse<CompanyProfile>>('/company', payload);
    return data.data as CompanyProfile;
  }
};
