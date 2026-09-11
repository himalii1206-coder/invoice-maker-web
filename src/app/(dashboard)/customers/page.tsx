'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Users, Plus } from 'lucide-react';

export default function CustomersPage() {
  return (
    <DashboardLayout>
      <PageHeader
        title="Customers"
        description="Manage client directory, business information, and invoice histories."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Customers' }
        ]}
        actions={
          <Button leftIcon={<Plus className="w-4 h-4" />}>
            Add Customer
          </Button>
        }
      />

      <EmptyState
        title="No customers added yet"
        description="Add client businesses or individuals to easily select them during invoice creation."
        icon={<Users className="w-6 h-6 text-warm-accent" />}
        actionLabel="Add First Customer"
        onAction={() => {}}
      />
    </DashboardLayout>
  );
}
