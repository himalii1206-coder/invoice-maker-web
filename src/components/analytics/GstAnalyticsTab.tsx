'use client';

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { GstAnalyticsData, exportToCsv } from '@/lib/reports';
import { BarChart } from './charts/BarChart';
import { DonutChart, DonutSegment } from './charts/DonutChart';
import { HorizontalBarChart, HorizontalBarItem } from './charts/HorizontalBarChart';
import {
  Percent,
  Download,
  Building2,
  Receipt,
  FileSpreadsheet,
  ShieldCheck,
  Scale,
  PieChart,
  BarChart3
} from 'lucide-react';

interface GstAnalyticsTabProps {
  data: GstAnalyticsData;
}

export function GstAnalyticsTab({ data }: GstAnalyticsTabProps) {
  const taxComponentDonutSegments: DonutSegment[] = useMemo(() => {
    return [
      { label: 'CGST (Central Tax)', value: data.cgst, color: '#2563eb' },
      { label: 'SGST (State Tax)', value: data.sgst, color: '#16a34a' },
      { label: 'IGST (Integrated)', value: data.igst, color: '#9333ea' }
    ].filter((s) => s.value > 0);
  }, [data.cgst, data.sgst, data.igst]);

  const slabBarData: HorizontalBarItem[] = useMemo(() => {
    return data.taxRateBreakdown
      .filter((r) => r.taxable > 0 || r.tax > 0)
      .map((r) => ({
        label: `${r.rate}% GST Slab`,
        subLabel: `Output Tax: ${formatCurrency(r.tax)}`,
        value: r.taxable,
        percentage: data.totalTaxableAmount > 0 ? Math.round((r.taxable / data.totalTaxableAmount) * 100) : 0
      }));
  }, [data.taxRateBreakdown, data.totalTaxableAmount]);

  const monthlyGstSeries = useMemo(() => {
    return data.gstByMonth.map((m) => ({
      label: m.month.split(' ')[0],
      invoiced: m.tax
    }));
  }, [data.gstByMonth]);

  const handleExportGstSummary = () => {
    const rows = data.taxRateBreakdown.map((r) => ({
      'GST Slab Rate': `${r.rate}%`,
      'Taxable Turnover': r.taxable,
      'CGST Amount': r.cgst,
      'SGST Amount': r.sgst,
      'IGST Amount': r.igst,
      'Total Output Tax': r.tax
    }));
    exportToCsv('GSTR_Tax_Rate_Summary', rows);
  };

  const handleExportHsn = () => {
    const rows = data.hsnBreakdown.map((h) => ({
      'HSN / SAC Code': h.hsn,
      'Tax Rate': `${h.rate}%`,
      Quantity: h.quantity,
      'Taxable Value': h.taxable,
      'Total Tax Amount': h.tax,
      'Total Invoice Value': h.total
    }));
    exportToCsv('HSN_SAC_Statutory_Report', rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Tax Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Taxable Turnover */}
        <Card className="border-warm-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                Taxable Turnover
              </span>
              <div className="p-2 bg-warm-input text-warm-text">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-warm-text tracking-tight">
              {formatCurrency(data.totalTaxableAmount)}
            </p>
            <p className="text-xs text-warm-textMuted mt-2 pt-2 border-t border-warm-border/50">
              Total assessable value for GST
            </p>
          </CardContent>
        </Card>

        {/* Total Output GST Collected */}
        <Card className="border-warm-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                Output GST Collected
              </span>
              <div className="p-2 bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-800 tracking-tight">
              {formatCurrency(data.totalGstCollected)}
            </p>
            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-warm-border/50">
              <span className="text-warm-textMuted">CGST + SGST + IGST</span>
              <span className="font-semibold text-emerald-700">Gross Liability</span>
            </div>
          </CardContent>
        </Card>

        {/* Inward ITC Available */}
        <Card className="border-warm-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                Inward ITC (Purchases)
              </span>
              <div className="p-2 bg-blue-50 text-blue-700 border border-blue-200">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-blue-800 tracking-tight">
              {formatCurrency(data.inwardItcAvailable)}
            </p>
            <p className="text-xs text-warm-textMuted mt-2 pt-2 border-t border-warm-border/50">
              Input Tax Credit claimable
            </p>
          </CardContent>
        </Card>

        {/* Net GST Payable */}
        <Card className="border-warm-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                Net GST Payable
              </span>
              <div className="p-2 bg-warm-accentLight text-warm-accent">
                <Scale className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-warm-accent tracking-tight">
              {formatCurrency(data.netGstPayable)}
            </p>
            <p className="text-xs text-warm-textMuted mt-2 pt-2 border-t border-warm-border/50">
              After ITC offset (Output - ITC)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly GST Output Graph */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-warm-accentLight text-warm-accent">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                Monthly GST Output Tax Graph
              </h3>
              <p className="text-xs text-warm-textMuted">Output tax generation trajectory per month</p>
            </div>
          </div>
        </div>

        <CardContent className="p-6">
          <BarChart data={monthlyGstSeries} height={190} showPaidBar={false} />
        </CardContent>
      </Card>

      {/* Visual Graphs: CGST/SGST/IGST Split & Slab Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* CGST / SGST / IGST Donut Chart */}
        <Card className="border-warm-border/70">
          <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-warm-accentLight text-warm-accent">
                <PieChart className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                GST Component Split Graph
              </h3>
            </div>
          </div>

          <CardContent className="p-5">
            <DonutChart
              data={taxComponentDonutSegments}
              centerLabel="Output GST"
              centerValue={formatCurrency(data.totalGstCollected)}
              size={180}
            />
          </CardContent>
        </Card>

        {/* GST Slab Rates Comparison Horizontal Bar Chart */}
        <Card className="border-warm-border/70">
          <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-warm-accentLight text-warm-accent">
                <Percent className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                GST Slab Turnover Graph
              </h3>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportGstSummary}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export
            </Button>
          </div>

          <CardContent className="p-5">
            <HorizontalBarChart data={slabBarData} />
          </CardContent>
        </Card>
      </div>

      {/* HSN / SAC Code Summary Table */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
              HSN / SAC Summary (GSTR-1 Section 12)
            </h3>
            <p className="text-xs text-warm-textMuted">Harmonized System of Nomenclature breakdown</p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportHsn}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export HSN CSV
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-warm-input text-warm-text font-bold uppercase tracking-wider border-b border-warm-border/60">
              <tr>
                <th className="py-3 px-4">HSN / SAC Code</th>
                <th className="py-3 px-4 text-center">Tax Rate</th>
                <th className="py-3 px-4 text-right">Total Qty</th>
                <th className="py-3 px-4 text-right">Taxable Value</th>
                <th className="py-3 px-4 text-right">Total Tax</th>
                <th className="py-3 px-4 text-right">Invoice Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-border/40">
              {data.hsnBreakdown.length > 0 ? (
                data.hsnBreakdown.map((h, idx) => (
                  <tr key={idx} className="hover:bg-warm-input/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-warm-text">{h.hsn}</td>
                    <td className="py-3 px-4 text-center text-warm-textMuted">{h.rate}%</td>
                    <td className="py-3 px-4 text-right text-warm-text">{h.quantity}</td>
                    <td className="py-3 px-4 text-right font-semibold text-warm-text">
                      {formatCurrency(h.taxable)}
                    </td>
                    <td className="py-3 px-4 text-right text-warm-accent font-medium">
                      {formatCurrency(h.tax)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-warm-text">
                      {formatCurrency(h.total)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-warm-textMuted">
                    No HSN/SAC records logged.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
