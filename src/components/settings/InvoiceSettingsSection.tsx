'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { InvoiceSettings, InvoiceSettingsPayload } from '@/types/invoice';
import {
  FileText,
  Save,
  CheckCircle2,
  Hash,
  Calendar,
  Layers
} from 'lucide-react';
import { toast } from 'react-toastify';
import { getApiErrorMessage } from '@/lib/api';

interface InvoiceSettingsSectionProps {
  settings: InvoiceSettings;
  onSave: (payload: InvoiceSettingsPayload) => Promise<void>;
  isSaving: boolean;
  canEdit: boolean;
}

const CURRENCY_OPTIONS = [
  { value: 'INR', label: 'INR (₹) - Indian Rupee' },
  { value: 'USD', label: 'USD ($) - US Dollar' },
  { value: 'EUR', label: 'EUR (€) - Euro' },
  { value: 'GBP', label: 'GBP (£) - British Pound' },
  { value: 'AED', label: 'AED (د.إ) - UAE Dirham' },
  { value: 'SGD', label: 'SGD ($) - Singapore Dollar' }
];

const SEPARATOR_OPTIONS = [
  { value: '-', label: 'Hyphen ( - )' },
  { value: '/', label: 'Slash ( / )' },
  { value: '_', label: 'Underscore ( _ )' },
  { value: '', label: 'None' }
];

