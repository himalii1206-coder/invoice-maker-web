'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
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
  Truck
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

interface VendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor?: Vendor | null;
  onSuccess: (vendor: Vendor) => void;
}

export function VendorModal({ isOpen, onClose, vendor, onSuccess }: VendorModalProps) {
  const isEditing = Boolean(vendor);

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
      name: '',
      tradeName: '',
      contactPerson: '',
      email: '',
      phone: '',
      type: 'BUSINESS',
      gstin: '',
      pan: '',
      address: '',
      city: '',
      state: '24-Gujarat',
      country: 'India',
      postalCode: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      branch: '',
      openingBalance: 0,
      openingBalanceDate: '',
      balanceType: 'CR',
      paymentTerms: 'Net 30 Days',
      partyCategory: 'Raw Material Supplier',
      narration: '',
      isActive: true
    }
  });

  const selectedState = watch('state');
  const selectedCity = watch('city');

  useEffect(() => {
    if (vendor && isOpen) {
      reset({
        name: vendor.name,
        tradeName: vendor.tradeName ?? '',
        contactPerson: vendor.contactPerson ?? '',
        email: vendor.email ?? '',
        phone: vendor.phone ?? '',
        type: vendor.type,
        gstin: vendor.gstin ?? '',
        pan: vendor.pan ?? '',
        address: vendor.address ?? '',
        city: vendor.city ?? '',
        state: vendor.state ?? '24-Gujarat',
        country: vendor.country ?? 'India',
        postalCode: vendor.postalCode ?? '',
        bankName: vendor.bankName ?? '',
        accountNumber: vendor.accountNumber ?? '',
        ifscCode: vendor.ifscCode ?? '',
        branch: vendor.branch ?? '',
        openingBalance: vendor.openingBalance ? Number(vendor.openingBalance) : 0,
        openingBalanceDate: vendor.openingBalanceDate ? vendor.openingBalanceDate.split('T')[0] : '',
        balanceType: vendor.balanceType ?? 'CR',
        paymentTerms: vendor.paymentTerms ?? 'Net 30 Days',
        partyCategory: vendor.partyCategory ?? '',
        narration: vendor.narration ?? '',
        isActive: vendor.isActive
      });
    } else if (isOpen) {
      reset({
        name: '',
        tradeName: '',
        contactPerson: '',
        email: '',
        phone: '',
        type: 'BUSINESS',
        gstin: '',
        pan: '',
        address: '',
        city: '',
        state: '24-Gujarat',
        country: 'India',
        postalCode: '',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        branch: '',
        openingBalance: 0,
        openingBalanceDate: '',
        balanceType: 'CR',
        paymentTerms: 'Net 30 Days',
        partyCategory: 'Raw Material Supplier',
        narration: '',
        isActive: true
      });
    }
  }, [vendor, isOpen, reset]);

  const onSubmit = async (data: VendorFormData) => {
    try {
      let savedVendor: Vendor;
      if (isEditing && vendor) {
        savedVendor = await vendorsApi.update(vendor.id, data);
        toast.success('Vendor updated successfully');
      } else {
        savedVendor = await vendorsApi.create(data);
        toast.success('Vendor created successfully');
      }
      onSuccess(savedVendor);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save vendor');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Vendor / Supplier' : 'Add New Vendor / Supplier'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic & Statutory Section */}
        <div>
          <div className="flex items-center gap-2 pb-2 mb-3 border-b border-warm-border/60">
            <Truck className="w-4 h-4 text-warm-accent" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-warm-text">
              Vendor Identity & Statutory
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Vendor / Legal Business Name *"
                placeholder="Enter legal business name"
                leftIcon={<Building2 className="w-4 h-4" />}
                error={errors.name?.message}
                {...register('name')}
              />
            </div>

            <Input
              label="Trade Name"
              placeholder="Enter trade name"
              leftIcon={<Layers className="w-4 h-4" />}
              error={errors.tradeName?.message}
              {...register('tradeName')}
            />

            <Select
              label="Party Type *"
              options={[
                { value: 'BUSINESS', label: 'Business / GST Registered' },
                { value: 'INDIVIDUAL', label: 'Individual / Proprietor / Unregistered' }
              ]}
              error={errors.type?.message}
              {...register('type')}
            />

            <Input
              label="GSTIN (15 Digits)"
              placeholder="Enter 15-digit GSTIN"
              maxLength={15}
              leftIcon={<Building2 className="w-4 h-4" />}
              error={errors.gstin?.message}
              {...register('gstin')}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                setValue('gstin', val);
                if (val.length >= 2 && /^\d{2}/.test(val)) {
                  // Auto-extract PAN from GSTIN if 10 chars available
                  if (val.length >= 12) {
                    setValue('pan', val.substring(2, 12));
                  }
                }
              }}
            />

            <Input
              label="PAN Number"
              placeholder="Enter 10-digit PAN"
              maxLength={10}
              error={errors.pan?.message}
              {...register('pan')}
            />

            <Input
              label="Contact Person"
              placeholder="Enter contact person name"
              leftIcon={<User className="w-4 h-4" />}
              error={errors.contactPerson?.message}
              {...register('contactPerson')}
            />

            <Input
              label="Mobile / Phone Number *"
              placeholder="Enter mobile number"
              leftIcon={<Phone className="w-4 h-4" />}
              error={errors.phone?.message}
              {...register('phone')}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="Enter email address"
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email')}
            />
          </div>
        </div>

        {/* Address & Place of Supply */}
        <div>
          <div className="flex items-center gap-2 pb-2 mb-3 border-b border-warm-border/60">
            <MapPin className="w-4 h-4 text-warm-accent" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-warm-text">
              Dispatch & Location Details (For GST Input Credit)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <Input
                label="Vendor Dispatch / Billing Address *"
                placeholder="Enter street, plot no, and building address"
                leftIcon={<MapPin className="w-4 h-4" />}
                error={errors.address?.message}
                {...register('address')}
              />
            </div>

            <StateCityFields
              stateValue={selectedState || '24-Gujarat'}
              cityValue={selectedCity || ''}
              onStateChange={(st) => setValue('state', st, { shouldValidate: true })}
              onCityChange={(ct) => setValue('city', ct, { shouldValidate: true })}
              stateError={errors.state?.message}
              cityError={errors.city?.message}
              includePincode={false}
            />

            <Input
              label="PIN Code"
              placeholder="Enter 6-digit PIN code"
              maxLength={6}
              error={errors.postalCode?.message}
              {...register('postalCode')}
            />
          </div>
        </div>

        {/* Banking & Financial Terms */}
        <div>
          <div className="flex items-center gap-2 pb-2 mb-3 border-b border-warm-border/60">
            <Landmark className="w-4 h-4 text-warm-accent" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-warm-text">
              Banking & Commercial Terms
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              maxLength={11}
              error={errors.ifscCode?.message}
              {...register('ifscCode')}
              onChange={(e) => setValue('ifscCode', e.target.value.toUpperCase())}
            />

            <Input
              label="Branch"
              placeholder="Enter branch name"
              error={errors.branch?.message}
              {...register('branch')}
            />

            <Input
              label="Opening Balance (₹)"
              type="number"
              step="0.01"
              error={errors.openingBalance?.message}
              {...register('openingBalance')}
            />

            <Select
              label="Balance Type"
              options={[
                { value: 'CR', label: 'Credit (Payable to Vendor)' },
                { value: 'DR', label: 'Debit (Advance with Vendor)' }
              ]}
              error={errors.balanceType?.message}
              {...register('balanceType')}
            />

            <Input
              label="Opening Balance Date"
              type="date"
              error={errors.openingBalanceDate?.message}
              {...register('openingBalanceDate')}
            />

            <Select
              label="Payment Terms"
              options={[
                { value: 'Immediate', label: 'Immediate / Due on Receipt' },
                { value: 'Net 15 Days', label: 'Net 15 Days' },
                { value: 'Net 30 Days', label: 'Net 30 Days' },
                { value: 'Net 45 Days', label: 'Net 45 Days' },
                { value: 'Net 60 Days', label: 'Net 60 Days' },
                { value: 'Net 90 Days', label: 'Net 90 Days' }
              ]}
              error={errors.paymentTerms?.message}
              {...register('paymentTerms')}
            />
          </div>
        </div>

        {/* Remarks / Narration */}
        <div>
          <Textarea
            label="Internal Remarks / Notes"
            placeholder="Special supplier discount terms, preferred transporter, delivery conditions..."
            rows={2}
            error={errors.narration?.message}
            {...register('narration')}
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-warm-border/60">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Create Vendor'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
