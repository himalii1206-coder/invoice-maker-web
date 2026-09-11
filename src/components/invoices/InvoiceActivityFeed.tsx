'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { invoicesApi } from '@/lib/invoices';
import { InvoiceActivityEntry, ActivityAction } from '@/types/invoice';
import { Button } from '@/components/ui/Button';
import {
  FilePlus2,
  Pencil,
  RefreshCw,
  Send,
  Eye,
  IndianRupee,
  Trash2,
  Ban,
  Copy,
  Download,
  Mail,
  BellRing,
  StickyNote,
  History,
  Loader2
} from 'lucide-react';

/**
 * Invoice history.
 *
 * Answers "who changed what, and when" without the user having to trust the
 * current state of the record - which is the whole point of keeping a trail on
 * a financial document.
 */

const ACTION_STYLES: Record<
  ActivityAction,
  { Icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  CREATED: { Icon: FilePlus2, className: 'bg-warm-accentLight text-warm-accent' },
  UPDATED: { Icon: Pencil, className: 'bg-warm-input text-warm-textMuted' },
  STATUS_CHANGED: { Icon: RefreshCw, className: 'bg-blue-50 text-blue-600' },
  SENT: { Icon: Send, className: 'bg-blue-50 text-blue-600' },
  VIEWED: { Icon: Eye, className: 'bg-warm-input text-warm-textMuted' },
  PAYMENT_RECORDED: { Icon: IndianRupee, className: 'bg-emerald-50 text-emerald-600' },
  PAYMENT_DELETED: { Icon: Trash2, className: 'bg-red-50 text-red-600' },
  CANCELLED: { Icon: Ban, className: 'bg-red-50 text-red-600' },
  DUPLICATED: { Icon: Copy, className: 'bg-warm-input text-warm-textMuted' },
  PDF_DOWNLOADED: { Icon: Download, className: 'bg-warm-input text-warm-textMuted' },
  EMAIL_SENT: { Icon: Mail, className: 'bg-blue-50 text-blue-600' },
  REMINDER_SENT: { Icon: BellRing, className: 'bg-amber-50 text-amber-600' },
  NOTE_LINKED: { Icon: StickyNote, className: 'bg-warm-input text-warm-textMuted' },
  DELETED: { Icon: Trash2, className: 'bg-red-50 text-red-600' }
};

const PAGE_SIZE = 15;

/** "3 hours ago" reads better than a timestamp for recent events. */
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

export interface InvoiceActivityFeedProps {
  invoiceId: string;
  /** Bumped by the parent after an action, to pull the new entry in. */
  refreshKey?: number;
}

export function InvoiceActivityFeed({ invoiceId, refreshKey = 0 }: InvoiceActivityFeedProps) {
  const [activities, setActivities] = useState<InvoiceActivityEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // A refresh resets to the first page, where any new entry will be.
  useEffect(() => {
    setPage(1);
  }, [refreshKey, invoiceId]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const result = await invoicesApi.activity(invoiceId, { page, limit: PAGE_SIZE });

        if (cancelled) return;

        // Page 1 replaces; later pages append, so "load more" accumulates.
        setActivities((prev) =>
          page === 1 ? result.activities : [...prev, ...result.activities]
        );
        setTotalPages(result.meta.totalPages || 1);
      } catch {
        if (!cancelled && page === 1) setActivities([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [invoiceId, page, refreshKey]);

  return (
    <div className="bg-warm-surface border border-warm-border/60 shadow-warm">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-warm-border/50">
        <History className="w-4 h-4 text-warm-accent" />
        <h3 className="text-sm font-semibold text-warm-text tracking-tight">Activity</h3>
      </div>

      <div className="p-4">
        {isLoading && activities.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-6 text-xs text-warm-textMuted">
            <Loader2 className="w-4 h-4 animate-spin text-warm-accent" />
            Loading history...
          </div>
        ) : activities.length === 0 ? (
          <p className="text-xs text-warm-textMuted text-center py-6">
            No activity recorded yet.
          </p>
        ) : (
          <ol className="space-y-0">
            {activities.map((entry, index) => {
              const config = ACTION_STYLES[entry.action] ?? ACTION_STYLES.UPDATED;
              const { Icon } = config;
              const isLast = index === activities.length - 1;

              return (
                <li key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {/* Connector line, omitted on the final entry. */}
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className="absolute left-[13px] top-7 bottom-0 w-px bg-warm-border"
                    />
                  )}

                  <span
                    className={cn(
                      'relative z-10 w-7 h-7 shrink-0 flex items-center justify-center',
                      config.className
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </span>

                  <div className="min-w-0 pt-0.5">
                    <p className="text-xs text-warm-text leading-snug">{entry.description}</p>
                    <p className="text-[11px] text-warm-textSubtle mt-0.5">
                      {relativeTime(entry.createdAt)}
                      {entry.user && (
                        <>
                          {' · '}
                          {entry.user.firstName} {entry.user.lastName}
                        </>
                      )}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {page < totalPages && (
          <div className="pt-3 mt-1 border-t border-warm-border/50">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              isLoading={isLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              Load older activity
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
