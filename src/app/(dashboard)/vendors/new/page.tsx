'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { VendorForm } from '@/components/vendors/VendorForm';

export default function NewVendorPage() {
  return (
    <DashboardLayout>
      <div className="py-2">
        <VendorForm isEditing={false} />
      </div>
    </DashboardLayout>
  );
}
