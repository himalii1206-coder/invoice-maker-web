'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { InvoiceSettings, InvoiceSettingsPayload } from '@/types/invoice';
import {
  Layout,
  Save,
  CheckCircle2,
  Palette,
  Eye,
  Type,
  Table,
  Building2,
  FileText,
  Sparkles,
  QrCode
} from 'lucide-react';
import { toast } from 'react-toastify';
import { getApiErrorMessage } from '@/lib/api';

interface TemplateSettingsSectionProps {
  settings: InvoiceSettings;
  onSave: (payload: InvoiceSettingsPayload) => Promise<void>;
  isSaving: boolean;
  canEdit: boolean;
}

interface TemplateOption {
  id: 'classic' | 'modern' | 'minimal';
  name: string;
  tagline: string;
  description: string;
  badge: string;
}

const TEMPLATE_THEMES: TemplateOption[] = [
  {
    id: 'classic',
    name: 'Classic Corporate',
    tagline: 'Traditional GST Standard',
    description: 'Formal corporate layout with prominent dual-column billing, full HSN/SAC tax table, and statutory seals',
    badge: 'Popular'
  },
  {
    id: 'modern',
    name: 'Modern Neo',
    tagline: 'Vibrant Accent & Header Band',
    description: 'Contemporary design with bold header branding, sleek status pills, and high-impact totals card',
    badge: 'Trending'
  },
  {
    id: 'minimal',
    name: 'Executive Slate',
    tagline: 'Clean Minimalist Density',
    description: 'High item-capacity layout optimized for multi-page manufacturing, wholesale, and service contracts',
    badge: 'Clean'
  }
];

