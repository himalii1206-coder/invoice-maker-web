'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/ui/Logo';
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  Building2,
  BarChart3,
  Settings,
  X,
  Receipt,
  Truck
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { company, can } = useAuth();

  // `requires` mirrors the permission the API checks for that area, so a role
  // is never shown a link to a page whose data it cannot load.
  const navigationGroup = [
    {
      label: 'Main',
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }
      ]
    },
    {
      label: 'Sales',
      items: [
        { name: 'Tax Invoices', href: '/invoices', icon: FileText },
        { name: 'Customers', href: '/customers', icon: Users },
        { name: 'Products & Services', href: '/products', icon: Package }
      ]
    },
    {
      label: 'Purchases',
      items: [
        { name: 'Purchase Bills', href: '/purchases', icon: Receipt, requires: 'purchase:write' },
        { name: 'Vendors / Suppliers', href: '/vendors', icon: Truck, requires: 'purchase:write' }
      ]
    },
    {
      label: 'Business',
      items: [
        { name: 'Company Profile', href: '/company', icon: Building2 }
      ]
    },
    {
      label: 'Reports',
      items: [
        { name: 'Analytics', href: '/analytics', icon: BarChart3, requires: 'report:read' }
      ]
    },
    {
      label: 'System',
      items: [
        { name: 'Settings', href: '/settings', icon: Settings }
      ]
    }
  ];

  const visibleGroups = navigationGroup
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !('requires' in item) || can(item.requires as any))
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-warm-text/40 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-50 w-64 bg-warm-surface border-r border-warm-border/70 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 rounded-none',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header with Logo */}
        <div className="h-16 px-6 border-b border-warm-border/50 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
              <Logo className="w-8 h-8" size={32} />
            </div>
            <div>
              <span className="font-bold text-base text-warm-text tracking-tight block leading-none">
                InvoiceMaker
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-warm-textSubtle block mt-0.5">
                Billing SaaS
              </span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="p-1 rounded-none text-warm-textMuted hover:bg-warm-input lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Company Quick Badge */}
        {/* {company && (
          <div className="px-5 py-3 border-b border-warm-border/40 bg-warm-accentLight/40 rounded-none">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-warm-textSubtle">
              Active Organization
            </p>
            <p className="text-xs font-bold text-warm-text truncate mt-0.5">
              {company.name}
            </p>
          </div>
        )} */}

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {visibleGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-warm-textSubtle mb-2">
                {group.label}
              </p>
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 text-xs font-semibold transition-colors rounded-none',
                      isActive
                        ? 'bg-warm-accent text-white shadow-warm'
                        : 'text-warm-textMuted hover:text-warm-text hover:bg-warm-input'
                    )}
                  >
                    <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-warm-textMuted')} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-warm-border/50 text-[11px] text-warm-textSubtle text-center">
          InvoiceMaker SaaS v1.0.0
        </div>
      </aside>
    </>
  );
}
