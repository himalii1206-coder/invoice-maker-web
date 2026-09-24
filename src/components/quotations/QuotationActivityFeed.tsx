'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { QuotationActivityEntry } from '@/types/quotation';
import {
  FilePlus2,
  Pencil,
  Send,
  CheckCircle2,
  XCircle,
  Ban,
  Copy,
  ArrowRightLeft,
  Download,
  History
} from 'lucide-react';

const ACTION_STYLES: Record<
  string,
  { Icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  CREATED: { Icon: FilePlus2, className: 'bg-warm-accent-light text-warm-accent' },
  UPDATED: { Icon: Pencil, className: 'bg-warm-input text-warm-textMuted' },
  SENT: { Icon: Send, className: 'bg-blue-50 text-blue-600' },
  ACCEPTED: { Icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-600' },
  REJECTED: { Icon: XCircle, className: 'bg-red-50 text-red-600' },
  CANCELLED: { Icon: Ban, className: 'bg-red-50 text-red-600' },
  DUPLICATED: { Icon: Copy, className: 'bg-warm-input text-warm-textMuted' },
  CONVERTED: { Icon: ArrowRightLeft, className: 'bg-purple-50 text-purple-600' },
  PDF_DOWNLOADED: { Icon: Download, className: 'bg-warm-input text-warm-textMuted' }
};

const relativeTime = (value: string): string => {
  const then = new Date(value).getTime();
  const diffSeconds = Math.round((Date.now() - then) / 1000);

  if (diffSeconds < 60) return 'just now';
  if (diffSeconds < 3600) {
    const minutes = Math.floor(diffSeconds / 60);
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  if (diffSeconds < 604800) {
    const days = Math.floor(diffSeconds / 86400);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const formatActivityDescription = (rawText: string | null | undefined, action: string): string => {
  if (!rawText) return action.replace(/_/g, ' ');
  // Strip redundant starting prefixes like "Quotation QT-1020 ", "Quotation #1020 ", or "Quotation "
  const cleaned = rawText.replace(/^Quotation(\s+[A-Za-z0-9\-_/]+)?\s+/i, '');
  if (!cleaned) return rawText;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

export interface QuotationActivityFeedProps {
  activities: QuotationActivityEntry[];
}

export function QuotationActivityFeed({ activities }: QuotationActivityFeedProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className="py-8 text-center text-warm-textMuted bg-warm-surface border border-warm-border/60 shadow-warm">
        <History className="w-8 h-8 mx-auto mb-2 text-warm-border" />
        <p className="text-xs">No activity recorded yet</p>
      </div>
    );
  }

  return (
    <div className="bg-warm-surface border border-warm-border/60 shadow-warm">
      <div className="px-4 py-3 border-b border-warm-border/50">
        <h3 className="text-sm font-semibold text-warm-text tracking-tight flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-warm-accent" />
          Activity History
        </h3>
      </div>
      <div className="p-4 space-y-4 relative before:absolute before:inset-y-4 before:left-[1.85rem] before:w-0.5 before:bg-warm-border/60">
        {activities.map((act) => {
          const style = ACTION_STYLES[act.action] ?? {
            Icon: History,
            className: 'bg-warm-input text-warm-textMuted'
          };
          const { Icon } = style;
          const userObj = act.user || act.createdBy;
          const userText = userObj
            ? `${userObj.firstName} ${userObj.lastName || ''}`.trim() || userObj.email || 'User'
            : 'System';
          const descriptionText = formatActivityDescription(act.description || act.details, act.action);

          return (
            <div key={act.id} className="relative flex items-start gap-3 pl-1">
              <div
                className={cn(
                  'w-6 h-6 rounded-none flex items-center justify-center ring-2 ring-warm-surface z-10 shrink-0 text-xs',
                  style.className
                )}
              >
                <Icon className="w-3 h-3" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs font-semibold text-warm-text leading-snug">
                    {descriptionText}
                  </p>
                  <span className="text-[10px] text-warm-textMuted shrink-0">
                    {relativeTime(act.createdAt)}
                  </span>
                </div>
                <p className="text-[11px] text-warm-textSubtle mt-0.5">
                  by <span className="font-medium text-warm-text">{userText}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
