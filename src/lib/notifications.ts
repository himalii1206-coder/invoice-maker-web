import { api } from './api';
import { ApiResponse } from '@/types/index';
import { NotificationEvent } from '@/types/invoice';

export interface AppNotification {
  id: string;
  event: NotificationEvent;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export const NOTIFICATION_EVENT_LABELS: Record<
  NotificationEvent,
  { label: string; description: string }
> = {
  INVOICE_CREATED: {
    label: 'Invoice Created',
    description: 'When a new invoice is finalized'
  },
  PAYMENT_RECEIVED: {
    label: 'Payment Received',
    description: 'When a client pays against an invoice'
  },
  INVOICE_OVERDUE: {
    label: 'Invoice Overdue Alert',
    description: 'When an invoice passes its payment deadline'
  },
  INVOICE_PAID: {
    label: 'Invoice Fully Settled',
    description: 'When an invoice balance reaches zero'
  },
  CUSTOMER_ADDED: {
    label: 'Customer Added',
    description: 'When a new customer profile is registered'
  },
  NOTE_ISSUED: {
    label: 'Credit / Debit Note Issued',
    description: 'When an adjustment note is generated'
  }
};

export const notificationsApi = {
  async list(params: { page?: number; limit?: number; unreadOnly?: boolean } = {}): Promise<{
    notifications: AppNotification[];
    unreadCount: number;
  }> {
    const { data } = await api.get<
      ApiResponse<{ notifications: AppNotification[]; unreadCount: number }>
    >('/notifications', {
      params: {
        page: params.page,
        limit: params.limit,
        // The API reads this as a string flag; omit it rather than send "false".
        ...(params.unreadOnly ? { unreadOnly: 'true' } : {})
      }
    });

    return data.data ?? { notifications: [], unreadCount: 0 };
  },

  async markRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`);
  },

  async markAllRead(): Promise<void> {
    await api.patch('/notifications/read-all');
  },

  async clear(): Promise<void> {
    await api.delete('/notifications');
  }
};
