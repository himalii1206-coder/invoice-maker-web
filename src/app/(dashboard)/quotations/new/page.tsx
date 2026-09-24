'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { QuotationForm } from '@/components/quotations/QuotationForm';

export default function NewQuotationPage() {
  return (
    <DashboardLayout>
      <QuotationForm />
    </DashboardLayout>
  );
}
