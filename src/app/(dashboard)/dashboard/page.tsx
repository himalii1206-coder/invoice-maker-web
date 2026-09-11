'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';
import {
  FileText,
  Users,
  Package,
  Plus,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight
} from 'lucide-react';

export default function DashboardPage() {
  const { user, company } = useAuth();
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    outstandingAmount: 0
  });
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);

  useEffect(() => {
    // In future phases, fetch metrics & recent invoices dynamically from API
    // Currently initialized to real zero/empty state
  }, []);

  return (
    <DashboardLayout>
      <PageHeader
        title={`Welcome back, ${user?.firstName || 'Owner'}!`}
        description={`Overview of ${company?.name || 'your business'} operations and billing.`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/invoices">
              <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                Create Invoice
              </Button>
            </Link>
          </div>
        }
      />

      {/* Quick Action Buttons */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 mb-6 no-scrollbar">
        <Link href="/invoices">
          <Button variant="secondary" size="sm" leftIcon={<FileText className="w-4 h-4 text-warm-accent" />}>
            + Create Invoice
          </Button>
        </Link>
        <Link href="/customers">
          <Button variant="secondary" size="sm" leftIcon={<Users className="w-4 h-4 text-warm-accent" />}>
            + Add Customer
          </Button>
        </Link>
        <Link href="/products">
          <Button variant="secondary" size="sm" leftIcon={<Package className="w-4 h-4 text-warm-accent" />}>
            + Add Product / Service
          </Button>
        </Link>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-none">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-warm-text tracking-tight">
              {formatCurrency(metrics.totalRevenue)}
            </p>
            <p className="text-[11px] text-warm-textMuted font-medium mt-1">
              Recorded revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Paid Invoices</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-none">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-warm-text tracking-tight">
              {metrics.paidInvoices} <span className="text-xs font-medium text-warm-textMuted">/ {metrics.totalInvoices}</span>
            </p>
            <p className="text-[11px] text-warm-textMuted font-medium mt-1">
              Collected invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Outstanding Amount</span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-none">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-warm-text tracking-tight">
              {formatCurrency(metrics.outstandingAmount)}
            </p>
            <p className="text-[11px] text-amber-700 font-medium mt-1">
              {metrics.pendingInvoices} pending invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Overdue Invoices</span>
              <div className="p-2 bg-red-50 text-red-600 rounded-none">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-warm-text tracking-tight">
              {metrics.overdueInvoices}
            </p>
            <p className="text-[11px] text-warm-textMuted font-medium mt-1">
              Overdue balances
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid: Recent Invoices & Company Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-warm-text">Recent Invoices</h3>
              <p className="text-xs text-warm-textMuted">Latest billing documents generated</p>
            </div>
            <Link href="/invoices">
              <Button variant="ghost" size="sm" rightIcon={<ArrowUpRight className="w-4 h-4" />}>
                View All
              </Button>
            </Link>
          </div>

          {recentInvoices.length > 0 ? (
            <div className="divide-y divide-warm-border/40">
              {/* Dynamic list rendering */}
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                title="No invoices generated yet"
                description="Click 'Create Invoice' to draft your first invoice."
                icon={<FileText className="w-6 h-6 text-warm-accent" />}
              />
            </div>
          )}
        </Card>

        {/* Business Overview Card */}
        <Card>
          <div className="p-5 border-b border-warm-border/50">
            <h3 className="text-base font-bold text-warm-text">Company Profile</h3>
            <p className="text-xs text-warm-textMuted">Active business settings</p>
          </div>
          <CardContent className="space-y-4 text-xs">
            <div className="p-3.5 bg-warm-input/60 space-y-2 rounded-none">
              <div className="flex justify-between">
                <span className="text-warm-textMuted">Business Name:</span>
                <span className="font-bold text-warm-text">{company?.name || 'Not configured'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-warm-textMuted">GSTIN:</span>
                <span className="font-mono font-semibold text-warm-text">{company?.gstin || 'Unregistered'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-warm-textMuted">Invoice Prefix:</span>
                <span className="font-mono font-semibold text-warm-accent">{company?.invoicePrefix || 'INV-'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
