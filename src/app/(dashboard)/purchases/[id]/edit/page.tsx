'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoadingState } from '@/components/ui/LoadingState';
import { PurchaseBillForm } from '@/components/purchases/PurchaseBillForm';
import { purchaseBillsApi } from '@/lib/purchases';
import { PurchaseBill } from '@/types/purchase';

export default function EditPurchaseBillPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [bill, setBill] = useState<PurchaseBill | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    purchaseBillsApi
      .get(id)
      .then((data) => {
        setBill(data);
      })
      .catch((err: any) => {
        toast.error('Failed to load purchase bill');
        router.push('/purchases');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id, router]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <LoadingState message="Loading purchase bill..." />
      </DashboardLayout>
    );
  }

  if (!bill) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PurchaseBillForm initialBill={bill} isEditing />
      </div>
    </DashboardLayout>
  );
}
