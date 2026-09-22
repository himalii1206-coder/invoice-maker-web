'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { vendorsApi } from '@/lib/purchases';
import { Vendor } from '@/types/purchase';
import { StateCityFields } from '@/components/common/StateCityFields';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Landmark,
  CreditCard,
  Calendar,
  Layers,
  FileText,
  User,
  Truck,
  ArrowLeft,
  Save,
  CheckCircle2
} from 'lucide-react';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
const PHONE_REGEX = /^(\+91[\-\s]?)?[6-9]\d{9}$|^[0-9]{10}$/;
const ACCOUNT_NO_REGEX = /^[0-9]{9,18}$/;

const vendorSchema = z.object({
  name: z.string().trim().min(1, 'Vendor / Supplier Name is required').max(150),
  tradeName: z.string().trim().max(150).optional().or(z.literal('')),
  contactPerson: z.string().trim().max(150).optional().or(z.literal('')),
  email: z.union([z.literal(''), z.string().email('Please enter a valid email address')]),
  phone: z.string().trim().min(1, 'Phone / Mobile number is required').regex(PHONE_REGEX, 'Invalid mobile number (10 digits)'),
  type: z.enum(['INDIVIDUAL', 'BUSINESS']).default('BUSINESS'),
  gstin: z.union([
    z.literal(''),
    z.string().regex(GSTIN_REGEX, 'Invalid GSTIN format (15 characters, e.g. 24AAACC1206D1ZM)')
  ]),
  pan: z.string().trim().max(10).optional().or(z.literal('')),
  address: z.string().trim().min(1, 'Address is required').max(500),
  city: z.string().trim().min(1, 'City is required').max(100),
  state: z.string().trim().min(1, 'State is required').max(100),
  country: z.string().trim().default('India'),
  postalCode: z.union([
    z.literal(''),
    z.string().regex(PINCODE_REGEX, 'Invalid pincode (must be a 6-digit number)')
  ]),
  bankName: z.string().trim().max(150).optional().or(z.literal('')),
  accountNumber: z.union([
    z.literal(''),
    z.string().regex(ACCOUNT_NO_REGEX, 'Invalid account number (9-18 digits)')
  ]),
  ifscCode: z.union([
    z.literal(''),
    z.string().regex(IFSC_REGEX, 'Invalid IFSC code (e.g. HDFC0001234)')
  ]),
  branch: z.string().trim().max(100).optional().or(z.literal('')),
  openingBalance: z.coerce.number().optional().default(0),
  openingBalanceDate: z.string().optional().or(z.literal('')),
  balanceType: z.string().default('CR'),
  paymentTerms: z.string().trim().max(100).optional().or(z.literal('')),
  partyCategory: z.string().trim().max(100).optional().or(z.literal('')),
  narration: z.string().trim().max(500).optional().or(z.literal('')),
  isActive: z.boolean().default(true)
});

type VendorFormData = z.infer<typeof vendorSchema>;

interface VendorFormProps {
  initialData?: Vendor | null;
  isEditing?: boolean;
}

