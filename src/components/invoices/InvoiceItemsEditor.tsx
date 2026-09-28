'use client';

import React from 'react';
import { cn, formatCurrency } from '@/lib/utils';
import { computeLine } from '@/lib/gst';
import { toNumber } from '@/lib/products';
import { Product } from '@/types/index';
import { ProductPicker } from './ProductPicker';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

/**
 * The line item editor.
 *
 * Row state is kept as strings rather than numbers: a controlled numeric input
 * that coerces on every keystroke makes it impossible to type "0.5" (the
 * intermediate "0." is not a number) or to clear a field without it snapping
 * back to 0. Coercion happens once, on submit.
 */

export interface EditorItem {
  /** Stable key for React across reorders and deletions. */
  key: string;
  productId: string | null;
  name: string;
  description: string;
  hsnSacCode: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
  taxRate: string;
}

export interface InvoiceItemsEditorProps {
  items: EditorItem[];
  onChange: (items: EditorItem[]) => void;
  isIgst: boolean;
  isReverseCharge?: boolean;
  customerId?: string;
  defaultTaxRate: number;
  gstRates: number[];
  units: string[];
  showHsn?: boolean;
  showDiscount?: boolean;
  /** True when entered unit prices already contain GST. */
  pricesIncludeTax?: boolean;
  currency?: string;
  disabled?: boolean;
  /** Row index -> message, surfaced under the offending field. */
  errors?: Record<number, string>;
}

let keyCounter = 0;
export const createEmptyItem = (taxRate: number, unit = 'PCS'): EditorItem => {
  keyCounter += 1;
  return {
    key: `item-${Date.now()}-${keyCounter}`,
    productId: null,
    name: '',
    description: '',
    hsnSacCode: '',
    unit,
    quantity: '1',
    unitPrice: '',
    discountPercent: '',
    taxRate: String(taxRate)
  };
};

/** Rebuilds editor rows from a saved invoice, e.g. when opening the edit form. */
export const itemsFromInvoice = (
  items: Array<{
    productId?: string | null;
    name: string;
    description?: string | null;
    hsnSacCode?: string | null;
    unit: string;
    quantity: string | number;
    unitPrice: string | number;
    discountPercent: string | number;
    taxRate: string | number;
  }>
): EditorItem[] =>
  items.map((item) => {
    keyCounter += 1;
    return {
      key: `item-${keyCounter}`,
      productId: item.productId ?? null,
      name: item.name,
      description: item.description ?? '',
      hsnSacCode: item.hsnSacCode ?? '',
      unit: item.unit || 'PCS',
      quantity: String(toNumber(item.quantity)),
      unitPrice: String(toNumber(item.unitPrice)),
      discountPercent: toNumber(item.discountPercent) ? String(toNumber(item.discountPercent)) : '',
      taxRate: String(toNumber(item.taxRate))
    };
  });

const cellInput =
  'w-full h-9 px-2 bg-warm-input text-warm-text placeholder:text-warm-placeholder text-sm rounded-none border border-warm-border/60 transition-colors focus:outline-none focus:ring-2 focus:ring-warm-accent/40 focus:border-warm-accent disabled:opacity-60 tabular-nums';

