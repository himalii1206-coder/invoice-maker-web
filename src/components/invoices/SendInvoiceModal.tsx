'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { invoicesApi } from '@/lib/invoices';
import { apiErrorMessage } from '@/lib/customers';
import { Invoice } from '@/types/invoice';
import { Mail, Paperclip, AlertTriangle } from 'lucide-react';

/**
 * Emails an invoice or a payment reminder.
 *
 * Both live in one modal because the form is identical - only the endpoint and
 * the default copy differ, and `mode` selects those.
 */

export interface SendInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  mode: 'invoice' | 'reminder';
  /** False when the server has no SMTP credentials configured. */
  emailConfigured: boolean;
  onSent: () => void;
}

export function SendInvoiceModal({
  isOpen,
  onClose,
  invoice,
  mode,
  emailConfigured,
  onSent
}: SendInvoiceModalProps) {
  const defaultRecipient = invoice.billingEmail ?? invoice.customer?.email ?? '';

  const [to, setTo] = useState(defaultRecipient);
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachPdf, setAttachPdf] = useState(true);
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTo(defaultRecipient);
    setCc('');
    setSubject('');
    setMessage('');
    setAttachPdf(mode === 'invoice');
    setError('');
  }, [isOpen, defaultRecipient, mode]);

  const submit = async () => {
    const recipient = to.trim();

    if (!recipient) {
      setError('Enter a recipient email address');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      setError('Enter a valid email address');
      return;
    }

    setIsSending(true);
    try {
      const payload = {
        to: recipient,
        cc: cc.trim() || undefined,
        subject: subject.trim() || undefined,
        message: message.trim() || undefined,
        attachPdf
      };

      if (mode === 'invoice') {
        await invoicesApi.email(invoice.id, payload);
        toast.success(`Invoice emailed to ${recipient}`);
      } else {
        await invoicesApi.remind(invoice.id, payload);
        toast.success(`Payment reminder sent to ${recipient}`);
      }

      onSent();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not send the email'));
    } finally {
      setIsSending(false);
    }
  };

  const isReminder = mode === 'reminder';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isReminder ? 'Send Payment Reminder' : 'Email Invoice'}
      description={`Invoice ${invoice.invoiceNumber} · ${invoice.billingName}`}
      maxWidth="lg"
    >
      {!emailConfigured ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-900">Email is not configured</p>
              <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                This server has no SMTP credentials, so invoices cannot be emailed yet. Add
                SMTP_HOST, SMTP_USER and SMTP_PASS to the backend environment, then restart it. In
                the meantime you can download the PDF and send it yourself.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Input
            label="To"
            required
            type="email"
            value={to}
            leftIcon={<Mail className="w-4 h-4" />}
            onChange={(e) => {
              setTo(e.target.value);
              setError('');
            }}
            error={error}
            placeholder="customer@example.com"
          />

          <Input
            label="CC"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            placeholder="accounts@example.com, manager@example.com"
            helperText="Separate multiple addresses with commas."
          />

          <Input
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={
              isReminder
                ? `Payment reminder: Invoice ${invoice.invoiceNumber}`
                : `Invoice ${invoice.invoiceNumber}`
            }
            helperText="Leave blank to use the default subject."
          />

          <Textarea
            label="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Leave blank to use the standard template."
            className="min-h-[90px]"
          />

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={attachPdf}
              onChange={(e) => setAttachPdf(e.target.checked)}
              className="w-4 h-4 accent-warm-accent cursor-pointer"
            />
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-warm-text">
              <Paperclip className="w-3.5 h-3.5 text-warm-textMuted" />
              Attach the invoice PDF
            </span>
          </label>

          {invoice.status === 'DRAFT' && mode === 'invoice' && (
            <p className="text-[11px] text-warm-textMuted bg-warm-accentLight/40 border border-warm-border/60 p-2.5 leading-relaxed">
              This invoice is still a draft. Sending it will also mark it as sent.
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={isSending}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={submit}
              isLoading={isSending}
              leftIcon={<Mail className="w-4 h-4" />}
            >
              {isReminder ? 'Send Reminder' : 'Send Invoice'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
