'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { InvoiceForm } from '@/components/invoices/InvoiceForm';

export default function NewInvoicePage() {
  return (
    <DashboardLayout>
      <PageHeader
        title="Create Invoice"
        description="Pick a customer, add line items, and GST is calculated as you type."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Invoices', href: '/invoices' },
          { label: 'New Invoice' }
        ]}
      />

      <InvoiceForm />
    </DashboardLayout>
  );
}
