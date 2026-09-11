'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { User, LogOut, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { user, logout } = useAuth();

  return (
    <DashboardLayout>
      <PageHeader
        title="Account Settings"
        description="Manage your account profile, security credentials, and active sessions."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings' }
        ]}
      />

      <div className="max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>User Profile</CardTitle>
              <CardDescription>Your personal account parameters</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 bg-warm-input/60 rounded-xl">
              <span className="text-warm-textMuted flex items-center gap-2 font-medium">
                <User className="w-4 h-4 text-warm-accent" /> Full Name
              </span>
              <span className="font-bold text-warm-text">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-warm-input/60 rounded-xl">
              <span className="text-warm-textMuted font-medium">Email Address</span>
              <span className="font-bold text-warm-text">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-warm-input/60 rounded-xl">
              <span className="text-warm-textMuted font-medium">Role</span>
              <span className="font-semibold text-warm-accent uppercase">{user?.role}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Session & Security</CardTitle>
              <CardDescription>JWT token rotation and session revocation</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-warm-input/60 rounded-xl text-xs">
              <span className="text-warm-textMuted flex items-center gap-2 font-medium">
                <Shield className="w-4 h-4 text-emerald-600" /> Refresh Token Rotation
              </span>
              <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                Active & Enforced
              </span>
            </div>

            <Button
              variant="danger"
              size="sm"
              leftIcon={<LogOut className="w-4 h-4" />}
              onClick={logout}
            >
              Sign Out of Account
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
