'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { CustomerForm } from '@/components/customers/CustomerForm';

export default function NewCustomerPage() {
  return (
    <DashboardLayout>
      <PageHeader
        title="Add Customer"
        description="Register a new customer/party with complete ledger, contact, and address records."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Customers', href: '/customers' },
          { label: 'Add Customer' }
        ]}
      />

      <CustomerForm />
    </DashboardLayout>
  );
}
