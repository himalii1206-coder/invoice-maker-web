'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoadingState } from '@/components/ui/LoadingState';
import { QuotationForm } from '@/components/quotations/QuotationForm';
import { quotationsApi } from '@/lib/quotations';
import { apiErrorMessage } from '@/lib/customers';
import { Quotation } from '@/types/quotation';

export default function EditQuotationPage() {
  const params = useParams();
  const router = useRouter();
  const quotationId = params.id as string;

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!quotationId) return;

    quotationsApi
      .getById(quotationId)
      .then((data) => {
        if (data.status === 'CONVERTED') {
          toast.info('Converted quotations cannot be edited');
          router.push(`/quotations/${data.id}`);
          return;
        }
        setQuotation(data);
      })
      .catch((err) => {
        toast.error(apiErrorMessage(err, 'Failed to load quotation for editing'));
        router.push('/quotations');
      })
      .finally(() => setIsLoading(false));
  }, [quotationId, router]);

  if (isLoading || !quotation) {
    return (
      <DashboardLayout>
        <LoadingState message="Loading quotation for edit..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <QuotationForm quotation={quotation} />
    </DashboardLayout>
  );
}