export function TemplateSettingsSection({
  settings,
  onSave,
  isSaving,
  canEdit
}: TemplateSettingsSectionProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<'classic' | 'modern' | 'minimal'>(
    (settings.template as any) || 'classic'
  );
  const [fontFamily, setFontFamily] = useState(settings.fontFamily || 'HELVETICA');
  const [tableStyle, setTableStyle] = useState<'grid' | 'minimal' | 'striped'>(
    (settings.tableStyle as 'grid' | 'minimal' | 'striped') || 'grid'
  );
  const [signaturePosition, setSignaturePosition] = useState<'right' | 'left'>(
    (settings.signaturePosition as 'right' | 'left') || 'right'
  );
  const [themeColor, setThemeColor] = useState(settings.themeColor || '#7c4a27');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSave({
        template: selectedTemplate,
        fontFamily,
        tableStyle,
        signaturePosition,
        themeColor
      });
      toast.success('Template & PDF appearance settings saved');
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to update template settings'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Template Design Theme Selection with Mini Visual Mockups */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-warm-accentLight text-warm-accent">
              <Layout className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                Invoice PDF Layout &amp; Template Themes
              </h3>
              <p className="text-xs text-warm-textMuted">
                Select visual style for printed bills, tax invoices, and client export PDFs
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-warm-accent bg-warm-accentLight/60 px-2.5 py-1 self-start sm:self-auto border border-warm-accent/20">
            Active: {TEMPLATE_THEMES.find((t) => t.id === selectedTemplate)?.name}
          </span>
        </div>

        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TEMPLATE_THEMES.map((theme) => {
              const isSelected = selectedTemplate === theme.id;
              return (
                <div
                  key={theme.id}
                  onClick={() => setSelectedTemplate(theme.id)}
                  className={`group relative border cursor-pointer transition-all flex flex-col justify-between overflow-hidden ${
                    isSelected
                      ? 'bg-warm-surface border-warm-accent shadow-md ring-2 ring-warm-accent'
                      : 'bg-warm-surface/70 border-warm-border/80 hover:border-warm-accent/60 hover:shadow-sm'
                  }`}
                >
                  {/* Top Badge */}
                  <div className="p-3 border-b border-warm-border/50 flex items-center justify-between bg-warm-input/30">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-warm-accent bg-warm-accentLight px-1.5 py-0.5">
                      {theme.badge}
                    </span>
                    {isSelected ? (
                      <div className="flex items-center gap-1 text-[11px] font-bold text-warm-accent">
                        <CheckCircle2 className="w-3.5 h-3.5 fill-warm-accent text-white" />
                        <span>Selected</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-warm-textSubtle group-hover:text-warm-text">Click to preview</span>
                    )}
                  </div>

                  {/* Miniature Visual Mockup of the Invoice */}
                  <div className="p-3 bg-warm-input/20 flex items-center justify-center">
                    <div className="w-full aspect-[4/3] bg-white border border-warm-border/80 p-2.5 flex flex-col justify-between shadow-xs">
                      {theme.id === 'classic' && (
                        <div className="space-y-1.5 text-[7px]">
                          {/* Classic Header */}
                          <div className="flex justify-between items-start border-b border-warm-border/60 pb-1">
                            <div>
                              <div className="w-12 h-2 bg-warm-accent/80 mb-0.5" />
                              <div className="w-16 h-1 bg-gray-300" />
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-[8px] text-warm-accent">TAX INVOICE</span>
                              <div className="w-10 h-1 bg-gray-300 ml-auto mt-0.5" />
                            </div>
                          </div>
                          {/* Classic Columns */}
                          <div className="grid grid-cols-2 gap-1 py-0.5">
                            <div className="h-4 bg-warm-input/50 p-0.5 border border-warm-border/40">
                              <div className="w-8 h-1 bg-gray-400 mb-0.5" />
                              <div className="w-12 h-1 bg-gray-300" />
                            </div>
                            <div className="h-4 bg-warm-input/50 p-0.5 border border-warm-border/40">
                              <div className="w-8 h-1 bg-gray-400 mb-0.5" />
                              <div className="w-10 h-1 bg-gray-300" />
                            </div>
                          </div>
                          {/* Classic Table with Grid */}
                          <div className="border border-warm-border/60">
                            <div className="bg-warm-accentLight/50 h-2 flex items-center px-1 border-b border-warm-border/50">
                              <div className="w-full flex justify-between">
                                <span className="w-10 h-1 bg-warm-accent/60" />
                                <span className="w-4 h-1 bg-warm-accent/60" />
                              </div>
                            </div>
                            <div className="h-2 flex items-center px-1 border-b border-warm-border/30">
                              <div className="w-full flex justify-between">
                                <span className="w-8 h-1 bg-gray-300" />
                                <span className="w-3 h-1 bg-gray-300" />
                              </div>
                            </div>
                          </div>
                          {/* Classic Bottom */}
                          <div className="flex justify-between items-end pt-1">
                            <div className="w-12 h-2 bg-gray-200" />
                            <div className="w-14 h-3 bg-warm-accentLight border border-warm-accent/30" />
                          </div>
                        </div>
                      )}

                      {theme.id === 'modern' && (
                        <div className="space-y-1.5 text-[7px]">
                          {/* Modern Bold Banner */}
                          <div className="bg-warm-accent text-white p-1 -mx-2.5 -mt-2.5 mb-1 flex justify-between items-center">
                            <div className="w-12 h-2 bg-white/90" />
                            <span className="font-bold text-[7px] bg-white/20 px-1">INVOICE</span>
                          </div>
                          {/* Modern Pills */}
                          <div className="flex justify-between items-center py-0.5">
                            <div className="w-14 h-2 bg-warm-input" />
                            <div className="w-8 h-2 bg-emerald-100 border border-emerald-300" />
                          </div>
                          {/* Modern Striped Table */}
                          <div className="space-y-0.5">
                            <div className="bg-warm-accent text-white h-2 flex items-center px-1">
                              <div className="w-full flex justify-between">
                                <span className="w-10 h-1 bg-white/80" />
                                <span className="w-4 h-1 bg-white/80" />
                              </div>
                            </div>
                            <div className="bg-warm-input/40 h-2 flex items-center px-1">
                              <div className="w-full flex justify-between">
                                <span className="w-8 h-1 bg-gray-400" />
                                <span className="w-3 h-1 bg-gray-400" />
                              </div>
                            </div>
                          </div>
                          {/* Modern Accent Total Card */}
                          <div className="flex justify-between items-center pt-1 border-t border-warm-border/40">
                            <div className="w-8 h-4 bg-gray-100 border border-gray-300 flex items-center justify-center">
                              <QrCode className="w-2.5 h-2.5 text-gray-600" />
                            </div>
                            <div className="w-16 h-4 bg-warm-accent text-white p-0.5 text-right flex flex-col justify-center">
                              <div className="w-8 h-1 bg-white/70 ml-auto mb-0.5" />
                              <div className="w-12 h-1.5 bg-white ml-auto" />
                            </div>
                          </div>
                        </div>
                      )}

                      {theme.id === 'minimal' && (
                        <div className="space-y-1.5 text-[7px]">
                          {/* Minimal Clean Header */}
                          <div className="flex justify-between items-baseline border-b-2 border-warm-text pb-1">
                            <span className="font-bold text-[9px] text-warm-text">INVOICE</span>
                            <span className="text-[7px] text-gray-500 font-mono">#INV-2026-1001</span>
                          </div>
                          {/* Minimal Streamlined Info */}
                          <div className="flex justify-between text-[6px] text-gray-600">
                            <div>
                              <div className="w-12 h-1 bg-gray-500 mb-0.5" />
                              <div className="w-16 h-1 bg-gray-300" />
                            </div>
                            <div className="text-right">
                              <div className="w-10 h-1 bg-gray-500 ml-auto mb-0.5" />
                              <div className="w-8 h-1 bg-gray-300 ml-auto" />
                            </div>
                          </div>
                          {/* Minimal Clean Borderless Table */}
                          <div className="border-y border-gray-200 py-0.5 space-y-0.5">
                            <div className="flex justify-between text-gray-400">
                              <div className="w-12 h-1 bg-gray-600" />
                              <div className="w-4 h-1 bg-gray-600" />
                            </div>
                            <div className="flex justify-between">
                              <div className="w-10 h-1 bg-gray-400" />
                              <div className="w-3 h-1 bg-gray-400" />
                            </div>
                          </div>
                          {/* Minimal Clean Totals */}
                          <div className="text-right pt-1 space-y-0.5">
                            <div className="w-12 h-1 bg-gray-400 ml-auto" />
                            <div className="w-16 h-1.5 bg-warm-text ml-auto" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Template Meta Info */}
                  <div className="p-3.5 space-y-1">
                    <h4 className="text-xs font-bold text-warm-text flex items-center gap-1.5">
                      {theme.name}
                    </h4>
                    <p className="text-[11px] font-semibold text-warm-accent">
                      {theme.tagline}
                    </p>
                    <p className="text-[10px] text-warm-textMuted leading-relaxed pt-0.5">
                      {theme.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 2. Full Live Interactive A4 Invoice Canvas Preview */}
      <Card className="border-warm-border/70 overflow-hidden">
        <div className="p-5 border-b border-warm-border/50 bg-warm-surface flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-warm-accentLight text-warm-accent">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider flex items-center gap-2">
                Live Document Preview Canvas
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 border border-emerald-300">
                  Real-time Renderer
                </span>
              </h3>
              <p className="text-xs text-warm-textMuted">
                Demonstrates how invoices, tax breakdowns, and payment terms render for clients
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-warm-textSubtle">Template:</span>
            <span className="text-xs font-bold text-warm-accent px-2 py-0.5 bg-warm-accentLight border border-warm-accent/30">
              {TEMPLATE_THEMES.find((t) => t.id === selectedTemplate)?.name}
            </span>
          </div>
        </div>

        <CardContent className="p-6 bg-warm-input/30 flex justify-center">
          {/* Simulated A4 Invoice Paper */}
          <div
            className={`w-full max-w-3xl bg-white border border-warm-border/90 shadow-md p-6 sm:p-8 transition-all ${
              fontFamily === 'TIMES'
                ? 'font-serif'
                : fontFamily === 'COURIER'
                  ? 'font-mono'
                  : 'font-sans'
            }`}
          >
            {/* TEMPLATE: CLASSIC CORPORATE */}
            {selectedTemplate === 'classic' && (
              <div className="space-y-5 text-warm-text text-xs">
                {/* Header */}
                <div
                  className="flex flex-col sm:flex-row sm:items-start justify-between pb-4 border-b-2 gap-4"
                  style={{ borderBottomColor: themeColor }}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 bg-warm-accent text-white font-bold text-sm">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <h2 className="text-base font-bold text-warm-text uppercase tracking-wide">
                        Acme Industrial Enterprises
                      </h2>
                    </div>
                    <p className="text-[11px] text-warm-textMuted">GSTIN: 24AABCA1234F1Z5 | PAN: AABCA1234F</p>
                    <p className="text-[11px] text-warm-textMuted">
                      Plot 42, GIDC Electronic Estate, Gandhinagar, Gujarat - 382010
                    </p>
                    <p className="text-[11px] text-warm-textMuted">contact@acme-industries.com | +91 98765 43210</p>
                  </div>

                  <div className="text-left sm:text-right space-y-1">
                    <span className="text-lg font-black text-warm-accent tracking-wider uppercase block">
                      Tax Invoice
                    </span>
                    <div className="text-[11px] text-warm-text">
                      <span className="font-bold">Invoice No:</span> <span className="font-bold text-warm-accent">INV-2026-27-1001</span>
                    </div>
                    <div className="text-[11px] text-warm-text">
                      <span className="font-bold">Issue Date:</span> 22 Sep 2026
                    </div>
                    <div className="text-[11px] text-warm-text">
                      <span className="font-bold">Due Date:</span> 07 Oct 2026 (Net 15)
                    </div>
                    <div className="text-[11px] text-warm-text">
                      <span className="font-bold">Place of Supply:</span> Gujarat (24)
                    </div>
                  </div>
                </div>

                {/* Bill To / Ship To Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-warm-input/30 border border-warm-border">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-warm-textSubtle block mb-1">
                      Billed To (Customer):
                    </span>
                    <h4 className="font-bold text-xs text-warm-text">Apex Tech Solutions Private Limited</h4>
                    <p className="text-[11px] text-warm-textMuted">GSTIN: 24AAACA9876H1Z1</p>
                    <p className="text-[11px] text-warm-textMuted">801, High Street Heights, SG Highway, Ahmedabad - 380054</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-warm-textSubtle block mb-1">
                      Dispatch &amp; Reference:
                    </span>
                    <p className="text-[11px] text-warm-text"><span className="font-bold">PO No:</span> PO-2026-8842</p>
                    <p className="text-[11px] text-warm-text"><span className="font-bold">Challan No:</span> CH-9041 (18 Sep 2026)</p>
                    <p className="text-[11px] text-warm-text"><span className="font-bold">Reverse Charge:</span> No</p>
                  </div>
                </div>

                {/* Table */}
                <div className="border border-warm-border overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-warm-accentLight/60 text-warm-accent uppercase text-[10px] font-bold border-b border-warm-border">
                      <tr>
                        <th className="p-2 border-r border-warm-border w-8 text-center">#</th>
                        <th className="p-2 border-r border-warm-border">Item Description</th>
                        <th className="p-2 border-r border-warm-border text-center">HSN/SAC</th>
                        <th className="p-2 border-r border-warm-border text-right">Qty</th>
                        <th className="p-2 border-r border-warm-border text-right">Rate (₹)</th>
                        <th className="p-2 border-r border-warm-border text-right">Taxable</th>
                        <th className="p-2 border-r border-warm-border text-right">GST</th>
                        <th className="p-2 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-warm-border/60">
                      <tr className={tableStyle === 'striped' ? 'bg-warm-input/20' : ''}>
                        <td className="p-2 border-r border-warm-border text-center">1</td>
                        <td className="p-2 border-r border-warm-border font-medium">
                          Cloud Enterprise ERP Subscription
                          <span className="block text-[10px] text-warm-textMuted">Annual dedicated node license</span>
                        </td>
                        <td className="p-2 border-r border-warm-border text-center font-mono text-[11px]">998313</td>
                        <td className="p-2 border-r border-warm-border text-right">1 YR</td>
                        <td className="p-2 border-r border-warm-border text-right">45,000.00</td>
                        <td className="p-2 border-r border-warm-border text-right">45,000.00</td>
                        <td className="p-2 border-r border-warm-border text-right">18%</td>
                        <td className="p-2 text-right font-bold">53,100.00</td>
                      </tr>
                      <tr>
                        <td className="p-2 border-r border-warm-border text-center">2</td>
                        <td className="p-2 border-r border-warm-border font-medium">
                          Implementation &amp; Data Migration
                          <span className="block text-[10px] text-warm-textMuted">Onboarding setup support</span>
                        </td>
                        <td className="p-2 border-r border-warm-border text-center font-mono text-[11px]">998314</td>
                        <td className="p-2 border-r border-warm-border text-right">1 NOS</td>
                        <td className="p-2 border-r border-warm-border text-right">10,000.00</td>
                        <td className="p-2 border-r border-warm-border text-right">10,000.00</td>
                        <td className="p-2 border-r border-warm-border text-right">18%</td>
                        <td className="p-2 text-right font-bold">11,800.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Bottom Summary & Tax Breakup */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-3 bg-warm-input/20 border border-warm-border space-y-2">
                    <span className="text-[10px] font-bold uppercase text-warm-accent block">
                      Bank Settlement Details:
                    </span>
                    <p className="text-[11px] text-warm-text"><span className="font-bold">Bank:</span> HDFC Bank Ltd</p>
                    <p className="text-[11px] text-warm-text"><span className="font-bold">A/C No:</span> 50200012345678</p>
                    <p className="text-[11px] text-warm-text"><span className="font-bold">IFSC:</span> HDFC0001234</p>
                    <p className="text-[11px] text-warm-text"><span className="font-bold">UPI ID:</span> acmeenterprises@hdfcbank</p>
                  </div>

                  <div className="space-y-1.5 p-3 bg-warm-surface border border-warm-border">
                    <div className="flex justify-between text-xs text-warm-text">
                      <span>Total Taxable Value:</span>
                      <span className="font-semibold">₹55,000.00</span>
                    </div>
                    <div className="flex justify-between text-xs text-warm-text">
                      <span>CGST (9%):</span>
                      <span className="font-semibold">₹4,950.00</span>
                    </div>
                    <div className="flex justify-between text-xs text-warm-text">
                      <span>SGST (9%):</span>
                      <span className="font-semibold">₹4,950.00</span>
                    </div>
                    <div className="flex justify-between text-xs text-warm-text">
                      <span>Round Off:</span>
                      <span className="font-semibold">₹0.00</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-warm-accent pt-1.5 border-t border-warm-border">
                      <span>Grand Total (INR):</span>
                      <span>₹64,900.00</span>
                    </div>
                  </div>
                </div>

                {/* Signature Box */}
                <div className={`flex justify-${signaturePosition === 'left' ? 'start' : 'end'} pt-4`}>
                  <div className="text-center p-3 border border-warm-border/80 w-48 space-y-6">
                    <span className="text-[10px] font-bold uppercase text-warm-textSubtle block">
                      For Acme Industrial Enterprises
                    </span>
                    <span className="text-[10px] font-bold text-warm-text block border-t border-warm-border pt-1">
                      Authorized Signatory
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TEMPLATE: MODERN NEO */}
            {selectedTemplate === 'modern' && (
              <div className="space-y-5 text-warm-text text-xs">
                {/* Modern Vibrant Banner */}
                <div className="bg-warm-accent text-white p-5 -mx-6 sm:-mx-8 -mt-6 sm:-mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/15 text-white">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold tracking-wide">Acme Industrial Enterprises</h2>
                      <p className="text-xs text-white/80">GSTIN: 24AABCA1234F1Z5 | Gujarat</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-xl font-black uppercase tracking-wider block">INVOICE</span>
                    <span className="text-xs text-white/90 font-mono">#INV-2026-27-1001</span>
                  </div>
                </div>

                {/* Status & Date Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-warm-accentLight/40 border border-warm-accent/20">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-warm-textSubtle uppercase">Status:</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                      SENT / UNPAID
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold text-warm-text">
                    <span>Issue: 22 Sep 2026</span>
                    <span>Due: 07 Oct 2026</span>
                  </div>
                </div>

                {/* Modern Client Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-warm-input/20 border-l-4 border-warm-accent space-y-1">
                    <span className="text-[10px] font-bold uppercase text-warm-accent block">Client Details:</span>
                    <h4 className="font-bold text-xs">Apex Tech Solutions Private Limited</h4>
                    <p className="text-[11px] text-warm-textMuted">GSTIN: 24AAACA9876H1Z1</p>
                    <p className="text-[11px] text-warm-textMuted">SG Highway, Ahmedabad, Gujarat</p>
                  </div>
                  <div className="p-3 bg-warm-input/20 border-l-4 border-warm-border space-y-1">
                    <span className="text-[10px] font-bold uppercase text-warm-textSubtle block">Logistics &amp; POS:</span>
                    <p className="text-[11px]"><span className="font-bold">Place of Supply:</span> Gujarat (24)</p>
                    <p className="text-[11px]"><span className="font-bold">PO Reference:</span> PO-2026-8842</p>
                    <p className="text-[11px]"><span className="font-bold">Credit Period:</span> 15 Days</p>
                  </div>
                </div>

                {/* Modern Colored Header Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-warm-accent text-white uppercase text-[10px] font-bold">
                      <tr>
                        <th className="p-2.5">Item</th>
                        <th className="p-2.5 text-center">HSN</th>
                        <th className="p-2.5 text-right">Qty</th>
                        <th className="p-2.5 text-right">Unit Rate</th>
                        <th className="p-2.5 text-right">Taxable</th>
                        <th className="p-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-warm-border/60 bg-warm-surface">
                      <tr className="hover:bg-warm-input/30">
                        <td className="p-2.5 font-semibold">
                          Cloud Enterprise ERP Subscription
                          <span className="block text-[10px] text-warm-textMuted">1-year dedicated instance</span>
                        </td>
                        <td className="p-2.5 text-center font-mono">998313</td>
                        <td className="p-2.5 text-right">1 YR</td>
                        <td className="p-2.5 text-right">₹45,000.00</td>
                        <td className="p-2.5 text-right">₹45,000.00</td>
                        <td className="p-2.5 text-right font-bold text-warm-accent">₹53,100.00</td>
                      </tr>
                      <tr className="hover:bg-warm-input/30">
                        <td className="p-2.5 font-semibold">
                          Implementation &amp; Data Migration
                        </td>
                        <td className="p-2.5 text-center font-mono">998314</td>
                        <td className="p-2.5 text-right">1 NOS</td>
                        <td className="p-2.5 text-right">₹10,000.00</td>
                        <td className="p-2.5 text-right">₹10,000.00</td>
                        <td className="p-2.5 text-right font-bold text-warm-accent">₹11,800.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Modern Totals Card with UPI QR */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-3 bg-warm-input/40 border border-warm-border/70 flex items-center gap-3">
                    <div className="p-2 bg-white border border-warm-border shrink-0">
                      <QrCode className="w-8 h-8 text-warm-accent" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-warm-accent block">Quick Digital UPI Pay:</span>
                      <p className="text-[11px] font-mono font-bold text-warm-text">acmeenterprises@hdfcbank</p>
                      <p className="text-[10px] text-warm-textMuted">Scan to settle via PhonePe, GPay, Paytm</p>
                    </div>
                  </div>

                  <div className="bg-warm-accent text-white p-4 space-y-1.5 shadow-sm">
                    <div className="flex justify-between text-xs text-white/90">
                      <span>Subtotal Taxable:</span>
                      <span>₹55,000.00</span>
                    </div>
                    <div className="flex justify-between text-xs text-white/90">
                      <span>Total GST (CGST+SGST 18%):</span>
                      <span>₹9,900.00</span>
                    </div>
                    <div className="flex justify-between text-base font-black pt-2 border-t border-white/30">
                      <span>Total Due:</span>
                      <span>₹64,900.00</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TEMPLATE: MINIMAL SLATE */}
            {selectedTemplate === 'minimal' && (
              <div className="space-y-5 text-warm-text text-xs">
                {/* Minimal Header */}
                <div className="flex justify-between items-baseline border-b-2 border-warm-text pb-3">
                  <div>
                    <h2 className="text-base font-bold tracking-tight text-warm-text">Acme Industrial Enterprises</h2>
                    <p className="text-[11px] text-gray-500">Gandhinagar, Gujarat | GSTIN: 24AABCA1234F1Z5</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-warm-text uppercase">INVOICE</span>
                    <p className="text-[11px] font-mono text-gray-600">#INV-2026-27-1001</p>
                  </div>
                </div>

                {/* Minimal Meta Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 border-b border-gray-200 text-[11px]">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Issue Date</span>
                    <span className="font-semibold">22 Sep 2026</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Due Date</span>
                    <span className="font-semibold">07 Oct 2026</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Billed To</span>
                    <span className="font-semibold">Apex Tech Solutions</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Place of Supply</span>
                    <span className="font-semibold">Gujarat (24)</span>
                  </div>
                </div>

                {/* Minimal Streamlined Table */}
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-300 text-gray-500 text-[10px] uppercase">
                    <tr>
                      <th className="py-2">Description</th>
                      <th className="py-2 text-center">HSN</th>
                      <th className="py-2 text-right">Qty</th>
                      <th className="py-2 text-right">Rate</th>
                      <th className="py-2 text-right">Tax (18%)</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="py-2.5 font-medium">Cloud Enterprise ERP Subscription</td>
                      <td className="py-2.5 text-center text-gray-500 font-mono">998313</td>
                      <td className="py-2.5 text-right">1 YR</td>
                      <td className="py-2.5 text-right">45,000.00</td>
                      <td className="py-2.5 text-right">8,100.00</td>
                      <td className="py-2.5 text-right font-semibold">53,100.00</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-medium">Implementation &amp; Data Migration</td>
                      <td className="py-2.5 text-center text-gray-500 font-mono">998314</td>
                      <td className="py-2.5 text-right">1 NOS</td>
                      <td className="py-2.5 text-right">10,000.00</td>
                      <td className="py-2.5 text-right">1,800.00</td>
                      <td className="py-2.5 text-right font-semibold">11,800.00</td>
                    </tr>
                  </tbody>
                </table>

                {/* Minimal Totals */}
                <div className="flex justify-end pt-3 border-t-2 border-gray-200">
                  <div className="w-64 space-y-1 text-right">
                    <div className="flex justify-between text-gray-500">
                      <span>Taxable Total:</span>
                      <span>₹55,000.00</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>GST Amount:</span>
                      <span>₹9,900.00</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-warm-text pt-2 border-t border-gray-300">
                      <span>Grand Total:</span>
                      <span>₹64,900.00</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. Visual Styling & Positioning Options */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex items-center gap-2.5">
          <div className="p-1.5 bg-warm-accentLight text-warm-accent">
            <Palette className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
            Typography &amp; Layout Elements
          </h3>
        </div>

        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Primary Typography Font"
              value={fontFamily}
              options={[
                { value: 'HELVETICA', label: 'Helvetica (Modern Sans - Default)' },
                { value: 'TIMES', label: 'Times (Executive Serif)' },
                { value: 'COURIER', label: 'Courier (Monospaced / Dot-matrix look)' }
              ]}
              onChange={(e) => setFontFamily(e.target.value)}
              disabled={!canEdit}
              helperText="Applied to generated invoice PDFs"
            />

            <div className="space-y-1.5">
              <span className="block text-xs font-semibold uppercase tracking-wider text-warm-textMuted">
                Accent Colour
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  disabled={!canEdit}
                  className="h-10 w-14 border border-warm-border bg-warm-input p-1 cursor-pointer disabled:cursor-not-allowed"
                  aria-label="Accent colour"
                />
                <input
                  type="text"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  disabled={!canEdit}
                  placeholder="#7c4a27"
                  className="h-10 flex-1 px-3 text-xs font-mono bg-warm-input border border-warm-border text-warm-text focus:outline-none focus:border-warm-accent disabled:opacity-60"
                />
              </div>
              <p className="text-[11px] text-warm-textMuted">
                Used for the PDF header band and outgoing email styling.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Line Items Table Style"
              value={tableStyle}
              options={[
                { value: 'grid', label: 'Full Grid Borders (Clear GST separation)' },
                { value: 'minimal', label: 'Minimal Horizontal Dividers' },
                { value: 'striped', label: 'Zebra Striped Rows' }
              ]}
              onChange={(e) => setTableStyle(e.target.value as any)}
              disabled={!canEdit}
            />

            <Select
              label="Authorized Signature Position"
              value={signaturePosition}
              options={[
                { value: 'right', label: 'Bottom Right (Standard Indian business)' },
                { value: 'left', label: 'Bottom Left' }
              ]}
              onChange={(e) => setSignaturePosition(e.target.value as any)}
              disabled={!canEdit}
            />
          </div>
        </CardContent>
      </Card>

      {canEdit && (
        <div className="flex justify-end pt-2">
          <Button type="submit" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
            Save Template Settings
          </Button>
        </div>
      )}
    </form>
  );
}

