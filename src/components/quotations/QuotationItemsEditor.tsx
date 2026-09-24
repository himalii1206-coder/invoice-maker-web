'use client';

import React from 'react';
import { cn, formatCurrency } from '@/lib/utils';
import { Product } from '@/types/index';
import { Button } from '@/components/ui/Button';
import { ProductPicker } from '@/components/invoices/ProductPicker';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

export interface QuotationEditorItem {
  key: string;
  productId: string | null;
  name: string;
  description: string;
  hsnSacCode: string;
  unit: string;
  quantity: string;
  rate: string;
  discountPercent: string;
  taxRate: string;
}

export interface QuotationItemsEditorProps {
  items: QuotationEditorItem[];
  onChange: (items: QuotationEditorItem[]) => void;
  isIgst: boolean;
  customerId?: string;
  defaultTaxRate?: number;
  gstRates?: number[];
  units?: string[];
  disabled?: boolean;
  errors?: Record<number, string>;
}

let keyCounter = 0;
export const createEmptyQuotationItem = (taxRate = 18, unit = 'PCS'): QuotationEditorItem => {
  keyCounter += 1;
  return {
    key: `qitem-${Date.now()}-${keyCounter}`,
    productId: null,
    name: '',
    description: '',
    hsnSacCode: '',
    unit,
    quantity: '1',
    rate: '',
    discountPercent: '',
    taxRate: String(taxRate)
  };
};

const cellInput =
  'w-full h-9 px-2 bg-warm-input text-warm-text placeholder:text-warm-placeholder text-sm rounded-none border border-warm-border/60 transition-colors focus:outline-none focus:ring-2 focus:ring-warm-accent/40 focus:border-warm-accent disabled:opacity-60 tabular-nums';

const COMMON_UNITS = ['PCS', 'NOS', 'KG', 'MTR', 'BOX', 'SET', 'BAG', 'LTR', 'SQF', 'SQM', 'HR', 'DAY', 'UNT'];
const COMMON_GST_RATES = [0, 5, 12, 18, 28];

