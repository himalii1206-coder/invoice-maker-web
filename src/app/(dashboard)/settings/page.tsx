'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAuth } from '@/context/AuthContext';
import { invoiceSettingsApi } from '@/lib/invoices';
import { companyApi, CompanyProfile, UpdateCompanyPayload } from '@/lib/company';
import { getApiErrorMessage } from '@/lib/api';
import {
  InvoiceSettings,
  InvoiceSettingsPayload,
  InvoiceReferenceData
} from '@/types/invoice';
import { InvoiceSettingsSection } from '@/components/settings/InvoiceSettingsSection';
import { GstTaxSettingsSection } from '@/components/settings/GstTaxSettingsSection';
import { PaymentSettingsSection } from '@/components/settings/PaymentSettingsSection';
import { TemplateSettingsSection } from '@/components/settings/TemplateSettingsSection';
import { EmailReminderSettingsSection } from '@/components/settings/EmailReminderSettingsSection';
import { NotificationSettingsSection } from '@/components/settings/NotificationSettingsSection';
import { CustomerProductSettingsSection } from '@/components/settings/CustomerProductSettingsSection';
import { TeamSettingsSection } from '@/components/settings/TeamSettingsSection';
import { SecuritySettingsSection } from '@/components/settings/SecuritySettingsSection';
import { DataBackupSection } from '@/components/settings/DataBackupSection';
import { toast } from 'react-toastify';
import {
  FileText,
  Percent,
  Landmark,
  Layout,
  Mail,
  Bell,
  Users,
  Package,
  Shield,
  Database,
  Search,
  Lock
} from 'lucide-react';

type SettingsTab =
  | 'invoice'
  | 'gst'
  | 'payment'
  | 'template'
  | 'customer-product'
  | 'email'
  | 'notifications'
  | 'team'
  | 'security'
  | 'data';

interface NavItem {
  id: SettingsTab;
  label: string;
  description: string;
  icon: React.ReactNode;
  /** Permission key the server checks for this tab, when it gates one. */
  requires?: 'settings:write' | 'company:write' | 'team:read';
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Operations & Invoicing',
    items: [
      {
        id: 'invoice',
        label: 'Invoice Settings',
        description: 'Prefix, numbering format & column toggles',
        icon: <FileText className="w-4 h-4" />
      },
      {
        id: 'gst',
        label: 'GST & Tax Settings',
        description: 'Tax slabs, pricing mode & HSN rules',
        icon: <Percent className="w-4 h-4" />
      },
      {
        id: 'payment',
        label: 'Payment & Banking',
        description: 'Bank accounts, IFSC & UPI handle',
        icon: <Landmark className="w-4 h-4" />,
        requires: 'company:write'
      },
      {
        id: 'template',
        label: 'PDF & Template Style',
        description: 'Themes, typography & layout placement',
        icon: <Layout className="w-4 h-4" />
      },
      {
        id: 'customer-product',
        label: 'Customer & Products',
        description: 'SKU prefixes, default units & fields',
        icon: <Package className="w-4 h-4" />
      }
    ]
  },
  {
    title: 'Automations & Alerts',
    items: [
      {
        id: 'email',
        label: 'Email & Reminders',
        description: 'Sender identity & automated payment reminders',
        icon: <Mail className="w-4 h-4" />
      },
      {
        id: 'notifications',
        label: 'Notification Channels',
        description: 'Event triggers & delivery channels',
        icon: <Bell className="w-4 h-4" />
      }
    ]
  },
  {
    title: 'Team & Security',
    items: [
      {
        id: 'team',
        label: 'User & Team Roles',
        description: 'Collaborators, roles & permission matrix',
        icon: <Users className="w-4 h-4" />,
        requires: 'team:read'
      },
      {
        id: 'security',
        label: 'Security & Sessions',
        description: 'Password, 2FA & connected devices',
        icon: <Shield className="w-4 h-4" />
      }
    ]
  },
  {
    title: 'Data & Backup',
    items: [
      {
        id: 'data',
        label: 'Data, Backup & Export',
        description: 'CSV exports, JSON archive & company backup',
        icon: <Database className="w-4 h-4" />
      }
    ]
  }
];

