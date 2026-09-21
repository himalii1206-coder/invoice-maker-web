'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { CustomerForm } from '@/components/customers/CustomerForm';
import { customersApi, apiErrorMessage } from '@/lib/customers';
import { Customer } from '@/types/index';
import { Users } from 'lucide-react';

export default function EditCustomerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const customerId = params?.id;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!customerId) return;

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const data = await customersApi.getById(customerId);
        if (!cancelled) setCustomer(data);
      } catch (error) {
        if (!cancelled) {
          toast.error(apiErrorMessage(error, 'Could not load customer'));
          setNotFound(true);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="bg-warm-surface border border-warm-border/60 shadow-warm">
          <LoadingState message="Loading customer..." />
        </div>
      </DashboardLayout>
    );
  }

  if (notFound || !customer) {
    return (
      <DashboardLayout>
        <EmptyState
          title="Customer not found"
          description="This customer may have been deleted, or belongs to another business."
          icon={<Users className="w-6 h-6 text-warm-accent" />}
          actionLabel="Back to Customers"
          onAction={() => router.push('/customers')}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title={`Edit ${customer.name}`}
        description="Update contact, address, opening balance, and tax details for this client."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Customers', href: '/customers' },
          { label: customer.name, href: `/customers/${customer.id}` },
          { label: 'Edit' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Badge status={customer.isActive ? 'ACTIVE' : 'INACTIVE'} />
          </div>
        }
      />

      <CustomerForm customer={customer} />
    </DashboardLayout>
  );
}
