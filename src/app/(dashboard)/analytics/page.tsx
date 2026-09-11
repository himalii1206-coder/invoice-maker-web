'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <DashboardLayout>
      <PageHeader
        title="Analytics & Reports"
        description="Revenue breakdown, invoice metrics, top client insights, and GST reports."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Analytics' }
        ]}
      />

      <EmptyState
        title="Analytics view ready"
        description="Comprehensive business charts and revenue trends will generate as invoices and payments are recorded."
        icon={<BarChart3 className="w-6 h-6 text-warm-accent" />}
      />
    </DashboardLayout>
  );
}
