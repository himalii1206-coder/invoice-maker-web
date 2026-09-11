'use client';

import React, { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'flat' | 'outline';
}

export function Card({ className, children, variant = 'default', ...props }: CardProps) {
  const variants = {
    default: 'bg-warm-surface border border-warm-border/70 shadow-warm rounded-none',
    flat: 'bg-warm-surface border-none rounded-none',
    outline: 'bg-transparent border border-warm-border rounded-none'
  };

  return (
    <div className={cn(variants[variant], className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-5 border-b border-warm-border/50 flex items-center justify-between', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-base font-semibold text-warm-text tracking-tight', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-xs text-warm-textMuted mt-0.5', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-5', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-4 border-t border-warm-border/50 bg-warm-accentLight/30 rounded-none flex items-center justify-end gap-3', className)} {...props}>
      {children}
    </div>
  );
}
