'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { Building2, Mail, Phone, Hash, FileText } from 'lucide-react';

export default function CompanyPage() {
  const { company, user } = useAuth();

  return (
    <DashboardLayout>
      <PageHeader
        title="Company Profile"
        description="Business address, GSTIN, PAN, bank details, and default invoice settings."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Company Profile' }
        ]}
      />

      <div className="max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Business Overview</CardTitle>
              <CardDescription>Primary organization information displayed on invoices</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-warm-input/60 rounded-xl space-y-1">
                <span className="text-warm-textMuted flex items-center gap-1.5 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-warm-accent" /> Business Name
                </span>
                <p className="text-sm font-bold text-warm-text">{company?.name || 'Not set'}</p>
              </div>

              <div className="p-3 bg-warm-input/60 rounded-xl space-y-1">
                <span className="text-warm-textMuted flex items-center gap-1.5 font-medium">
                  <Mail className="w-3.5 h-3.5 text-warm-accent" /> Primary Email
                </span>
                <p className="text-sm font-bold text-warm-text">{company?.email || user?.email}</p>
              </div>

              <div className="p-3 bg-warm-input/60 rounded-xl space-y-1">
                <span className="text-warm-textMuted flex items-center gap-1.5 font-medium">
                  <Phone className="w-3.5 h-3.5 text-warm-accent" /> Phone Number
                </span>
                <p className="text-sm font-bold text-warm-text">{company?.phone || 'Not specified'}</p>
              </div>

              <div className="p-3 bg-warm-input/60 rounded-xl space-y-1">
                <span className="text-warm-textMuted flex items-center gap-1.5 font-medium">
                  <Hash className="w-3.5 h-3.5 text-warm-accent" /> GSTIN Number
                </span>
                <p className="text-sm font-mono font-bold text-warm-text">{company?.gstin || 'Unregistered'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Invoice Numbering & Defaults</CardTitle>
              <CardDescription>Automatic invoice prefix and sequence tracking</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3.5 bg-warm-input/60 rounded-xl">
              <span className="font-semibold text-warm-textMuted flex items-center gap-2">
                <FileText className="w-4 h-4 text-warm-accent" /> Invoice Prefix
              </span>
              <span className="font-mono font-bold text-warm-accent text-sm">
                {company?.invoicePrefix || 'INV-'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3.5 bg-warm-input/60 rounded-xl">
              <span className="font-semibold text-warm-textMuted">Next Invoice Number</span>
              <span className="font-mono font-bold text-warm-text text-sm">
                {company?.nextInvoiceNumber || 1001}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
