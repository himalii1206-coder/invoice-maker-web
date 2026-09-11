'use client';

import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { CustomerSelect } from '@/components/customers/CustomerSelect';
import { productsApi, toNumber } from '@/lib/products';
import { apiErrorMessage } from '@/lib/customers';
import { Product } from '@/types/index';
import { Package, IndianRupee, Hash, Barcode, Percent } from 'lucide-react';

// Mirrors the server-side rules so mistakes surface before a round trip.
const HSN_REGEX = /^[0-9]{4,8}$/;

const productSchema = z.object({
  customerId: z.string().uuid('Please select a customer'),
  name: z
    .string()
    .trim()
    .min(2, 'Product name must be at least 2 characters')
    .max(150, 'Product name must be at most 150 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters'),
  sku: z.string().max(50, 'SKU must be at most 50 characters'),
  price: z.coerce
    .number({ invalid_type_error: 'Price must be a number' })
    .min(0, 'Price cannot be negative')
    .max(99999999.99, 'Price is too large'),
  unit: z.string().trim().min(1, 'Unit is required').max(20, 'Unit must be at most 20 characters'),
  taxRate: z.coerce
    .number({ invalid_type_error: 'Tax rate must be a number' })
    .min(0, 'Tax rate cannot be negative')
    .max(100, 'Tax rate cannot exceed 100'),
  hsnSacCode: z.union([
    z.literal(''),
    z.string().regex(HSN_REGEX, 'HSN/SAC code must be 4 to 8 digits')
  ]),
  isActive: z.enum(['true', 'false'])
});

type ProductFormData = z.infer<typeof productSchema>;

const UNIT_OPTIONS = [
  'PCS',
  'KG',
  'GM',
  'LTR',
  'MTR',
  'BOX',
  'SET',
  'HOUR',
  'DAY',
  'MONTH',
  'YEAR',
  'SERVICE'
].map((u) => ({ value: u, label: u }));

const EMPTY_FORM: ProductFormData = {
  customerId: '',
  name: '',
  description: '',
  sku: '',
  price: 0,
  unit: 'PCS',
  taxRate: 18,
  hsnSacCode: '',
  isActive: 'true'
};

export interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Present in edit mode, absent when adding a new product. */
  product?: Product | null;
  onSaved: () => void;
}

export function ProductFormModal({ isOpen, onClose, product, onSaved }: ProductFormModalProps) {
  const isEdit = Boolean(product);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setError,
    formState: { errors, isSubmitting }
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: EMPTY_FORM
  });

  // Reload values whenever the modal opens so a previous edit never leaks in.
  useEffect(() => {
    if (!isOpen) return;

    reset(
      product
        ? {
            customerId: product.customerId ?? '',
            name: product.name ?? '',
            description: product.description ?? '',
            sku: product.sku ?? '',
            price: toNumber(product.price),
            unit: product.unit ?? 'PCS',
            taxRate: toNumber(product.taxRate),
            hsnSacCode: product.hsnSacCode ?? '',
            isActive: product.isActive ? 'true' : 'false'
          }
        : EMPTY_FORM
    );
  }, [isOpen, product, reset]);

  const price = watch('price');
  const taxRate = watch('taxRate');
  const taxAmount = (toNumber(price) * toNumber(taxRate)) / 100;
  const grossTotal = toNumber(price) + taxAmount;

  const onSubmit = async (values: ProductFormData) => {
    const payload = {
      ...values,
      isActive: values.isActive === 'true'
    };

    try {
      if (isEdit && product) {
        await productsApi.update(product.id, payload);
        toast.success('Product updated successfully');
      } else {
        await productsApi.create(payload);
        toast.success('Product added successfully');
      }
      onSaved();
      onClose();
    } catch (error: any) {
      const message = apiErrorMessage(error, 'Could not save product');

      // A duplicate SKU is the one server error worth pinning to its field.
      if (error?.response?.status === 409 && /sku/i.test(message)) {
        setError('sku', { type: 'server', message });
      }
      toast.error(message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title={isEdit ? 'Edit Product / Service' : 'Add Product / Service'}
      description={
        isEdit
          ? 'Update pricing, tax and catalog details for this item.'
          : 'Add an item with preset pricing to speed up invoice drafting.'
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Controller
              control={control}
              name="customerId"
              render={({ field }) => (
                <CustomerSelect
                  label="Customer / Business"
                  required
                  value={field.value}
                  onChange={(id) => field.onChange(id)}
                  initialLabel={product?.customer?.name}
                  error={errors.customerId?.message}
                  helperText="Search by name, email, phone or GSTIN"
                />
              )}
            />
          </div>

          <div className="sm:col-span-2">
            <Input
              label="Product / Service Name"
              required
              placeholder="Enter product or service name"
              leftIcon={<Package className="w-4 h-4" />}
              error={errors.name?.message}
              {...register('name')}
            />
          </div>

          <Input
            label="Price"
            type="number"
            step="0.01"
            min="0"
            required
            placeholder="0.00"
            leftIcon={<IndianRupee className="w-4 h-4" />}
            error={errors.price?.message}
            {...register('price')}
          />

          <Select
            label="Unit"
            options={UNIT_OPTIONS}
            error={errors.unit?.message}
            {...register('unit')}
          />

          <Input
            label="Tax Rate (%)"
            type="number"
            step="0.01"
            min="0"
            max="100"
            placeholder="18"
            leftIcon={<Percent className="w-4 h-4" />}
            error={errors.taxRate?.message}
            {...register('taxRate')}
          />

          <Input
            label="HSN / SAC Code"
            placeholder="Enter 4 to 8 digit code"
            leftIcon={<Hash className="w-4 h-4" />}
            error={errors.hsnSacCode?.message}
            helperText="Optional, required for GST invoices"
            {...register('hsnSacCode')}
          />

          <Input
            label="SKU"
            placeholder="Enter stock keeping unit"
            leftIcon={<Barcode className="w-4 h-4" />}
            error={errors.sku?.message}
            helperText="Optional, must be unique in your business"
            {...register('sku')}
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

          <div className="sm:col-span-2">
            <Textarea
              label="Description"
              placeholder="Enter an optional description"
              className="min-h-[70px]"
              error={errors.description?.message}
              helperText="Optional, shown on the invoice line item"
              {...register('description')}
            />
          </div>
        </div>

        {/* Live preview so the tax rate's effect is obvious before saving. */}
        <div className="bg-warm-input border border-warm-border/60 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-warm-textMuted">
            Price incl. tax
          </span>
          <span className="text-sm text-warm-text">
            ₹{toNumber(price).toFixed(2)} + ₹{taxAmount.toFixed(2)} tax ={' '}
            <span className="font-semibold">₹{grossTotal.toFixed(2)}</span>
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-warm-border/50">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEdit ? 'Save Changes' : 'Add Product'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