export function InvoiceSettingsSection({
  settings,
  onSave,
  isSaving,
  canEdit
}: InvoiceSettingsSectionProps) {
  const [form, setForm] = useState({
    invoicePrefix: settings.invoicePrefix || 'INV',
    invoiceSuffix: settings.invoiceSuffix || '',
    numberSeparator: settings.numberSeparator ?? '-',
    startNumber: settings.startNumber ?? 1001,
    includeYearInNumber: settings.includeYearInNumber ?? true,
    defaultDueDays: settings.defaultDueDays ?? 15,
    defaultCurrency: settings.defaultCurrency || 'INR',
    defaultTerms: settings.defaultTerms || '',
    defaultNotes: settings.defaultNotes || '',
    footerNote: settings.footerNote || '',
    showHsnColumn: settings.showHsnColumn ?? true,
    showDiscount: settings.showDiscount ?? true,
    showBankDetails: settings.showBankDetails ?? true,
    showSignature: settings.showSignature ?? true,
    enableRoundOff: settings.enableRoundOff ?? true,
    autoMarkOverdue: settings.autoMarkOverdue ?? true
  });

  const previewInvoiceNumber = (() => {
    const yr = new Date().getFullYear();
    const nextYr = String(yr + 1).slice(2);
    const fyStr = `${yr}-${nextYr}`;
    const sep = form.numberSeparator;
    const num = String(form.startNumber);

    let out = form.invoicePrefix;
    if (form.includeYearInNumber) {
      out += `${sep}${fyStr}`;
    }
    out += `${sep}${num}`;
    if (form.invoiceSuffix) {
      out += `${sep}${form.invoiceSuffix}`;
    }
    return out;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSave({
        invoicePrefix: form.invoicePrefix.trim(),
        invoiceSuffix: form.invoiceSuffix.trim() || null,
        numberSeparator: form.numberSeparator,
        startNumber: Number(form.startNumber),
        includeYearInNumber: form.includeYearInNumber,
        defaultDueDays: Number(form.defaultDueDays),
        defaultCurrency: form.defaultCurrency,
        defaultTerms: form.defaultTerms.trim() || null,
        defaultNotes: form.defaultNotes.trim() || null,
        footerNote: form.footerNote.trim() || null,
        showHsnColumn: form.showHsnColumn,
        showDiscount: form.showDiscount,
        showBankDetails: form.showBankDetails,
        showSignature: form.showSignature,
        enableRoundOff: form.enableRoundOff,
        autoMarkOverdue: form.autoMarkOverdue
      });
      toast.success('Invoice settings saved successfully');
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to update invoice settings'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Invoice Numbering & Sequencing */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-warm-accentLight text-warm-accent">
              <Hash className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                Invoice Numbering &amp; Formatting
              </h3>
              <p className="text-xs text-warm-textMuted">
                Configure automated sequential numbering and prefix rules
              </p>
            </div>
          </div>

          <div className="px-3 py-1.5 bg-warm-input border border-warm-border flex items-center gap-2">
            <span className="text-[11px] font-bold text-warm-textSubtle uppercase">Next Preview:</span>
            <span className="text-xs font-bold text-warm-accent">{previewInvoiceNumber}</span>
          </div>
        </div>

        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Invoice Prefix"
              value={form.invoicePrefix}
              onChange={(e) => setForm((prev) => ({ ...prev, invoicePrefix: e.target.value.toUpperCase() }))}
              placeholder="Enter invoice prefix"
              required
            />

            <Input
              label="Invoice Suffix (Optional)"
              value={form.invoiceSuffix}
              onChange={(e) => setForm((prev) => ({ ...prev, invoiceSuffix: e.target.value }))}
              placeholder="Enter invoice suffix"
            />

            <Select
              label="Number Separator"
              value={form.numberSeparator}
              options={SEPARATOR_OPTIONS}
              onChange={(e) => setForm((prev) => ({ ...prev, numberSeparator: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Starting Number"
              type="number"
              min={1}
              value={form.startNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, startNumber: parseInt(e.target.value) || 1 }))}
              placeholder="Enter starting number"
              required
            />

            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.includeYearInNumber}
                  onChange={(e) => setForm((prev) => ({ ...prev, includeYearInNumber: e.target.checked }))}
                  className="w-4 h-4 rounded-none border-warm-border text-warm-accent focus:ring-warm-accent"
                />
                <span className="text-xs font-semibold text-warm-text">
                  Include Financial Year in Number (e.g. {form.invoicePrefix}-2026-27-{form.startNumber})
                </span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Commercial Defaults */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex items-center gap-2.5">
          <div className="p-1.5 bg-warm-accentLight text-warm-accent">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
              Commercial Terms &amp; Defaults
            </h3>
            <p className="text-xs text-warm-textMuted">
              Default currency, standard payment credit period, and auto-populated terms
            </p>
          </div>
        </div>

        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Default Currency"
              value={form.defaultCurrency}
              options={CURRENCY_OPTIONS}
              onChange={(e) => setForm((prev) => ({ ...prev, defaultCurrency: e.target.value }))}
            />

            <Input
              label="Default Payment Due Days"
              type="number"
              min={0}
              max={365}
              value={form.defaultDueDays}
              onChange={(e) => setForm((prev) => ({ ...prev, defaultDueDays: parseInt(e.target.value) || 0 }))}
              placeholder="Enter default due days"
              helperText="Sets due date relative to invoice issue date"
            />
          </div>

          <Textarea
            label="Standard Terms & Conditions"
            value={form.defaultTerms}
            onChange={(e) => setForm((prev) => ({ ...prev, defaultTerms: e.target.value }))}
            placeholder="Enter standard terms and conditions printed on all invoices"
            rows={2}
          />

          <Textarea
            label="Standard Customer Notes"
            value={form.defaultNotes}
            onChange={(e) => setForm((prev) => ({ ...prev, defaultNotes: e.target.value }))}
            placeholder="Enter default invoice notes for customers"
            rows={2}
          />

          <Input
            label="Footer Note"
            value={form.footerNote}
            onChange={(e) => setForm((prev) => ({ ...prev, footerNote: e.target.value }))}
            placeholder="Enter invoice footer text"
          />
        </CardContent>
      </Card>

      {/* 3. Document Presentation & Column Visibility Switches */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex items-center gap-2.5">
          <div className="p-1.5 bg-warm-accentLight text-warm-accent">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
              Invoice Presentation &amp; Column Toggles
            </h3>
            <p className="text-xs text-warm-textMuted">
              Show or hide specific columns, statutory tax details, and banking information
            </p>
          </div>
        </div>

        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="p-3 bg-warm-input/40 border border-warm-border/60 flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-xs font-bold text-warm-text block">HSN / SAC Code Column</span>
                <span className="text-[11px] text-warm-textMuted">Show HSN/SAC on line items</span>
              </div>
              <input
                type="checkbox"
                checked={form.showHsnColumn}
                onChange={(e) => setForm((prev) => ({ ...prev, showHsnColumn: e.target.checked }))}
                className="w-4 h-4 rounded-none border-warm-border text-warm-accent focus:ring-warm-accent"
              />
            </label>

            <label className="p-3 bg-warm-input/40 border border-warm-border/60 flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-xs font-bold text-warm-text block">Discount Column</span>
                <span className="text-[11px] text-warm-textMuted">Show item-level discount input</span>
              </div>
              <input
                type="checkbox"
                checked={form.showDiscount}
                onChange={(e) => setForm((prev) => ({ ...prev, showDiscount: e.target.checked }))}
                className="w-4 h-4 rounded-none border-warm-border text-warm-accent focus:ring-warm-accent"
              />
            </label>

            <label className="p-3 bg-warm-input/40 border border-warm-border/60 flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-xs font-bold text-warm-text block">Bank &amp; Payment Details</span>
                <span className="text-[11px] text-warm-textMuted">Print company bank account on PDF</span>
              </div>
              <input
                type="checkbox"
                checked={form.showBankDetails}
                onChange={(e) => setForm((prev) => ({ ...prev, showBankDetails: e.target.checked }))}
                className="w-4 h-4 rounded-none border-warm-border text-warm-accent focus:ring-warm-accent"
              />
            </label>

            <label className="p-3 bg-warm-input/40 border border-warm-border/60 flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-xs font-bold text-warm-text block">Authorized Signature Box</span>
                <span className="text-[11px] text-warm-textMuted">Show signature seal placeholder</span>
              </div>
              <input
                type="checkbox"
                checked={form.showSignature}
                onChange={(e) => setForm((prev) => ({ ...prev, showSignature: e.target.checked }))}
                className="w-4 h-4 rounded-none border-warm-border text-warm-accent focus:ring-warm-accent"
              />
            </label>

            <label className="p-3 bg-warm-input/40 border border-warm-border/60 flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-xs font-bold text-warm-text block">Round-Off Grand Total</span>
                <span className="text-[11px] text-warm-textMuted">Round bill amounts to nearest integer</span>
              </div>
              <input
                type="checkbox"
                checked={form.enableRoundOff}
                onChange={(e) => setForm((prev) => ({ ...prev, enableRoundOff: e.target.checked }))}
                className="w-4 h-4 rounded-none border-warm-border text-warm-accent focus:ring-warm-accent"
              />
            </label>

            <label className="p-3 bg-warm-input/40 border border-warm-border/60 flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-xs font-bold text-warm-text block">Auto-Mark Overdue Status</span>
                <span className="text-[11px] text-warm-textMuted">Automatically tag invoices past due date</span>
              </div>
              <input
                type="checkbox"
                checked={form.autoMarkOverdue}
                onChange={(e) => setForm((prev) => ({ ...prev, autoMarkOverdue: e.target.checked }))}
                className="w-4 h-4 rounded-none border-warm-border text-warm-accent focus:ring-warm-accent"
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {canEdit && (
        <div className="flex justify-end pt-2">
          <Button type="submit" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
            Save Invoice Settings
          </Button>
        </div>
      )}
    </form>
  );
}
