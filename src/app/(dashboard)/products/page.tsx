'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Package, Plus } from 'lucide-react';

export default function ProductsPage() {
  return (
    <DashboardLayout>
      <PageHeader
        title="Products & Services"
        description="Catalog of items, default pricing, HSN/SAC codes, and GST rates."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Products & Services' }
        ]}
        actions={
          <Button leftIcon={<Plus className="w-4 h-4" />}>
            Add Item
          </Button>
        }
      />

      <EmptyState
        title="No products or services cataloged"
        description="Add products or service items with preset prices and tax rates to speed up invoice drafting."
        icon={<Package className="w-6 h-6 text-warm-accent" />}
        actionLabel="Add Product/Service"
        onAction={() => {}}
      />
    </DashboardLayout>
  );
}
