'use client';

import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-none transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-warm-accent/40 disabled:opacity-60 disabled:cursor-not-allowed select-none';

    const variants = {
      primary: 'bg-warm-accent hover:bg-warm-accentHover text-white shadow-warm active:scale-[0.99]',
      secondary: 'bg-warm-input hover:bg-warm-borderLight text-warm-text border border-warm-border active:scale-[0.99]',
      outline: 'border border-warm-border hover:bg-warm-accentLight text-warm-text active:scale-[0.99]',
      ghost: 'text-warm-textMuted hover:text-warm-text hover:bg-warm-accentLight',
      danger: 'bg-red-600 hover:bg-red-700 text-white shadow-warm active:scale-[0.99]'
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2.5'
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
