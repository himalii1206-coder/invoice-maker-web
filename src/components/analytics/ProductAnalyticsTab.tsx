'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { ProductAnalyticsData, exportToCsv } from '@/lib/reports';
import { HorizontalBarChart, HorizontalBarItem } from './charts/HorizontalBarChart';
import { BarChart } from './charts/BarChart';
import {
  Package,
  Layers,
  Percent,
  Download,
  ArrowUpRight,
  TrendingUp,
  BarChart3
} from 'lucide-react';

interface ProductAnalyticsTabProps {
  data: ProductAnalyticsData;
}

export function ProductAnalyticsTab({ data }: ProductAnalyticsTabProps) {
  const topProductsBarData: HorizontalBarItem[] = useMemo(() => {
    return data.topSelling.slice(0, 7).map((p) => ({
      label: p.name,
      subLabel: `${p.quantity} ${p.unit} sold • ${p.invoiceCount} invoices`,
      value: p.revenue
    }));
  }, [data.topSelling]);

  const productVolumeSeries = useMemo(() => {
    return data.topSelling.slice(0, 6).map((p) => ({
      label: p.name.length > 10 ? `${p.name.slice(0, 10)}...` : p.name,
      invoiced: p.revenue,
      paid: p.tax,
      count: p.invoiceCount
    }));
  }, [data.topSelling]);

  const handleExportProducts = () => {
    const rows = data.topSelling.map((p, i) => ({
      Rank: i + 1,
      'Product / Service Name': p.name,
      'Units / Quantity Sold': p.quantity,
      Unit: p.unit,
      'Gross Revenue': p.revenue,
      'GST Generated': p.tax,
      'Invoice Count': p.invoiceCount
    }));
    exportToCsv('Product_Service_Performance', rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Product KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Catalog Items */}
        <Card className="border-warm-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                Products Sold
              </span>
              <div className="p-2 bg-warm-input text-warm-text">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-warm-text tracking-tight">
              {data.totalProductCount}
            </p>
            <p className="text-xs text-warm-textMuted mt-2 pt-2 border-t border-warm-border/50">
              Unique items / services billed
            </p>
          </CardContent>
        </Card>

        {/* Total Quantity Sold */}
        <Card className="border-warm-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                Total Units Sold
              </span>
              <div className="p-2 bg-blue-50 text-blue-700 border border-blue-200">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-blue-800 tracking-tight">
              {data.totalQuantitySold}
            </p>
            <p className="text-xs text-warm-textMuted mt-2 pt-2 border-t border-warm-border/50">
              Aggregated quantity delivered
            </p>
          </CardContent>
        </Card>

        {/* Total Product Revenue */}
        <Card className="border-warm-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                Product Gross Revenue
              </span>
              <div className="p-2 bg-emerald-50 text-emerald-700 border border-emerald-200">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-800 tracking-tight">
              {formatCurrency(data.totalProductRevenue)}
            </p>
            <p className="text-xs text-warm-textMuted mt-2 pt-2 border-t border-warm-border/50">
              Total sales across line items
            </p>
          </CardContent>
        </Card>

        {/* Tax Generated */}
        <Card className="border-warm-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                GST Tax Generated
              </span>
              <div className="p-2 bg-warm-accentLight text-warm-accent">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-warm-accent tracking-tight">
              {formatCurrency(data.totalTaxGenerated)}
            </p>
            <p className="text-xs text-warm-textMuted mt-2 pt-2 border-t border-warm-border/50">
              Output tax on products sold
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Products Revenue Comparison Bar Graph */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-warm-accentLight text-warm-accent">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                Product Gross Revenue Graph
              </h3>
              <p className="text-xs text-warm-textMuted">Top items ranked by sales volume</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportProducts}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export CSV
            </Button>
            <Link href="/products">
              <Button variant="ghost" size="sm" rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}>
                Catalog
              </Button>
            </Link>
          </div>
        </div>

        <CardContent className="p-5">
          <HorizontalBarChart data={topProductsBarData} maxItems={7} />
        </CardContent>
      </Card>

      {/* Top Selling Products / Services Performance Table */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
            Detailed Product Line-Item Performance
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-warm-input text-warm-text font-bold uppercase tracking-wider border-b border-warm-border/60">
              <tr>
                <th className="py-3 px-4"># Rank</th>
                <th className="py-3 px-4">Product / Item Description</th>
                <th className="py-3 px-4 text-center">Invoices</th>
                <th className="py-3 px-4 text-right">Quantity Sold</th>
                <th className="py-3 px-4 text-right">GST Generated</th>
                <th className="py-3 px-4 text-right">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-border/40">
              {data.topSelling.length > 0 ? (
                data.topSelling.map((p, idx) => (
                  <tr key={idx} className="hover:bg-warm-input/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-warm-accent">#{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-warm-text">{p.name}</td>
                    <td className="py-3 px-4 text-center text-warm-textMuted">
                      <span className="px-2 py-0.5 bg-warm-input border border-warm-border text-[11px] font-medium">
                        {p.invoiceCount} {p.invoiceCount === 1 ? 'bill' : 'bills'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-warm-text">
                      {p.quantity} {p.unit}
                    </td>
                    <td className="py-3 px-4 text-right text-warm-accent font-medium">
                      {formatCurrency(p.tax)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-800">
                      {formatCurrency(p.revenue)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-warm-textMuted">
                    No product billing records found.
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
