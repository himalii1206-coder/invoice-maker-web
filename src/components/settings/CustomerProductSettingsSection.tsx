'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { InvoiceSettings, InvoiceSettingsPayload } from '@/types/invoice';
import { Users, Package, Save } from 'lucide-react';
import { toast } from 'react-toastify';
import { getApiErrorMessage } from '@/lib/api';

interface CustomerProductSettingsSectionProps {
  settings: InvoiceSettings;
  units: string[];
  onSave: (payload: InvoiceSettingsPayload) => Promise<void>;
  isSaving: boolean;
  canEdit: boolean;
}

const UNIT_HINTS: Record<string, string> = {
  PCS: 'Pieces',
  BOX: 'Boxes',
  KGS: 'Kilograms',
  MTR: 'Meters',
  NOS: 'Numbers',
  SET: 'Sets',
  UNIT: 'Units',
  BAG: 'Bags',
  LTR: 'Litres',
  SQF: 'Square Feet',
  HRS: 'Hours'
};

export function CustomerProductSettingsSection({
  settings,
  units,
  onSave,
  isSaving,
  canEdit
}: CustomerProductSettingsSectionProps) {
  const [customerPrefix, setCustomerPrefix] = useState(settings.customerCodePrefix);
  const [customerDueDays, setCustomerDueDays] = useState(settings.customerCreditDays);
  const [requireGstin, setRequireGstin] = useState(settings.customerRequireGstin);
  const [requirePhone, setRequirePhone] = useState(settings.customerRequirePhone);
  const [requireState, setRequireState] = useState(settings.customerRequireState);

  const [productPrefix, setProductPrefix] = useState(settings.productCodePrefix);
  const [defaultUnit, setDefaultUnit] = useState(settings.defaultUnit);
  const [defaultDiscountMode, setDefaultDiscountMode] = useState(settings.defaultDiscountMode);
  const [hsnCompulsory, setHsnCompulsory] = useState(settings.hsnRequiredOnProduct);

  // Falls back to the saved value so a unit that is no longer offered by the
  // server is still shown rather than silently switched.
  const unitOptions = Array.from(new Set([...units, settings.defaultUnit])).map((unit) => ({
    value: unit,
    label: UNIT_HINTS[unit] ? `${unit} - ${UNIT_HINTS[unit]}` : unit
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSave({
        customerCodePrefix: customerPrefix,
        customerCreditDays: customerDueDays,
        customerRequireGstin: requireGstin,
        customerRequirePhone: requirePhone,
        customerRequireState: requireState,
        productCodePrefix: productPrefix,
        defaultUnit,
        defaultDiscountMode,
        hsnRequiredOnProduct: hsnCompulsory
      });
      toast.success('Customer & Product defaults saved successfully');
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to save customer & product settings'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Customer Management Settings */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-warm-accentLight text-warm-accent">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                Customer Directory Defaults
              </h3>
              <p className="text-xs text-warm-textMuted">
                Account numbering prefix, default credit period, and compulsory data fields
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Customer Code Prefix"
              value={customerPrefix}
              onChange={(e) => setCustomerPrefix(e.target.value.toUpperCase())}
              placeholder="Enter customer code prefix"
              disabled={!canEdit}
              maxLength={8}
              helperText={`New customers get ${customerPrefix || 'CUST'}-0001, ${
                customerPrefix || 'CUST'
              }-0002...`}
            />

            <Input
              label="Default Credit Period (Days)"
              type="number"
              min={0}
              max={365}
              value={customerDueDays}
              onChange={(e) => setCustomerDueDays(parseInt(e.target.value) || 0)}
              placeholder="Enter default credit period"
              disabled={!canEdit}
              helperText="Used as the payment window when a customer has none of their own"
            />
          </div>

          <div className="p-4 bg-warm-input/40 border border-warm-border/60 space-y-3">
            <span className="text-xs font-bold text-warm-text block uppercase tracking-wide">
              Mandatory Fields on Customer Creation
            </span>
            <p className="text-[11px] text-warm-textMuted">
              Enforced when customers are created or edited. Existing records are left alone.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-warm-text">
                <input
                  type="checkbox"
                  checked={requirePhone}
                  onChange={(e) => setRequirePhone(e.target.checked)}
                  disabled={!canEdit}
                  className="w-4 h-4 rounded-none border-warm-border text-warm-accent focus:ring-warm-accent"
                />
                Phone Number Required
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-warm-text">
                <input
                  type="checkbox"
                  checked={requireState}
                  onChange={(e) => setRequireState(e.target.checked)}
                  disabled={!canEdit}
                  className="w-4 h-4 rounded-none border-warm-border text-warm-accent focus:ring-warm-accent"
                />
                State &amp; City Required
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-warm-text">
                <input
                  type="checkbox"
                  checked={requireGstin}
                  onChange={(e) => setRequireGstin(e.target.checked)}
                  disabled={!canEdit}
                  className="w-4 h-4 rounded-none border-warm-border text-warm-accent focus:ring-warm-accent"
                />
                GSTIN Required (B2B)
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Product & Service Settings */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex items-center gap-2.5">
          <div className="p-1.5 bg-warm-accentLight text-warm-accent">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
              Product &amp; Service Catalog Defaults
            </h3>
            <p className="text-xs text-warm-textMuted">
              Default unit of measure, SKU prefixing, and discount calculations
            </p>
          </div>
        </div>

        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Product Code / SKU Prefix"
              value={productPrefix}
              onChange={(e) => setProductPrefix(e.target.value.toUpperCase())}
              placeholder="Enter product code prefix"
              disabled={!canEdit}
              maxLength={8}
              helperText={`Generates ${productPrefix || 'PRD'}-0001 when no code is typed`}
            />

            <Select
              label="Default Unit of Measure"
              value={defaultUnit}
              options={unitOptions}
              onChange={(e) => setDefaultUnit(e.target.value)}
              disabled={!canEdit}
              helperText="Pre-selected on new catalogue items"
            />

            <Select
              label="Default Discount Mode"
              value={defaultDiscountMode}
              options={[
                { value: 'PERCENT', label: 'Percentage ( % )' },
                { value: 'FIXED', label: 'Fixed Amount ( ₹ )' }
              ]}
              onChange={(e) => setDefaultDiscountMode(e.target.value as 'PERCENT' | 'FIXED')}
              disabled={!canEdit}
            />
          </div>

          <div className="p-4 bg-warm-input/40 border border-warm-border/60">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-xs font-bold text-warm-text block">
                  HSN / SAC Mandatory for Catalog
                </span>
                <span className="text-[11px] text-warm-textMuted">
                  Rejects products saved without a valid HSN/SAC code
                </span>
              </div>
              <input
                type="checkbox"
                checked={hsnCompulsory}
                onChange={(e) => setHsnCompulsory(e.target.checked)}
                disabled={!canEdit}
                className="w-4 h-4 rounded-none border-warm-border text-warm-accent focus:ring-warm-accent"
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {canEdit && (
        <div className="flex justify-end pt-2">
          <Button type="submit" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
            Save Customer &amp; Product Settings
          </Button>
        </div>
      )}
    </form>
  );
}
