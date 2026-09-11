'use client';

import React, { HTMLAttributes, TableHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Table({ className, children, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-none border border-warm-border/60 bg-warm-surface shadow-warm">
      <table className={cn('w-full text-left text-sm text-warm-text border-collapse', className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn('bg-warm-input/70 border-b border-warm-border/80 text-xs font-semibold uppercase tracking-wider text-warm-textMuted select-none', className)} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn('divide-y divide-warm-border/40 bg-warm-surface', className)} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ className, children, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn('hover:bg-warm-accentLight/40 transition-colors', className)} {...props}>
      {children}
    </tr>
  );
}

export function TableHead({ className, children, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn('py-3.5 px-4 font-semibold text-warm-textMuted', className)} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ className, children, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('py-3.5 px-4 font-normal text-warm-text align-middle', className)} {...props}>
      {children}
    </td>
  );
}
