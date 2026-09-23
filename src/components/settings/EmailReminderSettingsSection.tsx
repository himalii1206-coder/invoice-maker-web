'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { InvoiceSettings, InvoiceSettingsPayload } from '@/types/invoice';
import { CompanyProfile } from '@/lib/company';
import { Mail, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

interface EmailReminderSettingsSectionProps {
  settings: InvoiceSettings;
  company: CompanyProfile;
  emailConfigured: boolean;
  onSave: (payload: InvoiceSettingsPayload) => Promise<void>;
  isSaving: boolean;
  canEdit: boolean;
}

export function EmailReminderSettingsSection({
  settings: _settings,
  company,
  emailConfigured
}: EmailReminderSettingsSectionProps) {
  return (
    <div className="space-y-6">
      {/* 1. Sender Profile & Dispatch */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-warm-accentLight text-warm-accent">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                Email Dispatch &amp; Sender Profile
              </h3>
              <p className="text-xs text-warm-textMuted">
                Outgoing email identity used when sending invoices, receipts, and credit notes
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold ${
              emailConfigured
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            {emailConfigured ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                SMTP Active
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                SMTP Not Configured
              </>
            )}
          </span>
        </div>

        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <span className="block text-xs font-semibold uppercase tracking-wider text-warm-textMuted">
                Sender Display Name
              </span>
              <div className="h-10 px-3 flex items-center bg-warm-input/60 border border-warm-border text-xs text-warm-text font-medium">
                <span className="truncate">{company.name}</span>
              </div>
              <p className="text-[11px] text-warm-textMuted">
                Shown to customers as the sender. Update under Company Profile.
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-semibold uppercase tracking-wider text-warm-textMuted">
                Reply-To Email Address
              </span>
              <div className="h-10 px-3 flex items-center bg-warm-input/60 border border-warm-border text-xs text-warm-text font-medium">
                <span className="truncate">{company.email || 'No business email set'}</span>
              </div>
              <p className="text-[11px] text-warm-textMuted">
                Customer replies are delivered directly to this address.
              </p>
            </div>
          </div>

          {!emailConfigured ? (
            <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">SMTP Email Server Not Configured</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  To send invoices and PDF attachments via email, add your SMTP credentials to your backend environment configuration.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/80 flex items-start gap-2.5 text-xs text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Ready for Email Dispatch</p>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Your server is configured to deliver invoices with attached GST-compliant PDF documents directly from the invoice actions menu.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
