'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingState({ message = 'Loading content...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-warm-textMuted space-y-3">
      <Loader2 className="w-8 h-8 animate-spin text-warm-accent" />
      <p className="text-xs font-medium">{message}</p>
    </div>
  );
}
