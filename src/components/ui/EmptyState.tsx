'use client';

import React from 'react';
import { FileQuestion } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-warm-surface rounded-none border border-dashed border-warm-border/80">
      <div className="w-12 h-12 rounded-none bg-warm-input flex items-center justify-center text-warm-accent mb-4">
        {icon || <FileQuestion className="w-6 h-6" />}
      </div>
      <h3 className="text-base font-semibold text-warm-text tracking-tight">{title}</h3>
      {description && (
        <p className="text-xs text-warm-textMuted max-w-sm mt-1 mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
