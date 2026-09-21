'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { productsApi, toNumber } from '@/lib/products';
import { apiErrorMessage } from '@/lib/customers';
import { Product } from '@/types/index';
import { Package, IndianRupee, Hash, Barcode, Tag } from 'lucide-react';

const HSN_REGEX = /^[0-9]{4,8}$/;

const productSchema = z.object({
  category: z.string().max(100, 'Category must be at most 100 characters').optional(),
  productCode: z.string().max(50, 'Product code must be at most 50 characters').optional(),
  name: z
    .string()
    .trim()
    .min(1, 'Product name is required')
    .max(150, 'Product name must be at most 150 characters'),
  unit: z.string().trim().min(1, 'Unit is required').max(20, 'Unit must be at most 20 characters'),
  hsnSacCode: z.union([
    z.literal(''),
    z.string().regex(HSN_REGEX, 'HSN code must be 4 to 8 digits')
  ]),
  price: z.coerce
    .number({ invalid_type_error: 'Price must be a number' })
    .min(0, 'Price cannot be negative')
    .max(99999999.99, 'Price is too large')
});

type ProductFormData = z.infer<typeof productSchema>;

const UNIT_OPTIONS = [
  { value: 'PCS', label: 'PCS' },
  { value: 'NOS', label: 'NOS' },
  { value: 'KG', label: 'KG' },
  { value: 'GM', label: 'GM' },
  { value: 'LTR', label: 'LTR' },
  { value: 'MTR', label: 'MTR' },
  { value: 'BOX', label: 'BOX' },
  { value: 'SET', label: 'SET' },
  { value: 'BUNDLE', label: 'BUNDLE' },
  { value: 'PAIR', label: 'PAIR' },
  { value: 'DOZEN', label: 'DOZEN' },
  { value: 'TON', label: 'TON' },
  { value: 'HOUR', label: 'HOUR' },
  { value: 'DAY', label: 'DAY' },
  { value: 'MONTH', label: 'MONTH' },
  { value: 'SERVICE', label: 'SERVICE' }
];

const CATEGORY_OPTIONS = [
  { value: 'General', label: 'General' },
  { value: 'Raw Material', label: 'Raw Material' },
  { value: 'Finished Goods', label: 'Finished Goods' },
  { value: 'Packaging', label: 'Packaging' },
  { value: 'Electronics', label: 'Electronics' },
  { value: 'Hardware', label: 'Hardware' },
  { value: 'Textiles', label: 'Textiles' },
  { value: 'Chemicals', label: 'Chemicals' },
  { value: 'Machinery', label: 'Machinery' },
  { value: 'FMCG', label: 'FMCG' },
  { value: 'Services', label: 'Services' },
  { value: 'Other', label: 'Other' }
];

const EMPTY_FORM: ProductFormData = {
  category: '',
  productCode: '',
  name: '',
  unit: 'PCS',
  hsnSacCode: '',
  price: 0
};

export interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  onSaved: () => void;
}

export function ProductFormModal({ isOpen, onClose, product, onSaved }: ProductFormModalProps) {
  const isEdit = Boolean(product);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting }
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: EMPTY_FORM
  });

  useEffect(() => {
    if (!isOpen) return;

    reset(
      product
        ? {
            category: product.category ?? '',
            productCode: product.productCode ?? product.sku ?? '',
            name: product.name ?? '',
            unit: product.unit ?? 'PCS',
            hsnSacCode: product.hsnSacCode ?? '',
            price: toNumber(product.price)
          }
        : EMPTY_FORM
    );
  }, [isOpen, product, reset]);

  const onSubmit = async (values: ProductFormData) => {
    const payload = {
      ...values,
      sku: values.productCode || undefined
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

      if (error?.response?.status === 409 && /(sku|code)/i.test(message)) {
        setError('productCode', { type: 'server', message });
      }
      toast.error(message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title={isEdit ? 'Edit Product' : 'Add Product'}
      description={
        isEdit
          ? 'Update product details, classification, and pricing.'
          : 'Enter product details to add to catalog.'
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 1. Category */}
          <div className="sm:col-span-1">
            <Input
              label="Category"
              placeholder="Enter category"
              leftIcon={<Tag className="w-4 h-4" />}
              error={errors.category?.message}
              list="category-suggestions"
              {...register('category')}
            />
            <datalist id="category-suggestions">
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value} />
              ))}
            </datalist>
          </div>

          {/* 2. Product Code */}
          <div className="sm:col-span-1">
            <Input
              label="Product Code"
              placeholder="Enter product code"
              leftIcon={<Barcode className="w-4 h-4" />}
              error={errors.productCode?.message}
              {...register('productCode')}
            />
          </div>

          {/* 3. Product Name */}
          <div className="sm:col-span-2">
            <Input
              label="Product Name"
              required
              placeholder="Enter product name"
              leftIcon={<Package className="w-4 h-4" />}
              error={errors.name?.message}
              {...register('name')}
            />
          </div>

          {/* 4. Units */}
          <div>
            <Select
              label="Units"
              required
              options={UNIT_OPTIONS}
              error={errors.unit?.message}
              {...register('unit')}
            />
          </div>

          {/* 5. HSN Code */}
          <div>
            <Input
              label="HSN Code"
              placeholder="Enter HSN code"
              leftIcon={<Hash className="w-4 h-4" />}
              error={errors.hsnSacCode?.message}
              {...register('hsnSacCode')}
            />
          </div>

          {/* 6. Price in INR */}
          <div className="sm:col-span-2">
            <Input
              label="Price in INR"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="Enter price in INR"
              leftIcon={<IndianRupee className="w-4 h-4" />}
              error={errors.price?.message}
              {...register('price')}
            />
          </div>
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
