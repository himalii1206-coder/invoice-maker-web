'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Mail, Lock, User, Building2, Phone, ArrowRight, ShieldCheck } from 'lucide-react';

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  businessName: z.string().min(2, 'Business name is required'),
  phone: z.string().optional(),
  gstin: z.string().optional()
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { register: registerAuth, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema)
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsSubmitting(true);
      await registerAuth(data);
    } catch {
      // Error handled by AuthContext toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-warm-bg flex items-center justify-center p-4 sm:p-6 my-8">
      <div className="w-full max-w-lg space-y-6">
        {/* Brand Logo & Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center mb-2">
            <Image
              src="/images/logo.png"
              alt="InvoiceMaker Logo"
              width={52}
              height={52}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-warm-text tracking-tight">
            Create Your Business Account
          </h1>
          <p className="text-xs text-warm-textMuted max-w-sm mx-auto">
            Set up your company profile and start creating professional GST invoices in seconds.
          </p>
        </div>

        {/* Register Form Card */}
        <div className="bg-warm-surface border border-warm-border/80 shadow-warmLg p-6 sm:p-8 space-y-6 rounded-none">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* User Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                placeholder="Ramesh"
                leftIcon={<User className="w-4 h-4" />}
                error={errors.firstName?.message}
                required
                {...register('firstName')}
              />
              <Input
                label="Last Name"
                placeholder="Kumar"
                error={errors.lastName?.message}
                required
                {...register('lastName')}
              />
            </div>

            {/* Email & Password */}
            <Input
              label="Work Email"
              type="email"
              placeholder="ramesh@acmeenterprises.com"
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              required
              {...register('email')}
            />

            <Input
              label="Password"
              type="password"
              placeholder="At least 8 characters"
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              required
              {...register('password')}
            />

            {/* Business Information Section */}
            <div className="pt-2 border-t border-warm-border/60 space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-warm-accent flex items-center gap-1.5">
                <Building2 className="w-4 h-4" /> Company Details
              </p>

              <Input
                label="Business / Enterprise Name"
                placeholder="Acme Enterprises Pvt Ltd"
                leftIcon={<Building2 className="w-4 h-4" />}
                error={errors.businessName?.message}
                required
                {...register('businessName')}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Phone Number (Optional)"
                  placeholder="+91 98765 43210"
                  leftIcon={<Phone className="w-4 h-4" />}
                  error={errors.phone?.message}
                  {...register('phone')}
                />
                <Input
                  label="GSTIN Number (Optional)"
                  placeholder="27AAAAA0000A1Z5"
                  error={errors.gstin?.message}
                  {...register('gstin')}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold mt-4"
              isLoading={isSubmitting || isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Complete Registration
            </Button>
          </form>

          <div className="flex items-center justify-center gap-2 text-[11px] text-warm-textSubtle pt-2 border-t border-warm-border/40">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>256-Bit SSL Encrypted Data Storage & Privacy Protection</span>
          </div>
        </div>

        {/* Footer Link */}
        <p className="text-center text-xs text-warm-textMuted">
          Already have a business account?{' '}
          <Link href="/login" className="font-bold text-warm-accent hover:underline">
            Sign In Instead
          </Link>
        </p>
      </div>
    </div>
  );
}
