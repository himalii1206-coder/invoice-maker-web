'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { customersApi } from '@/lib/customers';
import { productsApi } from '@/lib/products';
import { invoicesApi, invoiceSettingsApi } from '@/lib/invoices';
import { vendorsApi, purchaseBillsApi } from '@/lib/purchases';
import { companyApi } from '@/lib/company';
import { exportToCsv } from '@/lib/reports';
import {
  Database,
  Download,
  AlertTriangle,
  FileSpreadsheet,
  Archive,
  ShoppingCart,
  Building2
} from 'lucide-react';
import { toast } from 'react-toastify';

export function DataBackupSection() {
  const [isExporting, setIsExporting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Helper to fetch all customers across pages
  const fetchAllCustomers = async () => {
    let all: any[] = [];
    let page = 1;
    let totalPages = 1;
    while (page <= totalPages) {
      const res = await customersApi.list({ page, limit: 100 });
      all = all.concat(res.customers || []);
      totalPages = res.meta?.totalPages || 1;
      page += 1;
    }
    return all;
  };

  // Helper to fetch all products across pages
  const fetchAllProducts = async () => {
    let all: any[] = [];
    let page = 1;
    let totalPages = 1;
    while (page <= totalPages) {
      const res = await productsApi.list({ page, limit: 100 });
      all = all.concat(res.products || []);
      totalPages = res.meta?.totalPages || 1;
      page += 1;
    }
    return all;
  };

  // Helper to fetch all invoices across pages
  const fetchAllInvoices = async () => {
    let all: any[] = [];
    let page = 1;
    let totalPages = 1;
    while (page <= totalPages) {
      const res = await invoicesApi.list({ page, limit: 100 });
      all = all.concat(res.invoices || []);
      totalPages = res.meta?.totalPages || 1;
      page += 1;
    }
    return all;
  };

  // Helper to fetch all vendors across pages
  const fetchAllVendors = async () => {
    let all: any[] = [];
    let page = 1;
    let totalPages = 1;
    while (page <= totalPages) {
      const res = await vendorsApi.list({ page, limit: 100 });
      all = all.concat(res.vendors || []);
      totalPages = res.meta?.totalPages || 1;
      page += 1;
    }
    return all;
  };

  // Helper to fetch all purchase bills across pages
  const fetchAllPurchaseBills = async () => {
    let all: any[] = [];
    let page = 1;
    let totalPages = 1;
    while (page <= totalPages) {
      const res = await purchaseBillsApi.list({ page, limit: 100 });
      all = all.concat(res.purchaseBills || []);
      totalPages = res.meta?.totalPages || 1;
      page += 1;
    }
    return all;
  };

  const handleExportCustomers = async () => {
    try {
      setIsExporting(true);
      const customers = await fetchAllCustomers();
      if (customers.length === 0) {
        toast.info('No customers found to export');
        return;
      }
      const rows = customers.map((c) => ({
        Name: c.name,
        Type: c.type || 'BUSINESS',
        Email: c.email || '',
        Phone: c.phone || '',
        GSTIN: c.gstin || '',
        State: c.state || '',
        City: c.city || '',
        Address: c.address || '',
        PostalCode: c.postalCode || ''
      }));
      exportToCsv('Customers_Directory_Export', rows);
      toast.success(`Exported ${rows.length} customers successfully`);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to export customers directory');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportProducts = async () => {
    try {
      setIsExporting(true);
      const products = await fetchAllProducts();
      if (products.length === 0) {
        toast.info('No products found to export');
        return;
      }
      const rows = products.map((p) => ({
        Name: p.name,
        Code: p.productCode || '',
        Price: p.price,
        Unit: p.unit,
        TaxRate: `${p.taxRate}%`,
        HSN_SAC: p.hsnSacCode || ''
      }));
      exportToCsv('Products_Catalog_Export', rows);
      toast.success(`Exported ${rows.length} products successfully`);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to export products catalog');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportInvoices = async () => {
    try {
      setIsExporting(true);
      const invoices = await fetchAllInvoices();
      if (invoices.length === 0) {
        toast.info('No invoices found to export');
        return;
      }
      const rows = invoices.map((inv) => ({
        InvoiceNumber: inv.invoiceNumber,
        Customer: inv.customer?.name || inv.billingName || 'Customer',
        IssueDate: inv.issueDate ? String(inv.issueDate).split('T')[0] : '',
        DueDate: inv.dueDate ? String(inv.dueDate).split('T')[0] : '',
        Status: inv.status,
        TaxableAmount: inv.taxableAmount,
        CGST: inv.cgstAmount || 0,
        SGST: inv.sgstAmount || 0,
        IGST: inv.igstAmount || 0,
        TotalTax: inv.taxAmount,
        GrandTotal: inv.grandTotal,
        AmountPaid: inv.amountPaid,
        BalanceDue: inv.balanceDue
      }));
      exportToCsv('Invoices_Sales_Ledger_Export', rows);
      toast.success(`Exported ${rows.length} invoices successfully`);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to export invoices ledger');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportVendors = async () => {
    try {
      setIsExporting(true);
      const vendors = await fetchAllVendors();
      if (vendors.length === 0) {
        toast.info('No vendors found to export');
        return;
      }
      const rows = vendors.map((v) => ({
        Name: v.name,
        TradeName: v.tradeName || '',
        GSTIN: v.gstin || '',
        PAN: v.pan || '',
        Category: v.category || '',
        Phone: v.phone || '',
        Email: v.email || '',
        State: v.state || '',
        City: v.city || '',
        BankName: v.bankName || '',
        AccountNumber: v.accountNumber || '',
        IFSC: v.ifscCode || ''
      }));
      exportToCsv('Vendors_Directory_Export', rows);
      toast.success(`Exported ${rows.length} vendors successfully`);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to export vendors');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPurchaseBills = async () => {
    try {
      setIsExporting(true);
      const bills = await fetchAllPurchaseBills();
      if (bills.length === 0) {
        toast.info('No purchase bills found to export');
        return;
      }
      const rows = bills.map((b) => ({
        BillNumber: b.billNumber,
        VendorName: b.vendorName,
        VendorInvoiceNumber: b.vendorInvoiceNumber || '',
        BillDate: b.billDate ? String(b.billDate).split('T')[0] : '',
        DueDate: b.dueDate ? String(b.dueDate).split('T')[0] : '',
        Status: b.status,
        TaxableAmount: b.taxableAmount,
        TaxAmount: b.taxAmount,
        GrandTotal: b.grandTotal,
        AmountPaid: b.amountPaid,
        BalanceDue: b.balanceDue
      }));
      exportToCsv('Purchase_Bills_Ledger_Export', rows);
      toast.success(`Exported ${rows.length} purchase bills successfully`);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to export purchase bills');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFullBackup = async () => {
    try {
      setIsBackingUp(true);
      toast.info('Generating comprehensive enterprise JSON snapshot...');

      const [
        company,
        settings,
        customers,
        vendors,
        products,
        invoices,
        purchaseBills
      ] = await Promise.all([
        companyApi.get().catch(() => null),
        invoiceSettingsApi.get().catch(() => null),
        fetchAllCustomers().catch(() => []),
        fetchAllVendors().catch(() => []),
        fetchAllProducts().catch(() => []),
        fetchAllInvoices().catch(() => []),
        fetchAllPurchaseBills().catch(() => [])
      ]);

      const backupData = {
        meta: {
          app: 'InvoiceMaker Enterprise',
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          companyId: company?.id,
          companyName: company?.name
        },
        company,
        invoiceSettings: settings,
        customers,
        vendors,
        products,
        invoices,
        purchaseBills
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 10);
      link.setAttribute('href', url);
      link.setAttribute('download', `company_backup_${timestamp}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Complete JSON system backup downloaded successfully');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to create system backup archive');
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Export Data Spreadsheets */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-warm-accentLight text-warm-accent">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                Export Business Data
              </h3>
              <p className="text-xs text-warm-textMuted">
                Download structured CSV spreadsheets for CA audit, offline analysis, and accounting
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Invoices */}
            <div className="p-4 bg-warm-input/40 border border-warm-border/60 space-y-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-warm-text">Invoices Ledger</span>
              </div>
              <p className="text-[11px] text-warm-textMuted">
                All generated vouchers, taxable amounts, and settlements
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={handleExportInvoices}
                isLoading={isExporting}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Export Invoices CSV
              </Button>
            </div>

            {/* Customers */}
            <div className="p-4 bg-warm-input/40 border border-warm-border/60 space-y-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-700" />
                <span className="text-xs font-bold text-warm-text">Customer Directory</span>
              </div>
              <p className="text-[11px] text-warm-textMuted">
                Complete client profiles, GSTINs, phone numbers, and addresses
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={handleExportCustomers}
                isLoading={isExporting}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Export Customers CSV
              </Button>
            </div>

            {/* Products */}
            <div className="p-4 bg-warm-input/40 border border-warm-border/60 space-y-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-purple-700" />
                <span className="text-xs font-bold text-warm-text">Product &amp; SKU Catalog</span>
              </div>
              <p className="text-[11px] text-warm-textMuted">
                All inventory items, HSN/SAC codes, prices, and tax rates
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={handleExportProducts}
                isLoading={isExporting}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Export Products CSV
              </Button>
            </div>

            {/* Vendors */}
            <div className="p-4 bg-warm-input/40 border border-warm-border/60 space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-700" />
                <span className="text-xs font-bold text-warm-text">Vendor Directory</span>
              </div>
              <p className="text-[11px] text-warm-textMuted">
                Registered suppliers, GSTINs, bank accounts, and categories
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={handleExportVendors}
                isLoading={isExporting}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Export Vendors CSV
              </Button>
            </div>

            {/* Purchase Bills */}
            <div className="p-4 bg-warm-input/40 border border-warm-border/60 space-y-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-rose-700" />
                <span className="text-xs font-bold text-warm-text">Purchase Bills</span>
              </div>
              <p className="text-[11px] text-warm-textMuted">
                Inward supplier bills, ITC tax claims, and purchase totals
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={handleExportPurchaseBills}
                isLoading={isExporting}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Export Purchases CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Full System Backup Archive */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex items-center gap-2.5">
          <div className="p-1.5 bg-warm-accentLight text-warm-accent">
            <Archive className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
              Complete System Backup (JSON)
            </h3>
            <p className="text-xs text-warm-textMuted">
              Generate an instant portable archive of your company profile, settings, customers, vendors, invoices, and bills
            </p>
          </div>
        </div>

        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-warm-text block">
              Automated Full Database Snapshot
            </span>
            <p className="text-[11px] text-warm-textMuted">
              Exports all entities in standardized JSON format for offline safe-keeping and disaster recovery
            </p>
          </div>

          <Button
            size="sm"
            onClick={handleFullBackup}
            isLoading={isBackingUp}
            leftIcon={<Archive className="w-3.5 h-3.5" />}
          >
            Download JSON Backup
          </Button>
        </CardContent>
      </Card>

      {/* 3. Danger Zone */}
      <Card className="border-red-300 bg-red-50/20">
        <div className="p-5 border-b border-red-200 flex items-center gap-2.5">
          <div className="p-1.5 bg-red-100 text-red-700">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-900 uppercase tracking-wider">
              Danger Zone
            </h3>
            <p className="text-xs text-red-700">Irreversible and destructive account operations</p>
          </div>
        </div>

        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-red-50/60 border border-red-200">
            <div>
              <span className="text-xs font-bold text-red-900 block">Delete Company Profile</span>
              <span className="text-[11px] text-red-700">
                Permanently purge all invoices, customers, and purchase bills
              </span>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => toast.error('Please contact support to authorize company deletion')}
            >
              Delete Company
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
