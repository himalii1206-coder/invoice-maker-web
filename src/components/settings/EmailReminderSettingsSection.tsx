'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { InvoiceSettings, InvoiceSettingsPayload } from '@/types/invoice';
import { CompanyProfile } from '@/lib/company';
import { Mail, Save, Clock, Bell, Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { getApiErrorMessage } from '@/lib/api';

interface EmailReminderSettingsSectionProps {
  settings: InvoiceSettings;
  company: CompanyProfile;
  emailConfigured: boolean;
  onSave: (payload: InvoiceSettingsPayload) => Promise<void>;
  isSaving: boolean;
  canEdit: boolean;
}

export function EmailReminderSettingsSection({
  settings,
  company,
  emailConfigured,
  onSave,
  isSaving,
  canEdit
}: EmailReminderSettingsSectionProps) {
  const [remindersEnabled, setRemindersEnabled] = useState(settings.remindersEnabled ?? true);
  const [remindBeforeDays, setRemindBeforeDays] = useState(
    Array.isArray(settings.remindBeforeDays) && settings.remindBeforeDays.length > 0
      ? settings.remindBeforeDays[0]
      : 3
  );
  const [remindAfterDays, setRemindAfterDays] = useState(
    Array.isArray(settings.remindAfterDays) && settings.remindAfterDays.length > 0
      ? settings.remindAfterDays[0]
      : 7
  );
  const [reminderSubject, setReminderSubject] = useState(
    settings.reminderSubject || 'Payment Reminder: Invoice #{{invoice_number}} is due'
  );
  const [reminderBody, setReminderBody] = useState(
    settings.reminderBody ||
      'Dear {{customer_name}},\n\nThis is a friendly reminder that invoice {{invoice_number}} for {{grand_total}} is due on {{due_date}}.\n\nPlease find the payment details attached for settlement.\n\nWarm regards,\n{{company_name}}'
  );
  const [reminderCcEmails, setReminderCcEmails] = useState(settings.reminderCcEmails || '');
  const [remindOnDueDate, setRemindOnDueDate] = useState(settings.remindOnDueDate ?? true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSave({
        remindersEnabled,
        remindBeforeDays: [remindBeforeDays],
        remindOnDueDate,
        remindAfterDays: [remindAfterDays],
        reminderCcEmails: reminderCcEmails.trim() || null,
        reminderSubject: reminderSubject.trim() || null,
        reminderBody: reminderBody.trim() || null
      });
      toast.success('Email & Reminder automation settings saved');
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to update email settings'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Sender Profile */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex items-center gap-2.5">
          <div className="p-1.5 bg-warm-accentLight text-warm-accent">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
              Email Dispatch &amp; Sender Profile
            </h3>
            <p className="text-xs text-warm-textMuted">
              Configure outgoing email identity for customer invoices and receipts
            </p>
          </div>
        </div>

        <CardContent className="p-5 space-y-4">
          {/*
            The sender identity is not a separate setting: outgoing mail is sent
            as the business and replies go to its address. Showing them
            read-only keeps this screen honest about where they come from.
          */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <span className="block text-xs font-semibold uppercase tracking-wider text-warm-textMuted">
                Sender Display Name
              </span>
              <div className="h-10 px-3 flex items-center bg-warm-input/60 border border-warm-border text-xs text-warm-text">
                <span className="truncate">{company.name}</span>
              </div>
              <p className="text-[11px] text-warm-textMuted">
                Taken from your business name. Change it under Company Profile.
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-semibold uppercase tracking-wider text-warm-textMuted">
                Reply-To Email Address
              </span>
              <div className="h-10 px-3 flex items-center bg-warm-input/60 border border-warm-border text-xs text-warm-text">
                <span className="truncate">
                  {company.email || 'No business email set'}
                </span>
              </div>
              <p className="text-[11px] text-warm-textMuted">
                Customer replies go here. Change it under Company Profile.
              </p>
            </div>
          </div>

          <Input
            label="Always CC These Addresses"
            value={reminderCcEmails}
            onChange={(e) => setReminderCcEmails(e.target.value)}
            placeholder="accounts@business.com, owner@business.com"
            disabled={!canEdit}
            helperText="Comma separated. Copied on every reminder that goes out."
          />

          {!emailConfigured && (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 p-2.5">
              SMTP credentials are not configured on this server, so nothing can be sent yet. These
              settings are saved and will take effect once email is set up.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 2. Automated Payment Reminder Schedules */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-warm-accentLight text-warm-accent">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                Automated Payment Reminders
              </h3>
              <p className="text-xs text-warm-textMuted">
                Automatically notify customers of upcoming and past-due invoices
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-5 space-y-4">
          <label className="p-3.5 bg-warm-input/40 border border-warm-border/60 flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-xs font-bold text-warm-text block">
                Enable Automated Payment Reminders
              </span>
              <span className="text-[11px] text-warm-textMuted">
                Dispatches scheduled emails to debtors with payment links
              </span>
            </div>
            <input
              type="checkbox"
              checked={remindersEnabled}
              onChange={(e) => setRemindersEnabled(e.target.checked)}
              disabled={!canEdit}
              className="w-4 h-4 rounded-none border-warm-border text-warm-accent focus:ring-warm-accent"
            />
          </label>

          {remindersEnabled && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <Input
                  label="First Reminder (Days before due date)"
                  type="number"
                  min={1}
                  max={30}
                  value={remindBeforeDays}
                  onChange={(e) => setRemindBeforeDays(parseInt(e.target.value) || 3)}
                  placeholder="Enter days before due date"
                  disabled={!canEdit}
                  helperText="Sent as a polite heads-up before the invoice deadline"
                />

                <Input
                  label="Second Reminder (Days after overdue)"
                  type="number"
                  min={1}
                  max={60}
                  value={remindAfterDays}
                  onChange={(e) => setRemindAfterDays(parseInt(e.target.value) || 7)}
                  placeholder="Enter days after overdue"
                  disabled={!canEdit}
                  helperText="Sent if payment is not received after due date"
                />
              </div>

              <label className="p-3.5 bg-warm-input/40 border border-warm-border/60 flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-warm-text block">
                    Also Remind On The Due Date
                  </span>
                  <span className="text-[11px] text-warm-textMuted">
                    An extra reminder on the day payment falls due
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={remindOnDueDate}
                  onChange={(e) => setRemindOnDueDate(e.target.checked)}
                  disabled={!canEdit}
                  className="w-4 h-4 rounded-none border-warm-border text-warm-accent focus:ring-warm-accent"
                />
              </label>
            </>
          )}
        </CardContent>
      </Card>

      {/* 3. Email Templates */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex items-center gap-2.5">
          <div className="p-1.5 bg-warm-accentLight text-warm-accent">
            <Send className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
            Email Notification Templates
          </h3>
        </div>

        <CardContent className="p-5 space-y-4">
          <Input
            label="Payment Reminder Subject Line"
            value={reminderSubject}
            onChange={(e) => setReminderSubject(e.target.value)}
            placeholder="Enter reminder email subject"
            disabled={!canEdit}
            maxLength={200}
          />

          <Textarea
            label="Payment Reminder Body Template"
            value={reminderBody}
            onChange={(e) => setReminderBody(e.target.value)}
            placeholder="Enter payment reminder template text"
            rows={5}
            disabled={!canEdit}
            maxLength={2000}
          />

          <p className="text-[11px] text-warm-textMuted">
            Placeholders: {'{{customer_name}}'}, {'{{invoice_number}}'}, {'{{grand_total}}'},{' '}
            {'{{due_date}}'}, {'{{company_name}}'}
          </p>
        </CardContent>
      </Card>

      {canEdit && (
        <div className="flex justify-end pt-2">
          <Button type="submit" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
            Save Email Settings
          </Button>
        </div>
      )}
    </form>
  );
}
