'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const ELLIPSIS = 'ellipsis' as const;
type PageItem = number | typeof ELLIPSIS;

/**
 * Builds a windowed page list: first and last pages always stay reachable, with
 * the current page and its neighbours in between and gaps collapsed to an
 * ellipsis. Up to 7 slots, so the row never wraps on narrow screens.
 */
function buildPageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const items: PageItem[] = [1];

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) items.push(ELLIPSIS);
  for (let page = start; page <= end; page++) items.push(page);
  if (end < totalPages - 1) items.push(ELLIPSIS);

  items.push(totalPages);
  return items;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const pageItems = buildPageItems(currentPage, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-4 border-t border-warm-border/50 bg-warm-surface"
    >
      <p className="text-xs text-warm-textMuted order-2 sm:order-1">
        Showing <span className="font-semibold text-warm-text">{startItem}</span> to{' '}
        <span className="font-semibold text-warm-text">{endItem}</span> of{' '}
        <span className="font-semibold text-warm-text">{totalItems}</span> results
      </p>

      <div className="flex items-center gap-1.5 order-1 sm:order-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          leftIcon={<ChevronLeft className="w-4 h-4" />}
          className="hidden sm:inline-flex"
        >
          Previous
        </Button>

        {/* Compact arrow for small screens, where the labelled button is hidden. */}
        <button
          type="button"
          aria-label="Previous page"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="sm:hidden h-8 w-8 inline-flex items-center justify-center border border-warm-border text-warm-text hover:bg-warm-accentLight transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1">
          {pageItems.map((item, index) =>
            item === ELLIPSIS ? (
              <span
                key={`gap-${index}`}
                aria-hidden="true"
                className="h-8 w-8 inline-flex items-center justify-center text-xs text-warm-textSubtle select-none"
              >
                &hellip;
              </span>
            ) : (
              <button
                key={item}
                type="button"
                aria-label={`Page ${item}`}
                aria-current={item === currentPage ? 'page' : undefined}
                onClick={() => onPageChange(item)}
                className={cn(
                  'h-8 min-w-8 px-2 inline-flex items-center justify-center text-xs font-semibold border transition-colors focus:outline-none focus:ring-2 focus:ring-warm-accent/40',
                  item === currentPage
                    ? 'bg-warm-accent border-warm-accent text-white'
                    : 'bg-warm-surface border-warm-border text-warm-text hover:bg-warm-accentLight'
                )}
              >
                {item}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          aria-label="Next page"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="sm:hidden h-8 w-8 inline-flex items-center justify-center border border-warm-border text-warm-text hover:bg-warm-accentLight transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          rightIcon={<ChevronRight className="w-4 h-4" />}
          className="hidden sm:inline-flex"
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