export function InvoiceItemsEditor({
  items,
  onChange,
  isIgst,
  isReverseCharge = false,
  customerId,
  defaultTaxRate,
  gstRates,
  units,
  showHsn = true,
  showDiscount = true,
  pricesIncludeTax = false,
  currency = 'INR',
  disabled = false,
  errors = {}
}: InvoiceItemsEditorProps) {
  const patch = (index: number, changes: Partial<EditorItem>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...changes } : item)));
  };

  const defaultUnit = units[0] ?? 'PCS';

  const addRow = () => onChange([...items, createEmptyItem(defaultTaxRate, defaultUnit)]);

  const removeRow = (index: number) => {
    // Always leave one row so the table never collapses to nothing.
    if (items.length === 1) {
      onChange([createEmptyItem(defaultTaxRate, defaultUnit)]);
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

  /** Filling a row from the catalog overwrites pricing but keeps the quantity. */
  const applyProduct = (index: number, product: Product) => {
    patch(index, {
      productId: product.id,
      name: product.name,
      description: product.description ?? '',
      hsnSacCode: product.hsnSacCode ?? '',
      unit: product.unit || 'PCS',
      unitPrice: String(toNumber(product.price)),
      taxRate: String(toNumber(product.taxRate))
    });
  };

  return (
    <div className="bg-warm-surface border border-warm-border/60 shadow-warm">
      {/* Horizontal scroll keeps every column usable on a phone without a
          separate card layout that would drift out of sync with this one. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-left border-collapse">
          <thead className="bg-warm-input/70 border-b border-warm-border/80">
            <tr className="text-[10px] font-semibold uppercase tracking-wider text-warm-textMuted">
              <th className="py-2.5 px-2 w-8">#</th>
              <th className="py-2.5 px-2 min-w-[200px]">Item Name &amp; Description</th>
              {showHsn && <th className="py-2.5 px-2 w-[95px]">HSN/SAC</th>}
              <th className="py-2.5 px-2 w-[80px] text-right">Qty</th>
              <th className="py-2.5 px-2 w-[85px]">Unit</th>
              <th className="py-2.5 px-2 w-[105px] text-right">Rate (₹)</th>
              {showDiscount && <th className="py-2.5 px-2 w-[85px] text-right">Disc %</th>}
              <th className="py-2.5 px-2 w-[95px] text-right">GST %</th>
              <th className="py-2.5 px-2 w-[115px] text-right">Amount (₹)</th>
              <th className="py-2.5 px-2 w-16 text-center">Action</th>
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
                  pricesIncludeTax,
                  isReverseCharge
                }
              );

              const rowError = errors[index];

              return (
                <tr key={item.key} className={cn('hover:bg-warm-input/20', rowError && 'bg-red-50/40')}>
                  <td className="py-2 px-1 text-center align-top pt-3">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[11px] font-bold text-warm-textMuted">{index + 1}</span>
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

                  <td className="py-2 px-2 align-top">
                    <div className="space-y-1">
                      <ProductPicker
                        value={item.name}
                        disabled={disabled}
                        error={Boolean(rowError)}
                        placeholder="Select or enter item name"
                        onTextChange={(value) =>
                          // Typing over a catalog pick detaches the row from it,
                          // so the stored line is not falsely linked to a product.
                          patch(index, { name: value, productId: null })
                        }
                        onSelect={(product) => applyProduct(index, product)}
                      />
                      <input
                        type="text"
                        value={item.description}
                        disabled={disabled}
                        onChange={(e) => patch(index, { description: e.target.value })}
                        placeholder="Description (optional)"
                        className="w-full h-7 px-2 text-xs bg-warm-input/60 border border-warm-border/40 text-warm-text placeholder:text-warm-placeholder/70 rounded-none focus:outline-none focus:border-warm-accent"
                      />
                      {rowError && (
                        <p className="text-[11px] text-red-600 font-medium mt-1">{rowError}</p>
                      )}
                    </div>
                  </td>

                  {showHsn && (
                    <td className="py-2 px-2 align-top">
                      <input
                        value={item.hsnSacCode}
                        disabled={disabled}
                        inputMode="numeric"
                        maxLength={8}
                        onChange={(e) =>
                          patch(index, { hsnSacCode: e.target.value.replace(/\D/g, '') })
                        }
                        placeholder="HSN/SAC"
                        className={cellInput}
                      />
                    </td>
                  )}

                  <td className="py-2 px-2 align-top">
                    <input
                      value={item.quantity}
                      disabled={disabled}
                      inputMode="decimal"
                      onChange={(e) =>
                        patch(index, { quantity: e.target.value.replace(/[^\d.]/g, '') })
                      }
                      placeholder="1"
                      className={cn(cellInput, 'text-right')}
                    />
                  </td>

                  <td className="py-2 px-2 align-top">
                    <select
                      value={item.unit}
                      disabled={disabled}
                      onChange={(e) => patch(index, { unit: e.target.value })}
                      className={cn(cellInput, 'cursor-pointer pr-1')}
                    >
                      {/* A unit saved before the list changed must still show. */}
                      {!units.includes(item.unit) && item.unit && (
                        <option value={item.unit}>{item.unit}</option>
                      )}
                      {units.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="py-2 px-2 align-top">
                    <input
                      value={item.unitPrice}
                      disabled={disabled}
                      inputMode="decimal"
                      placeholder="0.00"
                      onChange={(e) =>
                        patch(index, { unitPrice: e.target.value.replace(/[^\d.]/g, '') })
                      }
                      className={cn(cellInput, 'text-right')}
                    />
                  </td>

                  {showDiscount && (
                    <td className="py-2 px-2 align-top">
                      <input
                        value={item.discountPercent}
                        disabled={disabled}
                        inputMode="decimal"
                        placeholder="0"
                        onChange={(e) =>
                          patch(index, { discountPercent: e.target.value.replace(/[^\d.]/g, '') })
                        }
                        className={cn(cellInput, 'text-right')}
                      />
                      {line.discountAmount > 0 && (
                        <p className="text-[10px] text-warm-textSubtle text-right mt-0.5 tabular-nums">
                          -{formatCurrency(line.discountAmount)}
                        </p>
                      )}
                    </td>
                  )}

                  <td className="py-2 px-2 align-top">
                    <select
                      value={item.taxRate}
                      disabled={disabled}
                      onChange={(e) => patch(index, { taxRate: e.target.value })}
                      className={cn(cellInput, 'cursor-pointer text-right pr-1 font-medium')}
                    >
                      {!gstRates.map(String).includes(item.taxRate) && (
                        <option value={item.taxRate}>
                          {item.taxRate}%
                        </option>
                      )}
                      {gstRates.map((rate) => (
                        <option key={rate} value={rate}>
                          {rate}%
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="py-2 px-2 align-top text-right pt-3.5">
                    <span className="text-sm font-semibold tabular-nums text-warm-text">
                      {formatCurrency(line.total)}
                    </span>
                  </td>

                  <td className="py-2 px-2 align-top text-center pt-2.5">
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
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

      <div className="px-4 py-3 border-t border-warm-border/50 bg-warm-accentLight/20">
        <button
          type="button"
          onClick={addRow}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-warm-accent hover:text-warm-accentHover disabled:opacity-50 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add another line
        </button>
      </div>
    </div>
  );
}
