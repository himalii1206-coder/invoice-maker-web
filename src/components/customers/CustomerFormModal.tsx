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
import { customersApi, apiErrorMessage } from '@/lib/customers';
import { Customer } from '@/types/index';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Hash,
  Receipt,
  User,
  PhoneCall,
  Landmark,
  CreditCard,
  Calendar,
  Layers,
  FileText,
  BadgePercent
} from 'lucide-react';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
const PHONE_REGEX = /^(\+91[\-\s]?)?[6-9]\d{9}$|^[0-9]{10}$/;
const ACCOUNT_NO_REGEX = /^[0-9]{9,18}$/;

const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Account Head is required')
    .max(150, 'Account Head must be at most 150 characters'),
  email: z.union([z.literal(''), z.string().email('Please enter a valid email address')]),
  phone: z
    .string()
    .trim()
    .min(1, 'Mobile number is required')
    .regex(PHONE_REGEX, 'Invalid mobile number (must be a valid 10-digit number)'),
  type: z.enum(['INDIVIDUAL', 'BUSINESS']).optional(),
  gstin: z.union([
    z.literal(''),
    z.string().regex(GSTIN_REGEX, 'Invalid GSTIN format (15 characters, e.g. 24AAACC1206D1ZM)')
  ]),
  address: z
    .string()
    .trim()
    .min(1, 'Billing address is required')
    .max(500, 'Billing address must be at most 500 characters'),
  factoryAddress: z
    .string()
    .trim()
    .min(1, 'Factory address is required')
    .max(500, 'Factory address must be at most 500 characters'),
  city: z
    .string()
    .trim()
    .min(1, 'City is required')
    .max(100, 'City must be at most 100 characters'),
  state: z
    .string()
    .trim()
    .min(1, 'State is required')
    .max(100, 'State must be at most 100 characters'),
  country: z.string().max(100, 'Country must be at most 100 characters').optional(),
  postalCode: z.union([
    z.literal(''),
    z.string().regex(PINCODE_REGEX, 'Invalid pincode (must be a 6-digit number)')
  ]),
  officeNo: z.string().max(30, 'Office number must be at most 30 characters').optional(),
  contactPerson: z.string().max(150, 'Contact person must be at most 150 characters').optional(),
  accountGroup: z.string().optional(),
  openingBalance: z.union([z.number(), z.string()]).optional(),
  openingBalanceDate: z.string().optional(),
  balanceType: z.string().optional(),
  partyCategory: z.string().optional(),
  narration1: z.string().max(255, 'Narration 1 must be at most 255 characters').optional(),
  narration2: z.string().max(255, 'Narration 2 must be at most 255 characters').optional(),
  bankName: z.string().max(150, 'Bank name must be at most 150 characters').optional(),
  accountNumber: z.union([
    z.literal(''),
    z.string().regex(ACCOUNT_NO_REGEX, 'Invalid account number (must be 9 to 18 digits)')
  ]),
  ifscCode: z.union([
    z.literal(''),
    z.string().regex(IFSC_REGEX, 'Invalid IFSC code format (11 characters, e.g. HDFC0001234)')
  ]),
  isActive: z.enum(['true', 'false'])
});

type CustomerFormData = z.infer<typeof customerSchema>;

const EMPTY_FORM: CustomerFormData = {
  name: '',
  email: '',
  phone: '',
  type: 'BUSINESS',
  gstin: '',
  address: '',
  factoryAddress: '',
  city: '',
  state: '',
  country: 'India',
  postalCode: '',
  officeNo: '',
  contactPerson: '',
  accountGroup: 'Sales',
  openingBalance: '0',
  openingBalanceDate: '',
  balanceType: 'Dr.',
  partyCategory: 'Wholesaler',
  narration1: '',
  narration2: '',
  bankName: '',
  accountNumber: '',
  ifscCode: '',
  isActive: 'true'
};

export interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  onSaved: () => void;
}

