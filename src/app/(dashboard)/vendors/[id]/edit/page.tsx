'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { VendorForm } from '@/components/vendors/VendorForm';
import { LoadingState } from '@/components/ui/LoadingState';
import { vendorsApi } from '@/lib/purchases';
import { Vendor } from '@/types/purchase';

export default function EditVendorPage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params?.id as string;

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!vendorId) return;

    const fetchVendor = async () => {
      try {
        setIsLoading(true);
        const data = await vendorsApi.get(vendorId);
        setVendor(data);
      } catch (err: any) {
        toast.error('Failed to load vendor details');
        router.push('/vendors');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVendor();
  }, [vendorId, router]);

  return (
    <DashboardLayout>
      <div className="py-2">
        {isLoading ? (
          <div className="py-20">
            <LoadingState message="Loading vendor profile..." />
          </div>
        ) : vendor ? (
          <VendorForm initialData={vendor} isEditing={true} />
        ) : null}
      </div>
    </DashboardLayout>
  );
}
