'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PurchaseBillForm } from '@/components/purchases/PurchaseBillForm';

export default function NewPurchaseBillPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PurchaseBillForm />
      </div>
    </DashboardLayout>
  );
}
