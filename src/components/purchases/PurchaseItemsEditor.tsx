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
  { value: 'GOODS', label: 'Goods / Merchandise' },
  { value: 'RAW_MATERIAL', label: 'Raw Material' },
  { value: 'CAPITAL_ASSET', label: 'Capital Asset (Machinery / Equipment)' },
  { value: 'SERVICE', label: 'Inward Service' },
  { value: 'EXPENSE', label: 'Business Expense' }
];

export function PurchaseItemsEditor({
  items,
  onChange,
  isIgst,
  defaultTaxRate,
  gstRates,
  units,
  disabled,
  errors = {}
}: PurchaseItemsEditorProps) {
  const updateItem = (index: number, patch: Partial<PurchaseEditorItem>) => {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const addItem = () => {
    onChange([...items, createEmptyPurchaseItem(defaultTaxRate)]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row);
    onChange(next);
  };

  const handleProductSelect = (index: number, product: Product) => {
    updateItem(index, {
      productId: product.id,
      name: product.name,
      description: product.description ?? '',
      hsnSacCode: product.hsnSacCode ?? '',
      unit: product.unit || 'PCS',
      unitPrice: String(toNumber(product.price)),
      taxRate: String(toNumber(product.taxRate ?? defaultTaxRate))
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-warm-border/60">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-warm-text">
            Line Items (Goods, Raw Materials & Services)
          </h3>
          <p className="text-[11px] text-warm-textMuted mt-0.5">
            GST calculation: <span className="font-semibold text-warm-accent">{isIgst ? 'Interstate (IGST)' : 'Intrastate (CGST + SGST 50/50)'}</span>
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={addItem}
          disabled={disabled}
        >
          Add Item Row
        </Button>
      </div>

      <div className="space-y-3">
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
            <div
              key={item.key}
              className={cn(
                'p-4 bg-warm-input/30 border border-warm-border/60 transition-all rounded-none',
                rowError && 'border-red-400 bg-red-50/20'
              )}
            >
              {/* Top Bar of Row */}
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 flex items-center justify-center bg-warm-accent text-white text-[10px] font-bold rounded-full">
                    {index + 1}
                  </span>
                  <div className="w-64">
                    <ProductPicker
                      value={item.name}
                      onTextChange={(val) => updateItem(index, { name: val })}
                      onSelect={(prod) => handleProductSelect(index, prod)}
                      disabled={disabled}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveItem(index, 'up')}
                    disabled={disabled || index === 0}
                    className="p-1 text-warm-textSubtle hover:text-warm-text disabled:opacity-30"
                    title="Move Up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(index, 'down')}
                    disabled={disabled || index === items.length - 1}
                    className="p-1 text-warm-textSubtle hover:text-warm-text disabled:opacity-30"
                    title="Move Down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={disabled || items.length <= 1}
                    className="p-1 text-red-500 hover:text-red-700 disabled:opacity-30 ml-2"
                    title="Delete Row"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Item Name, HSN, Category */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-3">
                <div className="sm:col-span-5">
                  <label className="text-[11px] font-semibold text-warm-textMuted block mb-1">
                    Item Description / Title *
                  </label>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateItem(index, { name: e.target.value })}
                    placeholder="Enter item or raw material description"
                    disabled={disabled}
                    className="w-full h-8 px-2.5 bg-warm-surface border border-warm-border text-xs text-warm-text rounded-none focus:outline-none focus:ring-1 focus:ring-warm-accent"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="text-[11px] font-semibold text-warm-textMuted block mb-1">
                    Item Category
                  </label>
                  <select
                    value={item.category}
                    onChange={(e) => updateItem(index, { category: e.target.value as ItemCategory })}
                    disabled={disabled}
                    className="w-full h-8 px-2 bg-warm-surface border border-warm-border text-xs text-warm-text rounded-none focus:outline-none focus:ring-1 focus:ring-warm-accent"
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-warm-textMuted block mb-1">
                    HSN / SAC
                  </label>
                  <input
                    type="text"
                    value={item.hsnSacCode}
                    onChange={(e) => updateItem(index, { hsnSacCode: e.target.value })}
                    placeholder="Enter HSN / SAC"
                    disabled={disabled}
                    className="w-full h-8 px-2.5 bg-warm-surface border border-warm-border text-xs text-warm-text rounded-none focus:outline-none focus:ring-1 focus:ring-warm-accent"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-warm-textMuted block mb-1">
                    Unit
                  </label>
                  <select
                    value={item.unit}
                    onChange={(e) => updateItem(index, { unit: e.target.value })}
                    disabled={disabled}
                    className="w-full h-8 px-2 bg-warm-surface border border-warm-border text-xs text-warm-text rounded-none focus:outline-none focus:ring-1 focus:ring-warm-accent"
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Numeric Inputs & Line Totals */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 items-end pt-2 border-t border-warm-border/40">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-warm-textMuted block mb-1">
                    Qty *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, { quantity: e.target.value })}
                    placeholder="1"
                    disabled={disabled}
                    className="w-full h-8 px-2 bg-warm-surface border border-warm-border text-xs text-warm-text text-right rounded-none focus:outline-none focus:ring-1 focus:ring-warm-accent"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-warm-textMuted block mb-1">
                    Purchase Rate (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, { unitPrice: e.target.value })}
                    placeholder="0.00"
                    disabled={disabled}
                    className="w-full h-8 px-2 bg-warm-surface border border-warm-border text-xs text-warm-text text-right rounded-none focus:outline-none focus:ring-1 focus:ring-warm-accent"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-warm-textMuted block mb-1">
                    Discount (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={item.discountPercent}
                    onChange={(e) => updateItem(index, { discountPercent: e.target.value })}
                    placeholder="0"
                    disabled={disabled}
                    className="w-full h-8 px-2 bg-warm-surface border border-warm-border text-xs text-warm-text text-right rounded-none focus:outline-none focus:ring-1 focus:ring-warm-accent"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-warm-textMuted block mb-1">
                    GST Rate (%)
                  </label>
                  <select
                    value={item.taxRate}
                    onChange={(e) => updateItem(index, { taxRate: e.target.value })}
                    disabled={disabled}
                    className="w-full h-8 px-2 bg-warm-surface border border-warm-border text-xs text-warm-text text-right rounded-none focus:outline-none focus:ring-1 focus:ring-warm-accent"
                  >
                    {gstRates.map((r) => (
                      <option key={r} value={r}>
                        {r}%
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-warm-textMuted block mb-1">
                    Tax Amount
                  </label>
                  <div className="h-8 px-2 bg-warm-input/60 border border-warm-border/50 text-xs text-warm-text flex items-center justify-end font-semibold">
                    {formatCurrency(line.taxAmount)}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-warm-accent block mb-1">
                    Line Total
                  </label>
                  <div className="h-8 px-2 bg-warm-accent/10 border border-warm-accent/30 text-xs font-bold text-warm-text flex items-center justify-end">
                    {formatCurrency(line.total)}
                  </div>
                </div>
              </div>

              {/* Tax Breakup Details for Intrastate / Interstate */}
              <div className="mt-2 text-[10px] text-warm-textSubtle flex flex-wrap items-center gap-4">
                <span>Taxable: {formatCurrency(line.taxableAmount)}</span>
                {isIgst ? (
                  <span>IGST ({line.igstRate}%): {formatCurrency(line.igstAmount)}</span>
                ) : (
                  <>
                    <span>CGST ({line.cgstRate}%): {formatCurrency(line.cgstAmount)}</span>
                    <span>SGST ({line.sgstRate}%): {formatCurrency(line.sgstAmount)}</span>
                  </>
                )}
              </div>

              {rowError && (
                <p className="mt-2 text-xs font-semibold text-red-600">{rowError}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
