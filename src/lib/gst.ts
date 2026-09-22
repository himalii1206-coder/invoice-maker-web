/**
 * Client-side GST preview.
 *
 * This mirrors the backend tax engine line for line, including the integer
 * paise arithmetic and the rule that SGST is derived as (total tax - CGST)
 * rather than rounded on its own. That duplication is deliberate: the user has
 * to see live totals while typing, and the only acceptable preview is one that
 * lands on exactly the figures the server will persist. Anything approximate
 * would show a total that changes the moment they hit save.
 *
 * The server remains the authority - nothing computed here is ever sent back.
 */

export interface PreviewLineInput {
  quantity: number | string;
  unitPrice: number | string;
  discountPercent?: number | string;
  taxRate?: number | string;
}

export interface PreviewLine {
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxRate: number;
  subtotal: number;
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  taxAmount: number;
  total: number;
}

export interface PreviewTotals {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxAmount: number;
  roundOff: number;
  grandTotal: number;
  lines: PreviewLine[];
}

const num = (value: number | string | null | undefined): number => {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toPaise = (value: number): number =>
  Math.round(Math.abs(value) * 100) * Math.sign(value);

const fromPaise = (paise: number): number => Math.round(paise) / 100;

const percentOfPaise = (paise: number, percent: number): number =>
  Math.round((paise * percent) / 100);

const round2 = (value: number): number => fromPaise(toPaise(value));

const round3 = (value: number): number =>
  (Math.round(Math.abs(value) * 1000) * Math.sign(value)) / 1000;

const clampPercent = (value: number, max: number): number => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(value, max);
};

/**
 * The tax mode from the business's settings. Mirrors `TaxMode` on the server so
 * the preview and the saved document agree under every combination.
 */
export interface PreviewTaxMode {
  gstEnabled?: boolean;
  pricesIncludeTax?: boolean;
}

export const computeLine = (
  input: PreviewLineInput,
  isIgst: boolean,
  mode: PreviewTaxMode = {}
): PreviewLine => {
  const { gstEnabled = true, pricesIncludeTax = false } = mode;

  const quantity = round3(Math.max(0, num(input.quantity)));
  const enteredPrice = round2(Math.max(0, num(input.unitPrice)));
  const discountPercent = clampPercent(num(input.discountPercent), 100);
  const taxRate = gstEnabled ? clampPercent(num(input.taxRate), 100) : 0;

  const enteredGrossPaise = Math.round(toPaise(enteredPrice) * quantity);

  // Tax-inclusive mode backs the GST out of the entered figure first, exactly
  // as the server does, so subtotal - discount = taxable still holds.
  const grossPaise =
    pricesIncludeTax && taxRate > 0
      ? Math.round(enteredGrossPaise / (1 + taxRate / 100))
      : enteredGrossPaise;

  const unitPrice =
    pricesIncludeTax && taxRate > 0 && quantity > 0
      ? round2(fromPaise(grossPaise) / quantity)
      : enteredPrice;

  const discountPaise = percentOfPaise(grossPaise, discountPercent);
  const taxablePaise = grossPaise - discountPaise;
  const taxPaise = percentOfPaise(taxablePaise, taxRate);

  let cgstPaise = 0;
  let sgstPaise = 0;
  let igstPaise = 0;

  if (isIgst) {
    igstPaise = taxPaise;
  } else {
    cgstPaise = percentOfPaise(taxablePaise, taxRate / 2);
    // Derived, not rounded independently, so the halves always add to the whole.
    sgstPaise = taxPaise - cgstPaise;
  }

  const halfRate = round2(taxRate / 2);

  return {
    quantity,
    unitPrice,
    discountPercent,
    discountAmount: fromPaise(discountPaise),
    taxRate,
    subtotal: fromPaise(grossPaise),
    taxableAmount: fromPaise(taxablePaise),
    cgstRate: isIgst ? 0 : halfRate,
    cgstAmount: fromPaise(cgstPaise),
    sgstRate: isIgst ? 0 : halfRate,
    sgstAmount: fromPaise(sgstPaise),
    igstRate: isIgst ? taxRate : 0,
    igstAmount: fromPaise(igstPaise),
    taxAmount: fromPaise(taxPaise),
    total: fromPaise(taxablePaise + taxPaise)
  };
};

