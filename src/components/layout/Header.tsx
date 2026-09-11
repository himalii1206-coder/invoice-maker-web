'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getInitials } from '@/lib/utils';
import { Button } from '../ui/Button';
import {
  Menu,
  Plus,
  Search,
  Bell,
  User as UserIcon,
  LogOut,
  ChevronDown
} from 'lucide-react';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
}

export function Header({ onOpenMobileSidebar }: HeaderProps) {
  const { user, company, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 bg-warm-surface border-b border-warm-border/70 px-4 sm:px-8 flex items-center justify-between shadow-warm rounded-none">
      {/* Left section: Mobile menu & Search */}
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenMobileSidebar}
          className="p-2 text-warm-textMuted hover:text-warm-text hover:bg-warm-input lg:hidden transition-colors rounded-none"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Quick Search Mockup */}
        <div className="relative hidden sm:block w-64 md:w-80">
          <Search className="w-4 h-4 text-warm-textSubtle absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search invoices, customers, products..."
            className="w-full h-9 pl-9 pr-4 bg-warm-input/70 text-xs text-warm-text placeholder:text-warm-textSubtle rounded-none border border-warm-border/50 focus:outline-none focus:ring-2 focus:ring-warm-accent/40 focus:bg-warm-input transition-all"
          />
        </div>
      </div>

      {/* Right section: Quick actions & User menu */}
      <div className="flex items-center gap-3">
        <Link href="/invoices">
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>
            <span className="hidden sm:inline">New Invoice</span>
            <span className="sm:hidden">Invoice</span>
          </Button>
        </Link>

        {/* Notifications Icon */}
        <button
          className="p-2 text-warm-textMuted hover:text-warm-text hover:bg-warm-input transition-colors relative rounded-none"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-none bg-warm-accent" />
        </button>

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-warm-border/60 mx-1" />

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 hover:bg-warm-input transition-colors focus:outline-none rounded-none"
          >
            <div className="w-8 h-8 bg-warm-accent text-white flex items-center justify-center font-bold text-xs shadow-warm rounded-none">
              {getInitials(user?.firstName, user?.lastName)}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-bold text-warm-text leading-tight">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[10px] text-warm-textMuted leading-tight truncate max-w-[120px]">
                {company?.name || user?.email}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-warm-textMuted hidden md:block" />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-warm-surface shadow-warmLg border border-warm-border/80 z-50 py-1 animate-in fade-in zoom-in-95 duration-150 rounded-none">
                <div className="px-4 py-3 border-b border-warm-border/50">
                  <p className="text-xs font-bold text-warm-text">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-warm-textMuted truncate">{user?.email}</p>
                </div>

                <div className="py-1">
                  <Link
                    href="/company"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-warm-textMuted hover:text-warm-text hover:bg-warm-input transition-colors"
                  >
                    <UserIcon className="w-4 h-4" />
                    <span>Company Settings</span>
                  </Link>
                </div>

                <div className="border-t border-warm-border/50 py-1">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
