'use client';

import React from 'react';
import { cn, formatCurrency } from '@/lib/utils';
import { computeLine } from '@/lib/gst';
import { toNumber } from '@/lib/products';
import { Product } from '@/types/index';
import { ItemCategory } from '@/types/purchase';
import { Button } from '@/components/ui/Button';
import { ProductPicker } from '@/components/invoices/ProductPicker';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

export interface PurchaseEditorItem {
  key: string;
  productId: string | null;
  name: string;
  description: string;
  hsnSacCode: string;
  category: ItemCategory;
  unit: string;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
  taxRate: string;
}

export interface PurchaseItemsEditorProps {
  items: PurchaseEditorItem[];
  onChange: (items: PurchaseEditorItem[]) => void;
  isIgst: boolean;
  isReverseCharge?: boolean;
  defaultTaxRate: number;
  gstRates: number[];
  units: string[];
  disabled?: boolean;
  errors?: Record<number, string>;
}

let keyCounter = 0;
export const createEmptyPurchaseItem = (taxRate: number): PurchaseEditorItem => {
  keyCounter += 1;
  return {
    key: `purchase-item-${Date.now()}-${keyCounter}`,
    productId: null,
    name: '',
    description: '',
    hsnSacCode: '',
    category: 'GOODS',
    unit: 'PCS',
    quantity: '1',
    unitPrice: '',
    discountPercent: '0',
    taxRate: String(taxRate)
  };
};

const CATEGORY_OPTIONS: Array<{ value: ItemCategory; label: string }> = [
  { value: 'GOODS', label: 'Goods' },
  { value: 'RAW_MATERIAL', label: 'Raw Material' },
  { value: 'CAPITAL_ASSET', label: 'Capital Asset' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'EXPENSE', label: 'Expense' }
];

const cellInput =
  'w-full h-8 px-2 bg-warm-input text-warm-text placeholder:text-warm-placeholder text-xs rounded-none border border-warm-border/60 transition-colors focus:outline-none focus:ring-1 focus:ring-warm-accent focus:border-warm-accent disabled:opacity-60 tabular-nums';

