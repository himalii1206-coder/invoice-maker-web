'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { FileText, Plus } from 'lucide-react';

export default function InvoicesPage() {
  return (
    <DashboardLayout>
      <PageHeader
        title="Invoices"
        description="Create, manage, track, and issue GST compliant invoices for your business."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Invoices' }
        ]}
        actions={
          <Button leftIcon={<Plus className="w-4 h-4" />}>
            Create Invoice
          </Button>
        }
      />

      <EmptyState
        title="No invoices created yet"
        description="You haven't generated any invoices yet. Create your first professional invoice to start tracking payments."
        icon={<FileText className="w-6 h-6 text-warm-accent" />}
        actionLabel="Create First Invoice"
        onAction={() => {}}
      />
    </DashboardLayout>
  );
}
