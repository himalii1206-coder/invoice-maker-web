'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { InvoiceSettings, InvoiceSettingsPayload } from '@/types/invoice';
import { CompanyProfile } from '@/lib/company';
import { Percent, Save, Scale, Building2, Info } from 'lucide-react';
import { toast } from 'react-toastify';
import { getApiErrorMessage } from '@/lib/api';

interface GstTaxSettingsSectionProps {
  settings: InvoiceSettings;
  company: CompanyProfile;
  gstRates: number[];
  onSave: (payload: InvoiceSettingsPayload) => Promise<void>;
  isSaving: boolean;
  canEdit: boolean;
}

const RATE_HINTS: Record<number, string> = {
  0: 'Nil Rated / Exempted',
  5: 'Essential Commodities',
  12: 'Standard Goods',
  18: 'Standard Services & Goods',
  28: 'Luxury / Capital Heavy'
};

export function GstTaxSettingsSection({
  settings,
  company,
  gstRates,
  onSave,
  isSaving,
  canEdit
}: GstTaxSettingsSectionProps) {
  const [gstEnabled, setGstEnabled] = useState(settings.gstEnabled);
  const [defaultTaxRate, setDefaultTaxRate] = useState(String(Number(settings.defaultTaxRate ?? 18)));
  const [pricesIncludeTax, setPricesIncludeTax] = useState(settings.pricesIncludeTax);
  const [hsnRequiredOnProduct, setHsnRequiredOnProduct] = useState(settings.hsnRequiredOnProduct);
  const [showHsnColumn, setShowHsnColumn] = useState(settings.showHsnColumn);
  const [enableReverseCharge, setEnableReverseCharge] = useState(settings.enableReverseCharge);

  // Falls back to the saved rate so a rate the server no longer offers still
  // appears rather than being silently replaced.
  const rateOptions = Array.from(
    new Set([...gstRates, Number(settings.defaultTaxRate ?? 18)])
  )
    .sort((a, b) => a - b)
    .map((rate) => ({
      value: String(rate),
      label: RATE_HINTS[rate] ? `${rate}% - ${RATE_HINTS[rate]}` : `${rate}%`
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSave({
        gstEnabled,
        defaultTaxRate: parseFloat(defaultTaxRate) || 0,
        pricesIncludeTax,
        hsnRequiredOnProduct,
        showHsnColumn,
        enableReverseCharge
      });
      toast.success('GST & Tax settings saved successfully');
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to update GST settings'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. GST Regimes & Defaults */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-warm-accentLight text-warm-accent">
              <Percent className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                Indian GST &amp; Tax Configuration
              </h3>
              <p className="text-xs text-warm-textMuted">
                Default tax slabs, pricing mode, and statutory invoice formatting
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Default GST Tax Rate"
              value={defaultTaxRate}
              options={rateOptions}
              onChange={(e) => setDefaultTaxRate(e.target.value)}
              disabled={!canEdit || !gstEnabled}
              helperText="Applied to new product and invoice line items"
            />

            <div className="space-y-1.5">
              <span className="block text-xs font-semibold uppercase tracking-wider text-warm-textMuted">
                Place of Supply Source
              </span>
              <div className="h-10 px-3 flex items-center gap-2 bg-warm-input/60 border border-warm-border text-xs text-warm-text">
                <Building2 className="w-3.5 h-3.5 text-warm-textMuted shrink-0" />
                <span className="truncate">{company.state || 'Business state not set'}</span>
              </div>
              <p className="text-[11px] text-warm-textMuted">
                CGST+SGST vs IGST is derived per invoice: same state as this one is intra-state,
                anything else is inter-state.
              </p>
            </div>
          </div>

          <div className="p-4 bg-warm-input/40 border border-warm-border/60 space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-xs font-bold text-warm-text block">GST Compliance Active</span>
                <span className="text-[11px] text-warm-textMuted">
                  Turn off for a business that is not GST registered - every line is then taxed at 0%
                </span>
              </div>
              <input
                type="checkbox"
                checked={gstEnabled}
                onChange={(e) => setGstEnabled(e.target.checked)}
                disabled={!canEdit}
                className="w-4 h-4 rounded-none border-warm-border text-warm-accent focus:ring-warm-accent"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-warm-border/40">
              <div>
                <span className="text-xs font-bold text-warm-text block">
                  HSN / SAC Mandatory on Catalogue
                </span>
                <span className="text-[11px] text-warm-textMuted">
                  Rejects products saved without an HSN/SAC code
                </span>
              </div>
              <input
                type="checkbox"
                checked={hsnRequiredOnProduct}
                onChange={(e) => setHsnRequiredOnProduct(e.target.checked)}
                disabled={!canEdit || !gstEnabled}
                className="w-4 h-4 rounded-none border-warm-border text-warm-accent focus:ring-warm-accent"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-warm-border/40">
              <div>
                <span className="text-xs font-bold text-warm-text block">
                  Show HSN / SAC Column on Documents
                </span>
                <span className="text-[11px] text-warm-textMuted">
                  Prints the HSN column on invoice PDFs and in the line editor
                </span>
              </div>
              <input
                type="checkbox"
                checked={showHsnColumn}
                onChange={(e) => setShowHsnColumn(e.target.checked)}
                disabled={!canEdit}
                className="w-4 h-4 rounded-none border-warm-border text-warm-accent focus:ring-warm-accent"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-warm-border/40">
              <div>
                <span className="text-xs font-bold text-warm-text block">
                  Tax-Inclusive Pricing Mode
                </span>
                <span className="text-[11px] text-warm-textMuted">
                  Entered unit prices already include GST; the tax is backed out of them
                </span>
              </div>
              <input
                type="checkbox"
                checked={pricesIncludeTax}
                onChange={(e) => setPricesIncludeTax(e.target.checked)}
                disabled={!canEdit || !gstEnabled}
                className="w-4 h-4 rounded-none border-warm-border text-warm-accent focus:ring-warm-accent"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-warm-border/40">
              <div>
                <span className="text-xs font-bold text-warm-text block">
                  Reverse Charge (RCM) Capability
                </span>
                <span className="text-[11px] text-warm-textMuted">
                  Offers the Section 9(3) / 9(4) reverse charge toggle on invoices
                </span>
              </div>
              <input
                type="checkbox"
                checked={enableReverseCharge}
                onChange={(e) => setEnableReverseCharge(e.target.checked)}
                disabled={!canEdit || !gstEnabled}
                className="w-4 h-4 rounded-none border-warm-border text-warm-accent focus:ring-warm-accent"
              />
            </label>
          </div>

          {pricesIncludeTax && gstEnabled && (
            <p className="text-[11px] text-warm-text bg-warm-accentLight/40 border border-warm-accent/30 p-2.5 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-warm-accent" />
              Documents already saved keep the figures they were saved with. Only new and edited
              invoices are calculated this way.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 2. Supported Tax Rate Slabs */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex items-center gap-2.5">
          <div className="p-1.5 bg-warm-accentLight text-warm-accent">
            <Scale className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
            Active Statutory Tax Slabs
          </h3>
        </div>

        <CardContent className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {gstRates.map((rate) => (
              <div
                key={rate}
                className={`p-3 border text-center space-y-1 ${
                  String(rate) === defaultTaxRate
                    ? 'bg-warm-accentLight/50 border-warm-accent'
                    : 'bg-warm-input/40 border-warm-border/60'
                }`}
              >
                <span className="text-xs font-bold text-warm-accent block">{rate}% GST</span>
                <span className="text-[10px] text-warm-textMuted">
                  {RATE_HINTS[rate] ?? 'Standard'}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-warm-textMuted mt-3">
            These are the slabs offered in the line-item editor. The highlighted one is your default.
          </p>
        </CardContent>
      </Card>

      {canEdit && (
        <div className="flex justify-end pt-2">
          <Button type="submit" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
            Save GST Settings
          </Button>
        </div>
      )}
    </form>
  );
}
