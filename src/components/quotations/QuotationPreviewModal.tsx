'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import { Printer, Download, X, AlertCircle, Loader2, FileSpreadsheet } from 'lucide-react';
import { quotationsApi } from '@/lib/quotations';
import { openPdfBlob } from '@/lib/invoices';
import { apiErrorMessage } from '@/lib/customers';
import { Button } from '@/components/ui/Button';

export interface PdfPreviewQuotationTarget {
  id: string;
  quotationNumber: string;
  billingName?: string | null;
  customer?: { name: string } | null;
}

export interface QuotationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: PdfPreviewQuotationTarget | null;
}

export function QuotationPreviewModal({ isOpen, onClose, quotation }: QuotationPreviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !quotation?.id) {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      setPdfBlob(null);
      setPdfUrl(null);
      setError(null);
      setLoading(false);
      return;
    }

    let isSubscribed = true;
    let createdUrl: string | null = null;

    const loadPdf = async () => {
      setLoading(true);
      setError(null);
      try {
        const blob = await quotationsApi.fetchPdf(quotation.id);
        if (!isSubscribed) return;

        createdUrl = URL.createObjectURL(blob);
        setPdfBlob(blob);
        setPdfUrl(createdUrl);
      } catch (err: unknown) {
        if (!isSubscribed) return;
        const msg = apiErrorMessage(err, 'Failed to generate the quotation PDF');
        setError(msg);
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    void loadPdf();

    return () => {
      isSubscribed = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [isOpen, quotation?.id]);

  if (!isOpen || !mounted || !quotation) return null;

  const customerName = quotation.billingName || quotation.customer?.name || 'Customer';
  const cleanQNum = quotation.quotationNumber.replace(/[^a-zA-Z0-9._-]+/g, '-');
  const cleanCust = customerName.replace(/[^a-zA-Z0-9._-]+/g, '-');
  const fileName = `${cleanQNum}-${cleanCust}.pdf`;

  const handlePrint = () => {
    if (!pdfBlob && !pdfUrl) return;

    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      }
    } catch {
      // Fallback if sandbox restricts iframe print
    }

    if (pdfBlob) {
      openPdfBlob(pdfBlob, fileName, 'print');
    }
  };

  const handleDownload = () => {
    if (!pdfBlob) return;
    openPdfBlob(pdfBlob, fileName, 'download');
    toast.success(`Downloaded ${fileName}`);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl h-[92vh] max-h-[920px] bg-warm-surface shadow-warmLg border border-warm-border z-10 flex flex-col overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
      >
        {/* Header Toolbar */}
        <div className="px-5 py-3.5 bg-warm-surface text-warm-text flex flex-wrap items-center justify-between gap-3 border-b border-warm-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-warm-accent-light border border-warm-accent/20 flex items-center justify-center text-warm-accent shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-warm-text tracking-tight">
                  Quotation Preview: {quotation.quotationNumber}
                </h3>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-warm-accent-light text-warm-accent border border-warm-accent/30">
                  GST Quotation
                </span>
              </div>
              <p className="text-xs text-warm-textMuted mt-0.5">
                M/S: <span className="text-warm-text font-semibold">{customerName}</span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={loading || !pdfUrl}
              leftIcon={<Printer className="w-4 h-4 text-warm-accent" />}
              className="bg-warm-input border-warm-border text-warm-text hover:bg-warm-accent-light hover:text-warm-accent hover:border-warm-accent/40 font-medium whitespace-nowrap"
            >
              Print
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleDownload}
              disabled={loading || !pdfBlob}
              leftIcon={<Download className="w-4 h-4" />}
              className="bg-warm-accent hover:bg-warm-accent-hover text-white shadow-xs font-semibold whitespace-nowrap"
            >
              Download PDF
            </Button>

            <div className="h-6 w-px bg-warm-border mx-1 hidden sm:block" />

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-warm-textMuted hover:text-warm-text hover:bg-warm-input transition-colors cursor-pointer"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-warm-bg relative flex items-center justify-center overflow-hidden">
          {loading && (
            <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
              <Loader2 className="w-10 h-10 text-warm-accent animate-spin mb-3" />
              <p className="text-sm font-semibold text-warm-text">Generating Quotation PDF...</p>
              <p className="text-xs text-warm-textMuted mt-1">Applying GST calculations, terms, and custom quotation format</p>
            </div>
          )}

          {!loading && error && (
            <div className="max-w-md p-6 bg-warm-surface border border-red-200 shadow-warm text-center m-4">
              <div className="w-12 h-12 bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-semibold text-warm-text mb-1">Cannot Generate PDF</h4>
              <p className="text-xs text-warm-textMuted leading-relaxed mb-5">{error}</p>
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Close
                </Button>
                <Button
                  size="sm"
                  className="bg-warm-accent hover:bg-warm-accent-hover text-white font-semibold"
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    quotationsApi
                      .fetchPdf(quotation.id)
                      .then((blob) => {
                        const url = URL.createObjectURL(blob);
                        setPdfBlob(blob);
                        setPdfUrl(url);
                      })
                      .catch((e) => setError(apiErrorMessage(e, 'Failed to generate the quotation PDF')))
                      .finally(() => setLoading(false));
                  }}
                >
                  Retry
                </Button>
              </div>
            </div>
          )}

          {!loading && !error && pdfUrl && (
            <iframe
              ref={iframeRef}
              src={pdfUrl}
              title={`Quotation ${quotation.quotationNumber}`}
              className="w-full h-full border-0 bg-white"
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