export function CustomerFormModal({ isOpen, onClose, customer, onSaved }: CustomerFormModalProps) {
  const isEdit = Boolean(customer);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting }
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: EMPTY_FORM
  });

  useEffect(() => {
    if (!isOpen) return;

    if (customer) {
      const formattedDate = customer.openingBalanceDate
        ? new Date(customer.openingBalanceDate).toISOString().slice(0, 10)
        : '';

      reset({
        name: customer.name ?? '',
        email: customer.email ?? '',
        phone: customer.phone ?? '',
        type: customer.type ?? 'BUSINESS',
        gstin: customer.gstin ?? '',
        address: customer.address ?? '',
        factoryAddress: customer.factoryAddress ?? '',
        city: customer.city ?? '',
        state: customer.state ?? '',
        country: customer.country ?? 'India',
        postalCode: customer.postalCode ?? '',
        officeNo: customer.officeNo ?? '',
        contactPerson: customer.contactPerson ?? '',
        accountGroup: customer.accountGroup ?? 'Sales',
        openingBalance:
          customer.openingBalance !== undefined && customer.openingBalance !== null
            ? String(customer.openingBalance)
            : '0',
        openingBalanceDate: formattedDate,
        balanceType: customer.balanceType ?? 'Dr.',
        partyCategory: customer.partyCategory ?? 'Wholesaler',
        narration1: customer.narration1 ?? '',
        narration2: customer.narration2 ?? '',
        bankName: customer.bankName ?? '',
        accountNumber: customer.accountNumber ?? '',
        ifscCode: customer.ifscCode ?? '',
        isActive: customer.isActive ? 'true' : 'false'
      });
    } else {
      reset(EMPTY_FORM);
    }
  }, [isOpen, customer, reset]);

  const onSubmit = async (values: CustomerFormData) => {
    const payload = {
      ...values,
      gstin: values.gstin ? values.gstin.trim().toUpperCase() : undefined,
      ifscCode: values.ifscCode ? values.ifscCode.trim().toUpperCase() : undefined,
      postalCode: values.postalCode ? values.postalCode.trim() : undefined,
      accountNumber: values.accountNumber ? values.accountNumber.trim() : undefined,
      openingBalance:
        values.openingBalance !== '' && values.openingBalance !== undefined
          ? parseFloat(String(values.openingBalance)) || 0
          : 0,
      openingBalanceDate: values.openingBalanceDate || undefined,
      isActive: values.isActive === 'true'
    };

    try {
      if (isEdit && customer) {
        await customersApi.update(customer.id, payload);
        toast.success('Customer updated successfully');
      } else {
        await customersApi.create(payload);
        toast.success('Customer added successfully');
      }
      onSaved();
      onClose();
    } catch (error: any) {
      const message = apiErrorMessage(error, 'Could not save customer');

      if (error?.response?.status === 409 && /email/i.test(message)) {
        setError('email', { type: 'server', message });
      }
      toast.error(message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="3xl"
      title={isEdit ? 'Edit Customer' : 'Add Customer'}
      description={
        isEdit
          ? 'Update account head, contact details, address, accounting, and banking records.'
          : 'Register a new customer/party with complete ledger, contact, and address information.'
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-h-[75vh] overflow-y-auto px-1 pr-2">
        {/* Section 1: Account Head & Basic Info */}
        <div className="bg-warm-surface/80 border border-warm-border/70 p-4 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-warm-border/50 text-xs font-bold uppercase tracking-wider text-warm-accent">
            <Building2 className="w-4 h-4" />
            <span>Account Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Account Head"
                required
                placeholder="Enter account head"
                leftIcon={<Building2 className="w-4 h-4" />}
                error={errors.name?.message}
                {...register('name')}
              />
            </div>

            <Select
              label="Account Group"
              options={[
                { value: 'Sales', label: 'Sales' },
                { value: 'Purchase', label: 'Purchase' },
                { value: 'Sundry Debtors', label: 'Sundry Debtors' },
                { value: 'Sundry Creditors', label: 'Sundry Creditors' },
                { value: 'Customers', label: 'Customers' },
                { value: 'Distributors', label: 'Distributors' },
                { value: 'Retailers', label: 'Retailers' },
                { value: 'Branch / Division', label: 'Branch / Division' },
                { value: 'Other', label: 'Other' }
              ]}
              error={errors.accountGroup?.message}
              {...register('accountGroup')}
            />

            <Select
              label="Party Category"
              options={[
                { value: 'Wholesaler', label: 'Wholesaler' },
                { value: 'Retailer', label: 'Retailer' },
                { value: 'Manufacturer', label: 'Manufacturer' },
                { value: 'Trader', label: 'Trader' },
                { value: 'Distributor', label: 'Distributor' },
                { value: 'Service Provider', label: 'Service Provider' },
                { value: 'End Consumer', label: 'End Consumer' },
                { value: 'Other', label: 'Other' }
              ]}
              error={errors.partyCategory?.message}
              {...register('partyCategory')}
            />

            <Select
              label="Status"
              options={[
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' }
              ]}
              error={errors.isActive?.message}
              {...register('isActive')}
            />
          </div>
        </div>

        {/* Section 2: Contact Information */}
        <div className="bg-warm-surface/80 border border-warm-border/70 p-4 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-warm-border/50 text-xs font-bold uppercase tracking-wider text-warm-accent">
            <Phone className="w-4 h-4" />
            <span>Contact Information</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Mob No."
              required
              placeholder="Enter mobile number"
              leftIcon={<Phone className="w-4 h-4" />}
              error={errors.phone?.message}
              {...register('phone')}
            />

            <Input
              label="Email ID"
              type="email"
              placeholder="Enter email ID"
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Contact Person"
              placeholder="Enter contact person name"
              leftIcon={<User className="w-4 h-4" />}
              error={errors.contactPerson?.message}
              {...register('contactPerson')}
            />

            <Input
              label="Office No."
              placeholder="Enter office number"
              leftIcon={<PhoneCall className="w-4 h-4" />}
              error={errors.officeNo?.message}
              {...register('officeNo')}
            />
          </div>
        </div>

        {/* Section 3: Addresses */}
        <div className="bg-warm-surface/80 border border-warm-border/70 p-4 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-warm-border/50 text-xs font-bold uppercase tracking-wider text-warm-accent">
            <MapPin className="w-4 h-4" />
            <span>Address Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Textarea
                label="Billing Address"
                required
                placeholder="Enter billing address"
                className="min-h-[65px]"
                error={errors.address?.message}
                {...register('address')}
              />
            </div>

            <div className="sm:col-span-2">
              <Textarea
                label="Factory Address"
                required
                placeholder="Enter factory address"
                className="min-h-[65px]"
                error={errors.factoryAddress?.message}
                {...register('factoryAddress')}
              />
            </div>

            <Input
              label="City"
              required
              placeholder="Enter city"
              leftIcon={<MapPin className="w-4 h-4" />}
              error={errors.city?.message}
              {...register('city')}
            />

            <Input
              label="State"
              required
              placeholder="Enter state"
              error={errors.state?.message}
              {...register('state')}
            />

            <Input
              label="Pincode"
              placeholder="Enter pincode"
              leftIcon={<Hash className="w-4 h-4" />}
              error={errors.postalCode?.message}
              {...register('postalCode')}
            />

            <Input
              label="Country"
              placeholder="Enter country"
              error={errors.country?.message}
              {...register('country')}
            />
          </div>
        </div>

        {/* Section 4: Opening Balance & Ledger Info */}
        <div className="bg-warm-surface/80 border border-warm-border/70 p-4 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-warm-border/50 text-xs font-bold uppercase tracking-wider text-warm-accent">
            <Layers className="w-4 h-4" />
            <span>Opening Balance & Ledger Info</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Opening Balance"
              type="number"
              step="0.01"
              placeholder="Enter opening balance"
              leftIcon={<BadgePercent className="w-4 h-4" />}
              error={errors.openingBalance?.message}
              {...register('openingBalance')}
            />

            <Input
              label="Date"
              type="date"
              leftIcon={<Calendar className="w-4 h-4" />}
              error={errors.openingBalanceDate?.message}
              {...register('openingBalanceDate')}
            />

            <Select
              label="Dr. / Cr."
              options={[
                { value: 'Dr.', label: 'Dr. (Debit / Receivable)' },
                { value: 'Cr.', label: 'Cr. (Credit / Payable)' }
              ]}
              error={errors.balanceType?.message}
              {...register('balanceType')}
            />

            <div className="sm:col-span-3">
              <Input
                label="Narration 1"
                placeholder="Enter narration 1"
                leftIcon={<FileText className="w-4 h-4" />}
                error={errors.narration1?.message}
                {...register('narration1')}
              />
            </div>

            <div className="sm:col-span-3">
              <Input
                label="Narration 2"
                placeholder="Enter narration 2"
                leftIcon={<FileText className="w-4 h-4" />}
                error={errors.narration2?.message}
                {...register('narration2')}
              />
            </div>
          </div>
        </div>

        {/* Section 5: Bank & Tax Information */}
        <div className="bg-warm-surface/80 border border-warm-border/70 p-4 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-warm-border/50 text-xs font-bold uppercase tracking-wider text-warm-accent">
            <Landmark className="w-4 h-4" />
            <span>Bank & Tax Information</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="GSTIN No"
                placeholder="Enter GSTIN number"
                className="uppercase font-mono"
                leftIcon={<Receipt className="w-4 h-4" />}
                error={errors.gstin?.message}
                helperText="Optional, 15-digit GSTIN for registered clients"
                {...register('gstin')}
              />
            </div>

            <Input
              label="Bank Name"
              placeholder="Enter bank name"
              leftIcon={<Landmark className="w-4 h-4" />}
              error={errors.bankName?.message}
              {...register('bankName')}
            />

            <Input
              label="Acc No"
              placeholder="Enter account number"
              leftIcon={<CreditCard className="w-4 h-4" />}
              error={errors.accountNumber?.message}
              {...register('accountNumber')}
            />

            <Input
              label="IFSC Code"
              placeholder="Enter IFSC code"
              className="uppercase font-mono"
              error={errors.ifscCode?.message}
              {...register('ifscCode')}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-warm-border/50 sticky bottom-0 bg-warm-surface py-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEdit ? 'Save Changes' : 'Add Customer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