export const computeTotals = (
  lines: PreviewLineInput[],
  options: { isIgst: boolean; enableRoundOff?: boolean } & PreviewTaxMode
): PreviewTotals => {
  const { isIgst, enableRoundOff = true, gstEnabled, pricesIncludeTax } = options;
  const computed = lines.map((line) => computeLine(line, isIgst, { gstEnabled, pricesIncludeTax }));

  // Totals sum the rounded line values, never the raw products.
  const acc = computed.reduce(
    (sum, line) => ({
      subtotal: sum.subtotal + toPaise(line.subtotal),
      discountAmount: sum.discountAmount + toPaise(line.discountAmount),
      taxableAmount: sum.taxableAmount + toPaise(line.taxableAmount),
      cgstAmount: sum.cgstAmount + toPaise(line.cgstAmount),
      sgstAmount: sum.sgstAmount + toPaise(line.sgstAmount),
      igstAmount: sum.igstAmount + toPaise(line.igstAmount),
      taxAmount: sum.taxAmount + toPaise(line.taxAmount)
    }),
    {
      subtotal: 0,
      discountAmount: 0,
      taxableAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      taxAmount: 0
    }
  );

  const beforeRoundOff = acc.taxableAmount + acc.taxAmount;
  const rounded = enableRoundOff ? Math.round(beforeRoundOff / 100) * 100 : beforeRoundOff;

  return {
    lines: computed,
    subtotal: fromPaise(acc.subtotal),
    discountAmount: fromPaise(acc.discountAmount),
    taxableAmount: fromPaise(acc.taxableAmount),
    cgstAmount: fromPaise(acc.cgstAmount),
    sgstAmount: fromPaise(acc.sgstAmount),
    igstAmount: fromPaise(acc.igstAmount),
    taxAmount: fromPaise(acc.taxAmount),
    roundOff: fromPaise(rounded - beforeRoundOff),
    grandTotal: fromPaise(rounded)
  };
};

/** Rate-wise rows shown under the totals, e.g. "GST 18% - CGST 9% + SGST 9%". */
export interface RateBreakdownRow {
  taxRate: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxAmount: number;
}

export const buildRateBreakdown = (lines: PreviewLine[]): RateBreakdownRow[] => {
  const groups = new Map<number, RateBreakdownRow>();

  for (const line of lines) {
    const existing = groups.get(line.taxRate);

    if (existing) {
      existing.taxableAmount = round2(existing.taxableAmount + line.taxableAmount);
      existing.cgstAmount = round2(existing.cgstAmount + line.cgstAmount);
      existing.sgstAmount = round2(existing.sgstAmount + line.sgstAmount);
      existing.igstAmount = round2(existing.igstAmount + line.igstAmount);
      existing.taxAmount = round2(existing.taxAmount + line.taxAmount);
      continue;
    }

    groups.set(line.taxRate, {
      taxRate: line.taxRate,
      taxableAmount: line.taxableAmount,
      cgstAmount: line.cgstAmount,
      sgstAmount: line.sgstAmount,
      igstAmount: line.igstAmount,
      taxAmount: line.taxAmount
    });
  }

  return Array.from(groups.values())
    .filter((row) => row.taxAmount !== 0)
    .sort((a, b) => a.taxRate - b.taxRate);
};

// ---------------------------------------------------------------------------
// Place of supply
// ---------------------------------------------------------------------------

const normalise = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Decides the tax split for the preview.
 *
 * Mirrors the server's conservative fallback: an unrecognised buyer state is
 * treated as intra-state, which produces the same total tax as IGST, so only
 * the split can ever be wrong - never the amount.
 */
export const isInterState = (
  sellerState: string | null | undefined,
  buyerState: string | null | undefined
): boolean => {
  if (!sellerState || !buyerState) return false;

  const seller = normalise(stripStateCode(sellerState));
  const buyer = normalise(stripStateCode(buyerState));

  if (!seller || !buyer) return false;

  return seller !== buyer;
};

/** Turns "24-Gujarat" into "Gujarat" for comparison and display. */
export const stripStateCode = (value: string): string =>
  value.replace(/^\s*\d{2}\s*[-–—]?\s*/, '').trim();
