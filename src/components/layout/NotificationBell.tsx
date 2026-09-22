'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { notificationsApi, AppNotification } from '@/lib/notifications';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';

/** Background refresh interval while the dashboard is open. */
const POLL_INTERVAL_MS = 60_000;

const relativeTime = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';

  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return 'just now';

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

/**
 * In-app notification tray.
 *
 * Which events land here is decided server-side from Settings → Notifications,
 * so this only has to render whatever arrives. Browser alerts are raised for
 * newly-arrived items when the business has that channel switched on and the
 * viewer has granted permission.
 */
export function NotificationBell() {
  const router = useRouter();
  const { invoiceSettings } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Ids already seen, so a browser alert is raised once per notification
  // rather than on every poll.
  const announcedIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  const browserAlertsOn = Boolean(invoiceSettings?.notifyBrowser);

  const load = useCallback(async () => {
    try {
      const result = await notificationsApi.list({ limit: 15 });
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);

      if (browserAlertsOn && typeof window !== 'undefined' && 'Notification' in window) {
        // The very first load is history, not news - never alert for it.
        if (!isFirstLoad.current && Notification.permission === 'granted') {
          result.notifications
            .filter((item) => !item.isRead && !announcedIds.current.has(item.id))
            .slice(0, 3)
            .forEach((item) => {
              new Notification(item.title, { body: item.body ?? undefined, tag: item.id });
            });
        }
        result.notifications.forEach((item) => announcedIds.current.add(item.id));
      }

      isFirstLoad.current = false;
    } catch {
      // A failed poll is not worth interrupting the user for; the next one
      // will pick the list back up.
    } finally {
      setIsLoading(false);
    }
  }, [browserAlertsOn]);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const handleOpenNotification = async (notification: AppNotification) => {
    setIsOpen(false);

    if (!notification.isRead) {
      // Optimistic: the tray should not still show it as unread while the
      // request is in flight.
      setNotifications((previous) =>
        previous.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item))
      );
      setUnreadCount((count) => Math.max(0, count - 1));
      await notificationsApi.markRead(notification.id).catch(() => load());
    }

    if (notification.link) router.push(notification.link);
  };

  const handleMarkAllRead = async () => {
    setNotifications((previous) => previous.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
    await notificationsApi.markAllRead().catch(() => load());
  };

  const handleConfirmClear = async () => {
    setIsClearing(true);
    try {
      setNotifications([]);
      setUnreadCount(0);
      setIsClearConfirmOpen(false);
      setIsOpen(false);
      await notificationsApi.clear().catch(() => load());
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="relative p-2 text-warm-textMuted hover:text-warm-text hover:bg-warm-input/80 transition-colors rounded-full focus:outline-none"
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-warm-accent text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-warm-surface rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-warm-surface shadow-warmLg border border-warm-border/80 z-50 animate-in fade-in zoom-in-95 duration-150 rounded-none">
            <div className="px-4 py-3 border-b border-warm-border/50 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-warm-text uppercase tracking-wider">
                Notifications
              </span>

              {notifications.length > 0 && (
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="p-1.5 text-warm-textMuted hover:text-warm-accent transition-colors"
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsClearConfirmOpen(true);
                    }}
                    className="p-1.5 text-warm-textMuted hover:text-red-600 transition-colors"
                    title="Clear all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <p className="px-4 py-8 text-xs text-warm-textMuted text-center">Loading...</p>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-8 text-center space-y-1">
                  <Bell className="w-6 h-6 text-warm-textSubtle mx-auto" />
                  <p className="text-xs text-warm-textMuted">You are all caught up.</p>
                  <p className="text-[11px] text-warm-textSubtle">
                    Choose which events alert you in Settings.
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <button
                    type="button"
                    key={notification.id}
                    onClick={() => handleOpenNotification(notification)}
                    className={`w-full text-left px-4 py-3 border-b border-warm-border/30 last:border-0 hover:bg-warm-input/50 transition-colors flex gap-2.5 ${
                      notification.isRead ? '' : 'bg-warm-accentLight/20'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 mt-1.5 shrink-0 rounded-full ${
                        notification.isRead ? 'bg-transparent' : 'bg-warm-accent'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-warm-text">{notification.title}</p>
                      {notification.body && (
                        <p className="text-[11px] text-warm-textMuted truncate">
                          {notification.body}
                        </p>
                      )}
                      <p className="text-[10px] text-warm-textSubtle mt-0.5">
                        {relativeTime(notification.createdAt)}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Clear All Notifications Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={handleConfirmClear}
        title="Clear all notifications?"
        message="Are you sure you want to dismiss and clear all notification history?"
        confirmLabel="Clear All"
        isDanger
        isLoading={isClearing}
      />
    </div>
  );
}
