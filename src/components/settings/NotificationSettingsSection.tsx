'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { InvoiceSettings, InvoiceSettingsPayload, NotificationEvent } from '@/types/invoice';
import { NOTIFICATION_EVENT_LABELS } from '@/lib/notifications';
import { Bell, Save, Mail, Globe, AlertTriangle } from 'lucide-react';
import { toast } from 'react-toastify';
import { getApiErrorMessage } from '@/lib/api';

interface NotificationSettingsSectionProps {
  settings: InvoiceSettings;
  emailConfigured: boolean;
  onSave: (payload: InvoiceSettingsPayload) => Promise<void>;
  isSaving: boolean;
  canEdit: boolean;
}

const EVENT_ORDER: NotificationEvent[] = [
  'INVOICE_CREATED',
  'PAYMENT_RECEIVED',
  'INVOICE_OVERDUE',
  'INVOICE_PAID',
  'CUSTOMER_ADDED',
  'NOTE_ISSUED'
];

export function NotificationSettingsSection({
  settings,
  emailConfigured,
  onSave,
  isSaving,
  canEdit
}: NotificationSettingsSectionProps) {
  const [events, setEvents] = useState<NotificationEvent[]>(settings.notifyEvents);
  const [notifyEmail, setNotifyEmail] = useState(settings.notifyEmail);
  const [notifyInApp, setNotifyInApp] = useState(settings.notifyInApp);
  const [notifyBrowser, setNotifyBrowser] = useState(settings.notifyBrowser);

  const toggleEvent = (event: NotificationEvent, enabled: boolean) => {
    setEvents((previous) =>
      enabled ? Array.from(new Set([...previous, event])) : previous.filter((e) => e !== event)
    );
  };

  /**
   * Browser alerts need the viewer's own consent; asking for it at save time
   * keeps the prompt tied to a deliberate click, which is what browsers expect.
   */
  const requestBrowserPermission = async (enabled: boolean) => {
    setNotifyBrowser(enabled);

    if (!enabled || typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setNotifyBrowser(false);
        toast.info('Browser alerts stay off until this site is allowed to show notifications');
      }
    } else if (Notification.permission === 'denied') {
      setNotifyBrowser(false);
      toast.info('Notifications are blocked for this site in your browser settings');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSave({
        notifyEvents: events,
        notifyEmail,
        notifyInApp,
        notifyBrowser
      });
      toast.success('Notification preferences updated');
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to update notification preferences'));
    }
  };

  const noChannels = !notifyEmail && !notifyInApp;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Notification Event Triggers */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-warm-accentLight text-warm-accent">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                Event Notification Triggers
              </h3>
              <p className="text-xs text-warm-textMuted">
                Choose which business events alert you and your team
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {EVENT_ORDER.map((event) => {
              const meta = NOTIFICATION_EVENT_LABELS[event];
              return (
                <label
                  key={event}
                  className="p-3.5 bg-warm-input/40 border border-warm-border/60 flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <span className="text-xs font-bold text-warm-text block">{meta.label}</span>
                    <span className="text-[11px] text-warm-textMuted">{meta.description}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={events.includes(event)}
                    onChange={(e) => toggleEvent(event, e.target.checked)}
                    disabled={!canEdit}
                    className="w-4 h-4 rounded-none border-warm-border text-warm-accent focus:ring-warm-accent"
                  />
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 2. Delivery Channels */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex items-center gap-2.5">
          <div className="p-1.5 bg-warm-accentLight text-warm-accent">
            <Globe className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
            Delivery Channels
          </h3>
        </div>

        <CardContent className="p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <label className="p-3.5 bg-warm-input/40 border border-warm-border/60 flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-warm-accent" />
                <span className="text-xs font-bold text-warm-text">Email Alerts</span>
              </div>
              <input
                type="checkbox"
                checked={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.checked)}
                disabled={!canEdit}
                className="w-4 h-4 rounded-none border-warm-border text-warm-accent focus:ring-warm-accent"
              />
            </label>

            <label className="p-3.5 bg-warm-input/40 border border-warm-border/60 flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-warm-accent" />
                <span className="text-xs font-bold text-warm-text">In-App Notifications</span>
              </div>
              <input
                type="checkbox"
                checked={notifyInApp}
                onChange={(e) => setNotifyInApp(e.target.checked)}
                disabled={!canEdit}
                className="w-4 h-4 rounded-none border-warm-border text-warm-accent focus:ring-warm-accent"
              />
            </label>

            <label className="p-3.5 bg-warm-input/40 border border-warm-border/60 flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-warm-accent" />
                <span className="text-xs font-bold text-warm-text">Browser Push Alerts</span>
              </div>
              <input
                type="checkbox"
                checked={notifyBrowser}
                onChange={(e) => requestBrowserPermission(e.target.checked)}
                disabled={!canEdit || !notifyInApp}
                className="w-4 h-4 rounded-none border-warm-border text-warm-accent focus:ring-warm-accent"
              />
            </label>
          </div>

          {!emailConfigured && notifyEmail && (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 p-2.5 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Email is not configured on this server, so alerts will only appear in the app until
              SMTP credentials are added.
            </p>
          )}

          {noChannels && (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 p-2.5 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              With both channels off, nothing will be recorded or sent for these events.
            </p>
          )}

          <p className="text-[11px] text-warm-textMuted">
            Browser alerts are shown by the dashboard while it is open, on top of in-app
            notifications.
          </p>
        </CardContent>
      </Card>

      {canEdit && (
        <div className="flex justify-end pt-2">
          <Button type="submit" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
            Save Notification Settings
          </Button>
        </div>
      )}
    </form>
  );
}
