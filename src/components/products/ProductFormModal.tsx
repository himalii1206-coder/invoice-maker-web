'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { productsApi, toNumber } from '@/lib/products';
import { apiErrorMessage } from '@/lib/customers';
import { Product } from '@/types/index';
import { cn } from '@/lib/utils';
import { Package, IndianRupee, Hash, Barcode, Tag, ChevronDown, Check } from 'lucide-react';

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
  'General',
  'Raw Material',
  'Finished Goods',
  'Packaging',
  'Electronics',
  'Hardware',
  'Textiles',
  'Chemicals',
  'Machinery',
  'FMCG',
  'Services',
  'Other'
];

interface CategoryPickerProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

function CategoryPicker({ value, onChange, error, disabled }: CategoryPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = useMemo(() => {
    const query = (value || '').trim().toLowerCase();
    if (!query) return CATEGORY_OPTIONS;

    const matches = CATEGORY_OPTIONS.filter((c) => c.toLowerCase().includes(query));
    const exactMatch = CATEGORY_OPTIONS.some((c) => c.toLowerCase() === query);
    if (!exactMatch && query) {
      return [value.trim(), ...matches];
    }
    return matches;
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
        e.preventDefault();
        onChange(filteredOptions[highlightedIndex]);
        setIsOpen(false);
      }
    }
  };

  return (
    <div className="w-full space-y-1.5" ref={containerRef}>
      <label className="block text-xs font-semibold uppercase tracking-wider text-warm-textMuted">
        Category
      </label>
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-textMuted pointer-events-none">
          <Tag className="w-4 h-4" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          disabled={disabled}
          placeholder="Enter or select category"
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full h-10 pl-9 pr-9 bg-warm-input text-warm-text placeholder:text-warm-placeholder text-sm rounded-none border border-warm-border/60 transition-colors focus:outline-none focus:ring-2 focus:ring-warm-accent/40 focus:border-warm-accent disabled:opacity-60 disabled:cursor-not-allowed',
            error && 'border-red-500 focus:ring-red-500/40 focus:border-red-500'
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            setIsOpen((prev) => !prev);
            inputRef.current?.focus();
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-warm-textMuted hover:text-warm-text transition-colors cursor-pointer"
        >
          <ChevronDown
            className={cn('w-4 h-4 transition-transform duration-200', isOpen && 'rotate-180 text-warm-accent')}
          />
        </button>

        {isOpen && filteredOptions.length > 0 && (
          <div className="absolute left-0 top-full mt-1 w-full bg-warm-surface border border-warm-border/80 shadow-warmLg z-50 max-h-52 overflow-y-auto">
            <ul className="py-1 divide-y divide-warm-border/20">
              {filteredOptions.map((opt, idx) => {
                const isSelected = opt.toLowerCase() === value.trim().toLowerCase();
                const isHighlighted = idx === highlightedIndex;
                return (
                  <li key={`${opt}-${idx}`}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onChange(opt);
                        setIsOpen(false);
                      }}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={cn(
                        'w-full px-3.5 py-2 text-left text-sm flex items-center justify-between transition-colors cursor-pointer',
                        isHighlighted
                          ? 'bg-warm-accent/15 text-warm-accent font-medium'
                          : 'text-warm-text hover:bg-warm-input/60',
                        isSelected && 'text-warm-accent font-semibold bg-warm-accent/5'
                      )}
                    >
                      <span className="truncate">{opt}</span>
                      {isSelected && <Check className="w-4 h-4 text-warm-accent shrink-0 ml-2" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-1 font-medium">{error}</p>}
    </div>
  );
}

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
  const { invoiceSettings, company, refreshUser } = useAuth();

  // Catalogue defaults come from Settings → Customer & Products, so a new
  // product starts where the business wants it to.
  const defaultUnit = invoiceSettings?.defaultUnit ?? 'PCS';
  const hsnRequired = Boolean(
    (invoiceSettings?.gstEnabled ?? true) && (invoiceSettings?.hsnRequiredOnProduct ?? false)
  );
  const codePrefix = invoiceSettings?.productCodePrefix ?? 'PRD';
  const autoProductCode =
    invoiceSettings?.nextProductCode || company?.nextProductCode || `${codePrefix}-0001`;

  // The server enforces this too; checking here turns a 400 into an inline
  // message on the field that caused it.
  const schema = hsnRequired
    ? productSchema.refine((values) => Boolean(values.hsnSacCode), {
        message: 'An HSN / SAC code is required by your GST settings',
        path: ['hsnSacCode']
      })
    : productSchema;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting }
  } = useForm<ProductFormData>({
    resolver: zodResolver(schema),
    defaultValues: { ...EMPTY_FORM, unit: defaultUnit, productCode: autoProductCode }
  });

  const categoryValue = watch('category') || '';

  useEffect(() => {
    if (!isOpen) return;

    reset(
      product
        ? {
            category: product.category ?? '',
            productCode: product.productCode ?? product.sku ?? '',
            name: product.name ?? '',
            unit: product.unit ?? defaultUnit,
            hsnSacCode: product.hsnSacCode ?? '',
            price: toNumber(product.price)
          }
        : {
            ...EMPTY_FORM,
            unit: defaultUnit,
            productCode: autoProductCode
          }
    );
  }, [isOpen, product, reset, defaultUnit, autoProductCode]);

  const onSubmit = async (values: ProductFormData) => {
    const payload = isEdit
      ? {
          category: values.category,
          name: values.name,
          unit: values.unit,
          hsnSacCode: values.hsnSacCode,
          price: values.price
        }
      : {
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
      refreshUser().catch(() => null);
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
            <CategoryPicker
              value={categoryValue}
              onChange={(val) =>
                setValue('category', val, { shouldValidate: true, shouldDirty: true })
              }
              error={errors.category?.message}
              disabled={isSubmitting}
            />
          </div>

          {/* 2. Product Code */}
          <div className="sm:col-span-1">
            <Input
              label="Product Code"
              placeholder={isEdit ? 'Enter product code' : autoProductCode}
              leftIcon={<Barcode className="w-4 h-4" />}
              error={errors.productCode?.message}
              disabled={isEdit || isSubmitting}
              readOnly={isEdit}
              className={isEdit ? 'bg-warm-input/60 cursor-not-allowed text-warm-text' : undefined}
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
              required={hsnRequired}
              placeholder="Enter HSN / SAC code"
              leftIcon={<Hash className="w-4 h-4" />}
              error={errors.hsnSacCode?.message}
              // helperText={hsnRequired ? 'Required by your GST settings' : undefined}
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
