'use client';

import React, { TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, required, id, disabled, ...props }, ref) => {
    const areaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={areaId}
            className="block text-xs font-semibold uppercase tracking-wider text-warm-textMuted"
          >
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <textarea
          id={areaId}
          ref={ref}
          disabled={disabled}
          className={cn(
            'w-full min-h-[90px] p-3 bg-warm-input text-warm-text placeholder:text-warm-textSubtle text-sm rounded-none border border-warm-border/60 transition-colors focus:outline-none focus:ring-2 focus:ring-warm-accent/40 focus:border-warm-accent disabled:opacity-60 disabled:cursor-not-allowed resize-y',
            error && 'border-red-500 focus:ring-red-500/40 focus:border-red-500',
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-red-600 mt-1 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-warm-textSubtle mt-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
