'use client';

import React, { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
  required?: boolean;
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      containerClassName,
      label,
      options,
      error,
      helperText,
      required,
      id,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={cn('w-full space-y-1.5', containerClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold uppercase tracking-wider text-warm-textMuted"
          >
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full h-10 pl-3.5 pr-8 bg-warm-input text-warm-text text-sm rounded-none border border-warm-border/60 appearance-none transition-colors focus:outline-none focus:ring-2 focus:ring-warm-accent/40 focus:border-warm-accent disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer',
              error && 'border-red-500 focus:ring-red-500/40 focus:border-red-500',
              className
            )}
            {...props}
          >
            {children ||
              options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
          </select>
          <ChevronDown className="w-4 h-4 text-warm-textMuted absolute right-3 pointer-events-none" />
        </div>
        {error ? (
          <p className="text-xs text-red-600 mt-1 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-warm-textSubtle mt-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