export default function SettingsPage() {
  const { refreshUser, can } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('invoice');
  const [searchQuery, setSearchQuery] = useState('');
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [reference, setReference] = useState<InvoiceReferenceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Mirrors the server's own rules, so a tab is never offered for a save the
  // API would reject.
  const canEditSettings = can('settings:write');
  const canEditCompany = can('company:write');

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [settings, company, referenceData] = await Promise.all([
          invoiceSettingsApi.get(),
          companyApi.get(),
          invoiceSettingsApi.referenceData()
        ]);
        setInvoiceSettings(settings);
        setCompanyProfile(company);
        setReference(referenceData);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Could not load your business configuration'));
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSaveInvoiceSettings = async (payload: InvoiceSettingsPayload) => {
    setIsSaving(true);
    try {
      const updated = await invoiceSettingsApi.update(payload);
      setInvoiceSettings(updated);
      await refreshUser();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCompany = async (payload: UpdateCompanyPayload) => {
    setIsSaving(true);
    try {
      const updated = await companyApi.update(payload);
      setCompanyProfile(updated);
      await refreshUser();
    } finally {
      setIsSaving(false);
    }
  };

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.requires || can(item.requires))
  })).filter((group) => group.items.length > 0);

  // A tab hidden by permissions must not stay selected.
  useEffect(() => {
    const isVisible = visibleGroups.some((group) =>
      group.items.some((item) => item.id === activeTab)
    );
    if (!isLoading && !isVisible && visibleGroups[0]?.items[0]) {
      setActiveTab(visibleGroups[0].items[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, activeTab, canEditCompany]);

  return (
    <DashboardLayout>
      <PageHeader
        title="Settings & Configuration"
        description="System-wide defaults, numbering sequences, tax regimes, styling templates, and team security."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings' }
        ]}
      />

      {isLoading || !invoiceSettings || !companyProfile || !reference ? (
        <div className="py-16 bg-warm-surface border border-warm-border/60 shadow-warm">
          <LoadingState message="Loading business configuration..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Navigation Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-warm-surface border border-warm-border/70 p-4 shadow-warm space-y-4">
              {/* Quick Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-warm-textMuted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search settings..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-warm-input border border-warm-border text-warm-text focus:outline-none focus:border-warm-accent"
                />
              </div>

              {/* Categorized Nav Groups */}
              <div className="space-y-4">
                {visibleGroups.map((group, gIdx) => {
                  const filteredItems = group.items.filter(
                    (item) =>
                      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      item.description.toLowerCase().includes(searchQuery.toLowerCase())
                  );

                  if (filteredItems.length === 0) return null;

                  return (
                    <div key={gIdx} className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-warm-textSubtle px-2 block">
                        {group.title}
                      </span>

                      <div className="space-y-0.5">
                        {filteredItems.map((item) => {
                          const isActive = activeTab === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setActiveTab(item.id)}
                              className={`w-full text-left p-2.5 flex items-start gap-2.5 transition-all border ${
                                isActive
                                  ? 'bg-warm-accentLight/50 border-warm-accent text-warm-accent font-bold'
                                  : 'bg-transparent border-transparent text-warm-text hover:bg-warm-input/50'
                              }`}
                            >
                              <div
                                className={`p-1.5 shrink-0 ${
                                  isActive
                                    ? 'bg-warm-accent text-white'
                                    : 'bg-warm-input text-warm-textMuted'
                                }`}
                              >
                                {item.icon}
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-semibold block truncate">
                                  {item.label}
                                </span>
                                <span className="text-[10px] text-warm-textMuted block truncate font-normal">
                                  {item.description}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {!canEditSettings && (
              <div className="bg-warm-surface border border-warm-border/70 p-3.5 shadow-warm flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-warm-textMuted shrink-0 mt-0.5" />
                <p className="text-[11px] text-warm-textMuted">
                  Your role can view these settings but not change them. Ask a business owner or
                  admin to make edits.
                </p>
              </div>
            )}
          </div>

          {/* Right Content Pane */}
          <div className="lg:col-span-8">
            {activeTab === 'invoice' && (
              <InvoiceSettingsSection
                settings={invoiceSettings}
                onSave={handleSaveInvoiceSettings}
                isSaving={isSaving}
                canEdit={canEditSettings}
              />
            )}

            {activeTab === 'gst' && (
              <GstTaxSettingsSection
                settings={invoiceSettings}
                company={companyProfile}
                gstRates={reference.gstRates}
                onSave={handleSaveInvoiceSettings}
                isSaving={isSaving}
                canEdit={canEditSettings}
              />
            )}

            {activeTab === 'payment' && (
              <PaymentSettingsSection
                company={companyProfile}
                onSave={handleSaveCompany}
                isSaving={isSaving}
                canEdit={canEditCompany}
              />
            )}

            {activeTab === 'template' && (
              <TemplateSettingsSection
                settings={invoiceSettings}
                onSave={handleSaveInvoiceSettings}
                isSaving={isSaving}
                canEdit={canEditSettings}
              />
            )}

            {activeTab === 'customer-product' && (
              <CustomerProductSettingsSection
                settings={invoiceSettings}
                units={reference.units}
                onSave={handleSaveInvoiceSettings}
                isSaving={isSaving}
                canEdit={canEditSettings}
              />
            )}

            {activeTab === 'email' && (
              <EmailReminderSettingsSection
                settings={invoiceSettings}
                company={companyProfile}
                emailConfigured={reference.email.configured}
                onSave={handleSaveInvoiceSettings}
                isSaving={isSaving}
                canEdit={canEditSettings}
              />
            )}

            {activeTab === 'notifications' && (
              <NotificationSettingsSection
                settings={invoiceSettings}
                emailConfigured={reference.email.configured}
                onSave={handleSaveInvoiceSettings}
                isSaving={isSaving}
                canEdit={canEditSettings}
              />
            )}

            {activeTab === 'team' && <TeamSettingsSection />}

            {activeTab === 'security' && <SecuritySettingsSection />}

            {activeTab === 'data' && <DataBackupSection />}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