export function PurchaseItemsEditor({
  items,
  onChange,
  isIgst,
  isReverseCharge = false,
  defaultTaxRate,
  gstRates,
  units,
  disabled = false,
  errors = {}
}: PurchaseItemsEditorProps) {
  const patch = (index: number, changes: Partial<PurchaseEditorItem>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...changes } : item)));
  };

  const defaultUnit = units[0] ?? 'PCS';

  const addItem = () => {
    onChange([...items, createEmptyPurchaseItem(defaultTaxRate)]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      onChange([createEmptyPurchaseItem(defaultTaxRate)]);
      return;
    }
    onChange(items.filter((_, i) => i !== index));
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;

    const next = [...items];
    const moved = next[index];
    const swapped = next[target];
    if (!moved || !swapped) return;

    next[index] = swapped;
    next[target] = moved;
    onChange(next);
  };

  const handleProductSelect = (index: number, product: Product) => {
    patch(index, {
      productId: product.id,
      name: product.name,
      description: product.description ?? '',
      hsnSacCode: product.hsnSacCode ?? '',
      unit: product.unit || defaultUnit,
      unitPrice: String(toNumber(product.price)),
      taxRate: String(toNumber(product.taxRate ?? defaultTaxRate))
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 pb-2 border-b border-warm-border/60">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-warm-text">
            Line Items ({items.length})
          </h3>
          <p className="text-[11px] text-warm-textMuted mt-0.5">
            GST Regime:{' '}
            <span className="font-semibold text-warm-accent">
              {isIgst ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST 50/50)'}
            </span>
            {isReverseCharge && (
              <span className="ml-2 font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 border border-amber-300 text-[10px]">
                RCM ACTIVE
              </span>
            )}
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          onClick={addItem}
          disabled={disabled}
          className="shrink-0"
        >
          Add Item Row
        </Button>
      </div>

      <div className="bg-warm-surface border border-warm-border/70 shadow-warm overflow-x-auto">
        <table className="w-full min-w-[840px] text-left border-collapse">
          <thead className="bg-warm-input/70 border-b border-warm-border/80">
            <tr className="text-[10px] font-bold uppercase tracking-wider text-warm-textSubtle">
              <th className="py-2 px-2 w-8 text-center">#</th>
              <th className="py-2 px-2 min-w-[220px]">Item &amp; Description</th>
              <th className="py-2 px-2 w-[85px]">Category</th>
              <th className="py-2 px-2 w-[90px]">HSN/SAC</th>
              <th className="py-2 px-2 w-[75px] text-right">Qty</th>
              <th className="py-2 px-2 w-[80px]">Unit</th>
              <th className="py-2 px-2 w-[100px] text-right">Rate (₹)</th>
              <th className="py-2 px-2 w-[75px] text-right">Disc %</th>
              <th className="py-2 px-2 w-[85px] text-right">GST %</th>
              <th className="py-2 px-2 w-[105px] text-right">Amount (₹)</th>
              <th className="py-2 px-2 w-12 text-center">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-warm-border/40">
            {items.map((item, index) => {
              const line = computeLine(
                {
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  discountPercent: item.discountPercent,
                  taxRate: item.taxRate
                },
                isIgst,
                {
                  gstEnabled: true,
                  isReverseCharge
                }
              );

              const rowError = errors[index];

              return (
                <tr
                  key={item.key}
                  className={cn(
                    'hover:bg-warm-input/20 transition-colors',
                    rowError && 'bg-red-50/40'
                  )}
                >
                  {/* # and Reorder */}
                  <td className="py-2 px-1 text-center align-top pt-2.5">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[11px] font-bold text-warm-textMuted">
                        {index + 1}
                      </span>
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => move(index, -1)}
                          disabled={disabled || index === 0}
                          className="text-warm-textMuted hover:text-warm-text disabled:opacity-20 cursor-pointer"
                          title="Move up"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(index, 1)}
                          disabled={disabled || index === items.length - 1}
                          className="text-warm-textMuted hover:text-warm-text disabled:opacity-20 cursor-pointer"
                          title="Move down"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </td>

                  {/* Name & Description */}
                  <td className="py-2 px-2 align-top">
                    <div className="space-y-1">
                      <ProductPicker
                        value={item.name}
                        disabled={disabled}
                        error={Boolean(rowError)}
                        placeholder="Select or enter item name *"
                        onTextChange={(value) =>
                          patch(index, { name: value, productId: null })
                        }
                        onSelect={(product) => handleProductSelect(index, product)}
                      />
                      <input
                        type="text"
                        value={item.description}
                        disabled={disabled}
                        onChange={(e) => patch(index, { description: e.target.value })}
                        placeholder="Description / Remarks (optional)"
                        className={cellInput}
                      />
                      {rowError && (
                        <p className="text-[10px] font-medium text-red-600">{rowError}</p>
                      )}
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-2 px-2 align-top">
                    <select
                      value={item.category}
                      disabled={disabled}
                      onChange={(e) =>
                        patch(index, { category: e.target.value as ItemCategory })
                      }
                      className={cn(cellInput, 'cursor-pointer px-1 text-[11px]')}
                    >
                      {CATEGORY_OPTIONS.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* HSN / SAC */}
                  <td className="py-2 px-2 align-top">
                    <input
                      type="text"
                      value={item.hsnSacCode}
                      disabled={disabled}
                      onChange={(e) => patch(index, { hsnSacCode: e.target.value })}
                      placeholder="HSN/SAC"
                      className={cellInput}
                    />
                  </td>

                  {/* Qty */}
                  <td className="py-2 px-2 align-top">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={item.quantity}
                      disabled={disabled}
                      onChange={(e) => patch(index, { quantity: e.target.value })}
                      placeholder="1"
                      className={cn(cellInput, 'text-right')}
                    />
                  </td>

                  {/* Unit */}
                  <td className="py-2 px-2 align-top">
                    <select
                      value={item.unit}
                      disabled={disabled}
                      onChange={(e) => patch(index, { unit: e.target.value })}
                      className={cn(cellInput, 'cursor-pointer px-1 uppercase text-[11px]')}
                    >
                      {units.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Rate */}
                  <td className="py-2 px-2 align-top">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={item.unitPrice}
                      disabled={disabled}
                      onChange={(e) => patch(index, { unitPrice: e.target.value })}
                      placeholder="0.00"
                      className={cn(cellInput, 'text-right')}
                    />
                  </td>

                  {/* Discount % */}
                  <td className="py-2 px-2 align-top">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      value={item.discountPercent}
                      disabled={disabled}
                      onChange={(e) => patch(index, { discountPercent: e.target.value })}
                      placeholder="0"
                      className={cn(cellInput, 'text-right')}
                    />
                  </td>

                  {/* GST % */}
                  <td className="py-2 px-2 align-top">
                    <select
                      value={item.taxRate}
                      disabled={disabled}
                      onChange={(e) => patch(index, { taxRate: e.target.value })}
                      className={cn(cellInput, 'cursor-pointer text-right px-1 text-[11px]')}
                    >
                      {gstRates.map((rate) => (
                        <option key={rate} value={rate}>
                          {rate}%
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Taxable Amount */}
                  <td className="py-2 px-2 text-right align-top pt-2.5">
                    <span className="text-xs font-semibold text-warm-text tabular-nums block">
                      {formatCurrency(line.taxableAmount)}
                    </span>
                    <span className="text-[10px] text-warm-textMuted block">
                      Tax: {formatCurrency(line.taxAmount)}
                    </span>
                  </td>

                  {/* Delete Button */}
                  <td className="py-2 px-2 text-center align-top pt-2.5">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={disabled}
                      className="p-1 text-warm-textMuted hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 cursor-pointer"
                      title="Delete Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Table Footer */}
        <div className="p-2.5 bg-warm-input/30 border-t border-warm-border/60 flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={addItem}
            disabled={disabled}
          >
            Add Line Item
          </Button>

          <span className="text-xs text-warm-textMuted">
            {items.length} item{items.length === 1 ? '' : 's'} in bill
          </span>
        </div>
      </div>
    </div>
  );
}