export function QuotationItemsEditor({
  items,
  onChange,
  isIgst,
  defaultTaxRate = 18,
  gstRates = COMMON_GST_RATES,
  units = COMMON_UNITS,
  disabled = false,
  errors = {}
}: QuotationItemsEditorProps) {
  const patch = (index: number, changes: Partial<QuotationEditorItem>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...changes } : item)));
  };

  const defaultUnit = units[0] ?? 'PCS';

  const addRow = () => onChange([...items, createEmptyQuotationItem(defaultTaxRate, defaultUnit)]);

  const removeRow = (index: number) => {
    if (items.length === 1) {
      onChange([createEmptyQuotationItem(defaultTaxRate, defaultUnit)]);
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

  const applyProduct = (index: number, product: Product) => {
    const priceNum = typeof product.price === 'number' ? product.price : parseFloat(String(product.price)) || 0;
    const taxNum = typeof product.taxRate === 'number' ? product.taxRate : parseFloat(String(product.taxRate)) || defaultTaxRate;

    patch(index, {
      productId: product.id,
      name: product.name,
      description: product.description ?? '',
      hsnSacCode: product.hsnSacCode ?? '',
      unit: product.unit || 'PCS',
      rate: String(priceNum),
      taxRate: String(taxNum)
    });
  };

  return (
    <div className="bg-warm-surface border border-warm-border/60 shadow-warm">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-warm-border/50">
        <div>
          <h3 className="text-sm font-semibold text-warm-text tracking-tight">Quotation Items</h3>
          <p className="text-[11px] text-warm-textMuted mt-0.5">
            {isIgst
              ? 'Inter-State supply — IGST applicable.'
              : 'Intra-State supply — CGST & SGST applicable.'}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addRow}
          disabled={disabled}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Add Item
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-left border-collapse">
          <thead className="bg-warm-input/70 border-b border-warm-border/80">
            <tr className="text-[10px] font-semibold uppercase tracking-wider text-warm-textMuted">
              <th className="py-2.5 px-2 w-8">#</th>
              <th className="py-2.5 px-2 min-w-[220px]">Item Name & Description</th>
              <th className="py-2.5 px-2 w-[100px]">HSN/SAC</th>
              <th className="py-2.5 px-2 w-[85px] text-right">Qty</th>
              <th className="py-2.5 px-2 w-[90px]">Unit</th>
              <th className="py-2.5 px-2 w-[110px] text-right">Rate (₹)</th>
              <th className="py-2.5 px-2 w-[95px] text-right">GST %</th>
              <th className="py-2.5 px-2 w-[120px] text-right">Amount (₹)</th>
              <th className="py-2.5 px-2 w-16 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-border/40">
            {items.map((item, idx) => {
              const qtyNum = parseFloat(item.quantity) || 0;
              const rateNum = parseFloat(item.rate) || 0;
              const lineAmount = qtyNum * rateNum;
              const hasError = Boolean(errors[idx]);

              return (
                <tr key={item.key} className={cn('hover:bg-warm-input/20', hasError && 'bg-red-50/40')}>
                  {/* Order / Reorder */}
                  <td className="py-2 px-1 text-center align-top pt-3">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[11px] font-bold text-warm-textMuted">{idx + 1}</span>
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => move(idx, -1)}
                          disabled={disabled || idx === 0}
                          className="text-warm-textMuted hover:text-warm-text disabled:opacity-20 cursor-pointer"
                          title="Move up"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(idx, 1)}
                          disabled={disabled || idx === items.length - 1}
                          className="text-warm-textMuted hover:text-warm-text disabled:opacity-20 cursor-pointer"
                          title="Move down"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </td>

                  {/* Name and Description */}
                  <td className="py-2 px-2 align-top">
                    <div className="space-y-1">
                      <ProductPicker
                        value={item.name}
                        onTextChange={(val) => patch(idx, { name: val, productId: null })}
                        onSelect={(prod) => applyProduct(idx, prod)}
                        placeholder="Select or enter item name"
                        error={hasError && !item.name.trim()}
                        disabled={disabled}
                      />
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => patch(idx, { description: e.target.value })}
                        placeholder="Optional description / specs"
                        disabled={disabled}
                        className="w-full h-7 px-2 text-xs bg-warm-input/60 border border-warm-border/40 text-warm-text placeholder:text-warm-placeholder/70 rounded-none focus:outline-none focus:border-warm-accent"
                      />
                    </div>
                  </td>

                  {/* HSN/SAC */}
                  <td className="py-2 px-2 align-top">
                    <input
                      type="text"
                      value={item.hsnSacCode}
                      onChange={(e) => patch(idx, { hsnSacCode: e.target.value })}
                      placeholder="HSN"
                      disabled={disabled}
                      className={cellInput}
                    />
                  </td>

                  {/* Qty */}
                  <td className="py-2 px-2 align-top">
                    <input
                      type="number"
                      min="0.001"
                      step="any"
                      value={item.quantity}
                      onChange={(e) => patch(idx, { quantity: e.target.value })}
                      placeholder="1"
                      disabled={disabled}
                      className={cn(cellInput, 'text-right')}
                    />
                  </td>

                  {/* Unit */}
                  <td className="py-2 px-2 align-top">
                    <select
                      value={item.unit}
                      onChange={(e) => patch(idx, { unit: e.target.value })}
                      disabled={disabled}
                      className={cn(cellInput, 'cursor-pointer')}
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
                      min="0"
                      step="any"
                      value={item.rate}
                      onChange={(e) => patch(idx, { rate: e.target.value })}
                      placeholder="0.00"
                      disabled={disabled}
                      className={cn(cellInput, 'text-right')}
                    />
                  </td>

                  {/* Tax Rate % */}
                  <td className="py-2 px-2 align-top">
                    <select
                      value={item.taxRate}
                      onChange={(e) => patch(idx, { taxRate: e.target.value })}
                      disabled={disabled}
                      className={cn(cellInput, 'text-right cursor-pointer')}
                    >
                      {gstRates.map((r) => (
                        <option key={r} value={r}>
                          {r}%
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Amount (Qty * Rate) */}
                  <td className="py-2 px-2 align-top text-right pt-3.5">
                    <span className="text-sm font-semibold tabular-nums text-warm-text">
                      {formatCurrency(lineAmount)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-2 px-2 align-top text-center pt-2.5">
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      disabled={disabled}
                      className="p-1.5 text-warm-textMuted hover:text-red-600 hover:bg-red-50 rounded-none transition-colors cursor-pointer disabled:opacity-30"
                      title="Remove row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
