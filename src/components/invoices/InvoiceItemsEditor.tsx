'use client';

import React from 'react';
import { cn, formatCurrency } from '@/lib/utils';
import { computeLine } from '@/lib/gst';
import { toNumber } from '@/lib/products';
import { Product } from '@/types/index';
import { Button } from '@/components/ui/Button';
import { ProductPicker } from './ProductPicker';
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';

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
  customerId?: string;
  defaultTaxRate: number;
  gstRates: number[];
  units: string[];
  showHsn?: boolean;
  showDiscount?: boolean;
  currency?: string;
  disabled?: boolean;
  /** Row index -> message, surfaced under the offending field. */
  errors?: Record<number, string>;
}

let keyCounter = 0;
export const createEmptyItem = (taxRate: number): EditorItem => {
  keyCounter += 1;
  return {
    key: `item-${Date.now()}-${keyCounter}`,
    productId: null,
    name: '',
    description: '',
    hsnSacCode: '',
    unit: 'PCS',
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
  'w-full h-9 px-2 bg-warm-input text-warm-text placeholder:text-warm-textSubtle text-sm rounded-none border border-warm-border/60 transition-colors focus:outline-none focus:ring-2 focus:ring-warm-accent/40 focus:border-warm-accent disabled:opacity-60 tabular-nums';

export function InvoiceItemsEditor({
  items,
  onChange,
  isIgst,
  customerId,
  defaultTaxRate,
  gstRates,
  units,
  showHsn = true,
  showDiscount = true,
  currency = 'INR',
  disabled = false,
  errors = {}
}: InvoiceItemsEditorProps) {
  const patch = (index: number, changes: Partial<EditorItem>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...changes } : item)));
  };

  const addRow = () => onChange([...items, createEmptyItem(defaultTaxRate)]);

  const removeRow = (index: number) => {
    // Always leave one row so the table never collapses to nothing.
    if (items.length === 1) {
      onChange([createEmptyItem(defaultTaxRate)]);
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
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-warm-border/50">
        <div>
          <h3 className="text-sm font-semibold text-warm-text tracking-tight">Line Items</h3>
          <p className="text-[11px] text-warm-textMuted mt-0.5">
            {isIgst
              ? 'Inter-state supply — IGST is charged at the full rate.'
              : 'Intra-state supply — GST is split equally into CGST and SGST.'}
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

      {/* Horizontal scroll keeps every column usable on a phone without a
          separate card layout that would drift out of sync with this one. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left border-collapse">
          <thead className="bg-warm-input/70 border-b border-warm-border/80">
            <tr className="text-[10px] font-semibold uppercase tracking-wider text-warm-textMuted">
              <th className="py-2.5 px-2 w-8"></th>
              <th className="py-2.5 px-2 min-w-[220px]">Item &amp; Description</th>
              {showHsn && <th className="py-2.5 px-2 w-[90px]">HSN/SAC</th>}
              <th className="py-2.5 px-2 w-[80px] text-right">Qty</th>
              <th className="py-2.5 px-2 w-[90px]">Unit</th>
              <th className="py-2.5 px-2 w-[110px] text-right">Rate</th>
              {showDiscount && <th className="py-2.5 px-2 w-[80px] text-right">Disc %</th>}
              <th className="py-2.5 px-2 w-[125px] text-right">
                <span>GST %</span>
                <span className="block text-[9px] font-semibold text-warm-accent uppercase tracking-normal">
                  {isIgst ? 'IGST (Inter-State)' : 'CGST + SGST'}
                </span>
              </th>
              <th className="py-2.5 px-2 w-[110px] text-right">Amount</th>
              <th className="py-2.5 px-2 w-10"></th>
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
                isIgst
              );

              const rowError = errors[index];

              return (
                <tr key={item.key} className={cn(rowError && 'bg-red-50/40')}>
                  <td className="py-2 px-2 align-top">
                    <div className="flex flex-col items-center pt-1.5">
                      <GripVertical className="w-3.5 h-3.5 text-warm-textSubtle" />
                      <span className="text-[10px] font-semibold text-warm-textSubtle mt-0.5">
                        {index + 1}
                      </span>
                    </div>
                  </td>

                  <td className="py-2 px-2 align-top">
                    <ProductPicker
                      value={item.name}
                      disabled={disabled}
                      error={Boolean(rowError)}
                      onTextChange={(value) =>
                        // Typing over a catalog pick detaches the row from it,
                        // so the stored line is not falsely linked to a product.
                        patch(index, { name: value, productId: null })
                      }
                      onSelect={(product) => applyProduct(index, product)}
                    />
                    <input
                      value={item.description}
                      disabled={disabled}
                      onChange={(e) => patch(index, { description: e.target.value })}
                      placeholder="Description (optional)"
                      className={cn(cellInput, 'mt-1 h-8 text-xs')}
                    />
                    {rowError && (
                      <p className="text-[11px] text-red-600 font-medium mt-1">{rowError}</p>
                    )}
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
                          {item.taxRate}%{' '}
                          {isIgst
                            ? `(IGST ${item.taxRate}%)`
                            : `(C ${Number(item.taxRate) / 2}% + S ${Number(item.taxRate) / 2}%)`}
                        </option>
                      )}
                      {gstRates.map((rate) => (
                        <option key={rate} value={rate}>
                          {rate}%{' '}
                          {rate > 0
                            ? isIgst
                              ? `(IGST ${rate}%)`
                              : `(C ${rate / 2}% + S ${rate / 2}%)`
                            : '(Nil)'}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-warm-textSubtle text-right mt-0.5 tabular-nums">
                      {isIgst
                        ? line.taxAmount > 0
                          ? `IGST (${line.igstRate}%): ${formatCurrency(line.igstAmount)}`
                          : `IGST ${line.igstRate}%`
                        : line.taxAmount > 0
                        ? `C (${line.cgstRate}%): ${formatCurrency(line.cgstAmount)} + S (${line.sgstRate}%): ${formatCurrency(line.sgstAmount)}`
                        : `CGST ${line.cgstRate}% + SGST ${line.sgstRate}%`}
                    </p>
                  </td>

                  <td className="py-2 px-2 align-top text-right">
                    <p className="h-9 flex items-center justify-end text-sm font-semibold text-warm-text tabular-nums">
                      {formatCurrency(line.total)}
                    </p>
                    <p className="text-[10px] text-warm-textSubtle tabular-nums">
                      Taxable {formatCurrency(line.taxableAmount)}
                    </p>
                  </td>

                  <td className="py-2 px-2 align-top">
                    <div className="flex flex-col items-center gap-0.5 pt-0.5">
                      <button
                        type="button"
                        title="Move up"
                        disabled={disabled || index === 0}
                        onClick={() => move(index, -1)}
                        className="p-0.5 text-warm-textMuted hover:text-warm-accent disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Remove item"
                        disabled={disabled}
                        onClick={() => removeRow(index)}
                        className="p-0.5 text-warm-textMuted hover:text-red-600 disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Move down"
                        disabled={disabled || index === items.length - 1}
                        onClick={() => move(index, 1)}
                        className="p-0.5 text-warm-textMuted hover:text-warm-accent disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-warm-accent hover:text-warm-accentHover disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          Add another line
        </button>
      </div>
    </div>
  );
}
