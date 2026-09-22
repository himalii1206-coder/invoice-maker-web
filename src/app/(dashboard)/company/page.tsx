'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { StateCityFields } from '@/components/common/StateCityFields';
import { companyApi, CompanyProfile } from '@/lib/company';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import { apiErrorMessage } from '@/lib/customers';
import { normalizeStateName } from '@/lib/geo';
import {
  Building2,
  Mail,
  Phone,
  Hash,
  MapPin,
  Save,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Landmark
} from 'lucide-react';

export default function CompanyPage() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    gstin: '',
    pan: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branch: ''
  });

  useEffect(() => {
    let isCurrent = true;
    setLoading(true);

    companyApi
      .get()
      .then((data) => {
        if (!isCurrent) return;
        setForm({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          postalCode: data.postalCode || '',
          country: data.country || 'India',
          gstin: data.gstin || '',
          pan: data.pan || '',
          bankName: data.bankName || '',
          accountNumber: data.accountNumber || '',
          ifscCode: data.ifscCode || '',
          branch: data.branch || ''
        });
      })
      .catch((err) => {
        if (isCurrent) toast.error(apiErrorMessage(err, 'Failed to load business profile'));
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Business name is required');
      return;
    }

    setSaving(true);
    try {
      await companyApi.update(form);
      toast.success('Business profile updated successfully!');
      if (refreshUser) await refreshUser();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not save business profile'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="bg-warm-surface border border-warm-border/60 shadow-warm">
          <LoadingState message="Loading business settings & profile..." />
        </div>
      </DashboardLayout>
    );
  }

  const hasState = Boolean(form.state.trim());

  return (
    <DashboardLayout>
      <PageHeader
        title="Business Profile & GST Settings"
        description="Configure your business location, GSTIN, and seller state for automatic CGST/SGST vs IGST tax application."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Company Profile' }
        ]}
      />

      <form onSubmit={handleSave} className="max-w-4xl space-y-6">
        {/* State / GST Rule Banner */}
        <div
          className={`p-4 border flex items-start gap-3 transition-colors ${
            hasState
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}
        >
          {hasState ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="text-xs space-y-1">
            <p className="font-bold text-sm">
              {hasState
                ? `Active Business State: ${normalizeStateName(form.state)}`
                : 'Business State Not Configured'}
            </p>
            <p className="leading-relaxed opacity-90">
              {hasState
                ? `When you invoice a customer in ${normalizeStateName(
                    form.state
                  )}, Intra-State GST (CGST + SGST) will be applied. For customers in other states, Inter-State GST (IGST) will be applied automatically.`
                : 'Please select your State below. Your business state is required to automatically identify whether to apply CGST + SGST (Intra-State) or IGST (Inter-State) on tax invoices.'}
            </p>
          </div>
        </div>

        {/* 1. Basic Business Details */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Business Overview & Contact</CardTitle>
              <CardDescription>Primary organization information displayed on invoices and PDFs</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Business Name"
                required
                placeholder="Enter business or company name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                leftIcon={<Building2 className="w-4 h-4" />}
              />

              <Input
                label="Primary Business Email"
                type="email"
                placeholder="Enter billing email address"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                leftIcon={<Mail className="w-4 h-4" />}
              />

              <Input
                label="Phone Number"
                placeholder="Enter phone number"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                leftIcon={<Phone className="w-4 h-4" />}
              />

              <Input
                label="GSTIN Number"
                placeholder="Enter 15-digit GSTIN"
                value={form.gstin}
                maxLength={15}
                onChange={(e) => setForm((prev) => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
                leftIcon={<Hash className="w-4 h-4" />}
                helperText="15-character GST identification number"
              />
            </div>
          </CardContent>
        </Card>

        {/* 2. Business Location & State (Determines GST) */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Business Location & Tax Jurisdiction</CardTitle>
              <CardDescription>
                Your registered business address and home state for GST calculations
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              label="Business Address"
              placeholder="Enter building, street, plot number, industrial area"
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              className="min-h-[70px]"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StateCityFields
                stateValue={form.state}
                cityValue={form.city}
                pincodeValue={form.postalCode}
                onStateChange={(state) => setForm((prev) => ({ ...prev, state }))}
                onCityChange={(city) => setForm((prev) => ({ ...prev, city }))}
                onPincodeChange={(postalCode) => setForm((prev) => ({ ...prev, postalCode }))}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <Input
                label="PAN Number"
                placeholder="Enter 10-digit PAN"
                value={form.pan}
                maxLength={10}
                onChange={(e) => setForm((prev) => ({ ...prev, pan: e.target.value.toUpperCase() }))}
              />

              <Input
                label="Country"
                value={form.country}
                onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* 3. Bank & Payment Details */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Bank Details (Printed on Invoices)</CardTitle>
              <CardDescription>Default bank account information shown on tax invoice footers</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Bank Name"
                placeholder="Enter bank name"
                value={form.bankName}
                onChange={(e) => setForm((prev) => ({ ...prev, bankName: e.target.value }))}
                leftIcon={<Landmark className="w-4 h-4" />}
              />

              <Input
                label="Account Number"
                placeholder="Enter bank account number"
                value={form.accountNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, accountNumber: e.target.value }))}
                leftIcon={<CreditCard className="w-4 h-4" />}
              />

              <Input
                label="IFSC Code"
                placeholder="Enter IFSC code"
                value={form.ifscCode}
                maxLength={11}
                onChange={(e) => setForm((prev) => ({ ...prev, ifscCode: e.target.value.toUpperCase() }))}
              />

              <Input
                label="Branch"
                placeholder="Enter branch name"
                value={form.branch}
                onChange={(e) => setForm((prev) => ({ ...prev, branch: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            size="lg"
            isLoading={saving}
            leftIcon={<Save className="w-4 h-4" />}
            className="shadow-warm"
          >
            Save Business
          </Button>
        </div>
      </form>
    </DashboardLayout>
  );
}