export function VendorForm({ initialData, isEditing = false }: VendorFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: initialData?.name ?? '',
      tradeName: initialData?.tradeName ?? '',
      contactPerson: initialData?.contactPerson ?? '',
      email: initialData?.email ?? '',
      phone: initialData?.phone ?? '',
      type: initialData?.type ?? 'BUSINESS',
      gstin: initialData?.gstin ?? '',
      pan: initialData?.pan ?? '',
      address: initialData?.address ?? '',
      city: initialData?.city ?? '',
      state: initialData?.state ?? '24-Gujarat',
      country: initialData?.country ?? 'India',
      postalCode: initialData?.postalCode ?? '',
      bankName: initialData?.bankName ?? '',
      accountNumber: initialData?.accountNumber ?? '',
      ifscCode: initialData?.ifscCode ?? '',
      branch: initialData?.branch ?? '',
      openingBalance: initialData?.openingBalance ? Number(initialData.openingBalance) : 0,
      openingBalanceDate: initialData?.openingBalanceDate ? initialData.openingBalanceDate.split('T')[0] : '',
      balanceType: initialData?.balanceType ?? 'CR',
      paymentTerms: initialData?.paymentTerms ?? 'Net 30 Days',
      partyCategory: initialData?.partyCategory ?? 'Raw Material Supplier',
      narration: initialData?.narration ?? '',
      isActive: initialData?.isActive ?? true
    }
  });

  const selectedState = watch('state');
  const selectedCity = watch('city');

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        tradeName: initialData.tradeName ?? '',
        contactPerson: initialData.contactPerson ?? '',
        email: initialData.email ?? '',
        phone: initialData.phone ?? '',
        type: initialData.type,
        gstin: initialData.gstin ?? '',
        pan: initialData.pan ?? '',
        address: initialData.address ?? '',
        city: initialData.city ?? '',
        state: initialData.state ?? '24-Gujarat',
        country: initialData.country ?? 'India',
        postalCode: initialData.postalCode ?? '',
        bankName: initialData.bankName ?? '',
        accountNumber: initialData.accountNumber ?? '',
        ifscCode: initialData.ifscCode ?? '',
        branch: initialData.branch ?? '',
        openingBalance: initialData.openingBalance ? Number(initialData.openingBalance) : 0,
        openingBalanceDate: initialData.openingBalanceDate ? initialData.openingBalanceDate.split('T')[0] : '',
        balanceType: initialData.balanceType ?? 'CR',
        paymentTerms: initialData.paymentTerms ?? 'Net 30 Days',
        partyCategory: initialData.partyCategory ?? 'Raw Material Supplier',
        narration: initialData.narration ?? '',
        isActive: initialData.isActive ?? true
      });
    }
  }, [initialData, reset]);

  const handleGstinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase();
    setValue('gstin', raw);
    // Auto extract PAN (chars 3 to 12)
    if (raw.length >= 12) {
      const extractedPan = raw.substring(2, 12);
      setValue('pan', extractedPan);
    }
  };

  const onSubmit = async (data: VendorFormData) => {
    try {
      if (isEditing && initialData) {
        await vendorsApi.update(initialData.id, data);
        toast.success('Vendor profile updated successfully');
      } else {
        await vendorsApi.create(data);
        toast.success('New vendor registered successfully');
      }
      router.push('/vendors');
      router.refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save vendor');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-warm-border/60 pb-4">
        <div>
          <Link
            href="/vendors"
            className="inline-flex items-center gap-1.5 text-xs text-warm-textMuted hover:text-warm-accent transition-colors mb-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Vendors Directory</span>
          </Link>
          <h1 className="text-xl font-bold text-warm-text">
            {isEditing ? `Edit Vendor: ${initialData?.name}` : 'Register New Vendor / Supplier'}
          </h1>
          <p className="text-xs text-warm-textMuted">
            Configure supplier profile, statutory GSTIN credentials, delivery location, and settlement banking.
          </p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <Link href="/vendors">
            <Button variant="outline" size="sm" type="button" disabled={isSubmitting}>
              Cancel
            </Button>
          </Link>
          <Button size="sm" type="submit" isLoading={isSubmitting} leftIcon={<Save className="w-4 h-4" />}>
            {isEditing ? 'Update Vendor Profile' : 'Save & Register Vendor'}
          </Button>
        </div>
      </div>

      {/* Primary & Statutory Credentials */}
      <Card>
        <CardHeader className="pb-3 border-b border-warm-border/40">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-warm-text">
            <Building2 className="w-4 h-4 text-warm-accent" />
            1. Supplier & Statutory GST Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Legal Vendor / Supplier Name"
              required
              placeholder="Enter legal business name"
              error={errors.name?.message}
              {...register('name')}
            />
          </div>

          <Input
            label="Trade / Brand Name"
            placeholder="Enter trade name"
            error={errors.tradeName?.message}
            {...register('tradeName')}
          />

          <Select
            label="Entity Type"
            options={[
              { value: 'BUSINESS', label: 'Registered Business (Company / Firm / LLP)' },
              { value: 'INDIVIDUAL', label: 'Individual / Proprietor / Freelancer' }
            ]}
            error={errors.type?.message}
            {...register('type')}
          />

          <Input
            label="GSTIN Number"
            placeholder="Enter 15-digit GSTIN"
            className="uppercase"
            error={errors.gstin?.message}
            {...register('gstin', { onChange: handleGstinChange })}
          />

          <Input
            label="PAN Card Number"
            placeholder="Enter 10-digit PAN"
            className="uppercase"
            error={errors.pan?.message}
            {...register('pan')}
          />

          <Input
            label="Party Category"
            placeholder="Enter supplier category"
            error={errors.partyCategory?.message}
            {...register('partyCategory')}
          />

          <Input
            label="Default Payment Terms"
            placeholder="Enter payment terms"
            error={errors.paymentTerms?.message}
            {...register('paymentTerms')}
          />
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader className="pb-3 border-b border-warm-border/40">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-warm-text">
            <Phone className="w-4 h-4 text-warm-accent" />
            2. Contact & Representative Details
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Contact Person Name"
            placeholder="Enter contact person name"
            leftIcon={<User className="w-4 h-4" />}
            error={errors.contactPerson?.message}
            {...register('contactPerson')}
          />

          <Input
            label="Mobile / Phone Number"
            required
            placeholder="Enter mobile number"
            leftIcon={<Phone className="w-4 h-4" />}
            error={errors.phone?.message}
            {...register('phone')}
          />

          <Input
            label="Official Email Address"
            placeholder="Enter email address"
            type="email"
            leftIcon={<Mail className="w-4 h-4" />}
            error={errors.email?.message}
            {...register('email')}
          />
        </CardContent>
      </Card>

      {/* Location & Tax Jurisdiction Address */}
      <Card>
        <CardHeader className="pb-3 border-b border-warm-border/40">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-warm-text">
            <MapPin className="w-4 h-4 text-warm-accent" />
            3. Factory & Billing Address (Place of Dispatch)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <Input
            label="Street Address / Factory Unit"
            required
            placeholder="Enter street address and building details"
            error={errors.address?.message}
            {...register('address')}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <StateCityFields
                stateValue={selectedState}
                cityValue={selectedCity}
                onStateChange={(st) => setValue('state', st, { shouldValidate: true })}
                onCityChange={(ct) => setValue('city', ct, { shouldValidate: true })}
                stateError={errors.state?.message}
                cityError={errors.city?.message}
                includePincode={false}
                required
              />
            </div>

            <Input
              label="Postal PIN Code"
              placeholder="Enter 6-digit PIN code"
              error={errors.postalCode?.message}
              {...register('postalCode')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Banking & Settlement Profile */}
      <Card>
        <CardHeader className="pb-3 border-b border-warm-border/40">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-warm-text">
            <Landmark className="w-4 h-4 text-warm-accent" />
            4. Banking & Remittance Account
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            label="Bank Name"
            placeholder="Enter bank name"
            leftIcon={<Landmark className="w-4 h-4" />}
            error={errors.bankName?.message}
            {...register('bankName')}
          />

          <Input
            label="Account Number"
            placeholder="Enter account number"
            leftIcon={<CreditCard className="w-4 h-4" />}
            error={errors.accountNumber?.message}
            {...register('accountNumber')}
          />

          <Input
            label="IFSC Code"
            placeholder="Enter IFSC code"
            className="uppercase"
            error={errors.ifscCode?.message}
            {...register('ifscCode')}
          />

          <Input
            label="Bank Branch"
            placeholder="Enter branch name"
            error={errors.branch?.message}
            {...register('branch')}
          />
        </CardContent>
      </Card>

      {/* Opening Balances & Accounting Notes */}
      <Card>
        <CardHeader className="pb-3 border-b border-warm-border/40">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-warm-text">
            <FileText className="w-4 h-4 text-warm-accent" />
            5. Opening Balance & Ledger Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Opening Balance Amount (₹)"
              type="number"
              step="any"
              placeholder="Enter opening balance"
              error={errors.openingBalance?.message}
              {...register('openingBalance')}
            />

            <Select
              label="Balance Type"
              options={[
                { value: 'CR', label: 'Credit / Payable (We owe the vendor)' },
                { value: 'DR', label: 'Debit / Advance (Vendor owes us / Prepayment)' }
              ]}
              error={errors.balanceType?.message}
              {...register('balanceType')}
            />

            <Input
              label="Opening Date"
              type="date"
              error={errors.openingBalanceDate?.message}
              {...register('openingBalanceDate')}
            />
          </div>

          <Textarea
            label="Vendor Notes & Delivery Remarks"
            rows={3}
            placeholder="Enter special supplier terms, preferred transporter details, delivery guidelines, or internal notes..."
            error={errors.narration?.message}
            {...register('narration')}
          />

          <div className="pt-2 flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              className="w-4 h-4 accent-warm-accent cursor-pointer rounded-none"
              {...register('isActive')}
            />
            <label htmlFor="isActive" className="text-xs font-semibold text-warm-text cursor-pointer select-none">
              Active Vendor (Supplier is enabled for issuing new Purchase Bills)
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Sticky Action Bar */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-warm-border/60">
        <Link href="/vendors">
          <Button variant="outline" type="button" disabled={isSubmitting}>
            Cancel & Return
          </Button>
        </Link>
        <Button type="submit" isLoading={isSubmitting} leftIcon={<Save className="w-4 h-4" />}>
          {isEditing ? 'Update Vendor Profile' : 'Save & Register Vendor'}
        </Button>
      </div>
    </form>
  );
}
