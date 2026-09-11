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
import { Building2, Mail, Phone, MapPin, Hash, Receipt } from 'lucide-react';

// Mirrors the server-side rules so mistakes surface before a round trip.
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PHONE_REGEX = /^[+]?[0-9\s\-()]{7,20}$/;

const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Customer name must be at least 2 characters')
    .max(150, 'Customer name must be at most 150 characters'),
  email: z.union([z.literal(''), z.string().email('Please enter a valid email address')]),
  phone: z.union([
    z.literal(''),
    z.string().regex(PHONE_REGEX, 'Please enter a valid phone number')
  ]),
  type: z.enum(['INDIVIDUAL', 'BUSINESS']),
  gstin: z.union([
    z.literal(''),
    z.string().regex(GSTIN_REGEX, 'GSTIN must look like 24AAACC1206D1ZM')
  ]),
  address: z.string().max(255, 'Address must be at most 255 characters'),
  city: z.string().max(100, 'City must be at most 100 characters'),
  state: z.string().max(100, 'State must be at most 100 characters'),
  country: z.string().max(100, 'Country must be at most 100 characters'),
  postalCode: z.string().max(20, 'Postal code must be at most 20 characters'),
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
  city: '',
  state: '',
  country: 'India',
  postalCode: '',
  isActive: 'true'
};

export interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Present in edit mode, absent when adding a new customer. */
  customer?: Customer | null;
  onSaved: () => void;
}

export function CustomerFormModal({
  isOpen,
  onClose,
  customer,
  onSaved
}: CustomerFormModalProps) {
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

  // Reload values whenever the modal opens so a previous edit never leaks in.
  useEffect(() => {
    if (!isOpen) return;

    reset(
      customer
        ? {
            name: customer.name ?? '',
            email: customer.email ?? '',
            phone: customer.phone ?? '',
            type: customer.type ?? 'BUSINESS',
            gstin: customer.gstin ?? '',
            address: customer.address ?? '',
            city: customer.city ?? '',
            state: customer.state ?? '',
            country: customer.country ?? 'India',
            postalCode: customer.postalCode ?? '',
            isActive: customer.isActive ? 'true' : 'false'
          }
        : EMPTY_FORM
    );
  }, [isOpen, customer, reset]);

  const onSubmit = async (values: CustomerFormData) => {
    const payload = {
      ...values,
      gstin: values.gstin ? values.gstin.toUpperCase() : '',
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

      // A duplicate email is the one server error worth pinning to its field.
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
      maxWidth="2xl"
      title={isEdit ? 'Edit Customer' : 'Add Customer'}
      description={
        isEdit
          ? 'Update contact, tax and address details for this client.'
          : 'Add a client to your business directory for faster invoicing.'
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Customer Name"
              required
              placeholder="Enter customer name"
              leftIcon={<Building2 className="w-4 h-4" />}
              error={errors.name?.message}
              {...register('name')}
            />
          </div>

          <Input
            label="Email"
            type="email"
            placeholder="Enter email address"
            leftIcon={<Mail className="w-4 h-4" />}
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Phone"
            placeholder="Enter phone number"
            leftIcon={<Phone className="w-4 h-4" />}
            error={errors.phone?.message}
            {...register('phone')}
          />

          <Select
            label="Customer Type"
            options={[
              { value: 'BUSINESS', label: 'Business' },
              { value: 'INDIVIDUAL', label: 'Individual' }
            ]}
            error={errors.type?.message}
            {...register('type')}
          />

          <Input
            label="GSTIN / Tax Number"
            placeholder="Enter GSTIN or tax number"
            className="uppercase"
            leftIcon={<Receipt className="w-4 h-4" />}
            error={errors.gstin?.message}
            helperText="Optional, for GST registered clients"
            {...register('gstin')}
          />

          <div className="sm:col-span-2">
            <Textarea
              label="Address"
              placeholder="Enter complete address"
              className="min-h-[70px]"
              error={errors.address?.message}
              {...register('address')}
            />
          </div>

          <Input
            label="City"
            placeholder="Enter city"
            leftIcon={<MapPin className="w-4 h-4" />}
            error={errors.city?.message}
            {...register('city')}
          />

          <Input
            label="State"
            placeholder="Enter state"
            error={errors.state?.message}
            {...register('state')}
          />

          <Input
            label="Country"
            placeholder="Enter country"
            error={errors.country?.message}
            {...register('country')}
          />

          <Input
            label="Postal Code"
            placeholder="Enter postal code"
            leftIcon={<Hash className="w-4 h-4" />}
            error={errors.postalCode?.message}
            {...register('postalCode')}
          />

          <div className="sm:col-span-2">
            <Select
              label="Status"
              options={[
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' }
              ]}
              error={errors.isActive?.message}
              helperText="Inactive customers stay on past invoices but are hidden from new ones"
              {...register('isActive')}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-warm-border/50">
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
