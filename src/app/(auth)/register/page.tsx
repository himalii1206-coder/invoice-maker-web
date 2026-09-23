'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Logo } from '@/components/ui/Logo';
import { INDIAN_STATES, lookupPincode, verifyPincodeMatch, getCitiesForState } from '@/lib/geo';
import {
  Mail,
  Lock,
  User,
  Building2,
  Phone,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  CreditCard,
  Hash,
  Landmark,
  ShieldCheck,
  Search,
  Check
} from 'lucide-react';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export default function RegisterPage() {
  const { register: registerAuth, isLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookingUpIfsc, setIsLookingUpIfsc] = useState(false);
  const [cityList, setCityList] = useState<string[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Owner Account
    firstName: '',
    lastName: '',
    email: '',
    password: '',

    // Step 2: Business & GST (Stage 2: A)
    hasGstin: true,
    gstin: '',
    businessName: '',
    pan: '',
    phone: '',
    address: '',
    city: '',
    state: 'Gujarat',
    postalCode: '',

    // Step 3: Bank & Invoicing Defaults
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branch: '',
    upiId: '',
    invoicePrefix: 'INV-',
    nextInvoiceNumber: 1001
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [gstinFeedback, setGstinFeedback] = useState<{
    isValid: boolean;
    stateName?: string;
    pan?: string;
  } | null>(null);

  // Load cities dynamically when selected state changes
  useEffect(() => {
    let isMounted = true;
    if (formData.state) {
      getCitiesForState(formData.state).then((cities) => {
        if (isMounted) {
          setCityList(cities);
        }
      });
    } else {
      setCityList([]);
    }
    return () => {
      isMounted = false;
    };
  }, [formData.state]);

  const clearError = (field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Handle GSTIN Input with Smart Auto-Fill (Stage 2: A)
  const handleGstinChange = (value: string) => {
    clearError('gstin');
    const cleanGstin = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);

    let feedback = null;
    let extractedPan = formData.pan;
    let extractedState = formData.state;

    if (cleanGstin.length >= 2) {
      const stateCode = cleanGstin.slice(0, 2);
      const matchedState = INDIAN_STATES.find((s) => s.code === stateCode);
      if (matchedState) {
        extractedState = matchedState.name;
      }
    }

    if (cleanGstin.length >= 12) {
      extractedPan = cleanGstin.slice(2, 12);
      clearError('pan');
    }

    if (cleanGstin.length === 15 && GSTIN_REGEX.test(cleanGstin)) {
      feedback = {
        isValid: true,
        stateName: extractedState,
        pan: extractedPan
      };
    } else if (cleanGstin.length === 15) {
      feedback = { isValid: false };
    }

    setGstinFeedback(feedback);
    setFormData((prev) => ({
      ...prev,
      gstin: cleanGstin,
      pan: extractedPan,
      state: extractedState
    }));
  };

  // Handle Pincode Cross-validation with State/City (only updates PIN & displays error without modifying city)
  const handlePincodeChange = async (value: string) => {
    clearError('postalCode');
    const cleanPin = value.replace(/[^0-9]/g, '').slice(0, 6);
    setFormData((prev) => ({ ...prev, postalCode: cleanPin }));

    if (cleanPin.length === 6) {
      try {
        const check = await verifyPincodeMatch(cleanPin, formData.state, formData.city);
        if (!check.isValid) {
          setErrors((prev) => ({ ...prev, postalCode: check.error || 'PIN code does not match state/city' }));
        } else {
          clearError('postalCode');
        }
      } catch {
        // Silent failover
      }
    }
  };

  // Handle State change and re-verify PIN code
  const handleStateChange = async (newState: string) => {
    clearError('state');
    setFormData((prev) => ({ ...prev, state: newState, city: '' }));

    if (formData.postalCode && formData.postalCode.length === 6) {
      const check = await verifyPincodeMatch(formData.postalCode, newState, '');
      if (!check.isValid) {
        setErrors((prev) => ({ ...prev, postalCode: check.error || 'PIN code does not match selected state' }));
      } else {
        clearError('postalCode');
      }
    }
  };

  // Handle City change and re-verify PIN code
  const handleCityChange = async (newCity: string) => {
    clearError('city');
    setFormData((prev) => ({ ...prev, city: newCity }));

    if (formData.postalCode && formData.postalCode.length === 6) {
      const check = await verifyPincodeMatch(formData.postalCode, formData.state, newCity);
      if (!check.isValid) {
        setErrors((prev) => ({ ...prev, postalCode: check.error || 'PIN code does not match entered city' }));
      } else {
        clearError('postalCode');
      }
    }
  };

  // Handle IFSC Live Lookup
  const handleIfscLookup = async (code: string) => {
    const cleanIfsc = code.toUpperCase().trim();
    if (cleanIfsc.length !== 11) return;

    setIsLookingUpIfsc(true);
    try {
      const res = await fetch(`https://ifsc.razorpay.com/${cleanIfsc}`);
      if (res.ok) {
        const data = await res.json();
        setFormData((prev) => ({
          ...prev,
          bankName: data.BANK || prev.bankName,
          branch: data.BRANCH || prev.branch,
          city: data.CITY || prev.city,
          state: data.STATE || prev.state
        }));
        clearError('ifscCode');
        clearError('bankName');
        toast.success(`Resolved: ${data.BANK} (${data.BRANCH})`);
      } else {
        setErrors((prev) => ({ ...prev, ifscCode: 'IFSC code not found in RBI database' }));
      }
    } catch {
      // Manual input fallback
    } finally {
      setIsLookingUpIfsc(false);
    }
  };

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Work email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid work email address';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 2 Validation (Cross-checks PIN code against State & City)
  const validateStep2 = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    if (formData.hasGstin) {
      if (!formData.gstin.trim()) {
        newErrors.gstin = 'GSTIN is required when registered for GST';
      } else if (!GSTIN_REGEX.test(formData.gstin.trim())) {
        newErrors.gstin = 'Invalid 15-character GSTIN format (e.g. 24AAACC1206D1ZM)';
      }
    }

    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business or company name is required';
    } else if (formData.businessName.trim().length < 2) {
      newErrors.businessName = 'Business name must be at least 2 characters';
    }

    if (!formData.pan.trim()) {
      newErrors.pan = 'PAN number is required';
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan.trim())) {
      newErrors.pan = 'Invalid 10-character PAN format (e.g. ABCDE1234F)';
    }

    if (!formData.state.trim()) {
      newErrors.state = 'Registered state is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Registered business address is required';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.postalCode.trim()) {
      newErrors.postalCode = 'PIN code is required';
    } else if (!/^[0-9]{6}$/.test(formData.postalCode.trim())) {
      newErrors.postalCode = 'PIN code must be a 6-digit number';
    } else {
      // Validate PIN code against selected state and city
      const check = await verifyPincodeMatch(formData.postalCode.trim(), formData.state, formData.city);
      if (!check.isValid) {
        newErrors.postalCode = check.error || 'PIN code does not match registered state/city';
      }
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Business phone number is required';
    } else if (!/^(\+91[\-\s]?)?[6-9]\d{9}$|^[0-9]{10}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Please enter a valid 10-digit mobile number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 3 Validation
  const validateStep3 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.ifscCode.trim()) {
      newErrors.ifscCode = 'Bank IFSC code is required';
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode.trim())) {
      newErrors.ifscCode = 'Invalid 11-character IFSC code (e.g. HDFC0001234)';
    }

    if (!formData.bankName.trim()) {
      newErrors.bankName = 'Bank name is required';
    }

    if (!formData.branch.trim()) {
      newErrors.branch = 'Branch name is required';
    }

    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = 'Bank account number is required';
    } else if (!/^[0-9]{9,18}$/.test(formData.accountNumber.trim())) {
      newErrors.accountNumber = 'Bank account number must be 9 to 18 digits';
    }

    if (formData.upiId.trim() && !/^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(formData.upiId.trim())) {
      newErrors.upiId = 'Invalid UPI ID format (e.g. username@bank)';
    }

    if (!formData.invoicePrefix.trim()) {
      newErrors.invoicePrefix = 'Invoice prefix is required';
    }

    if (formData.nextInvoiceNumber === undefined || formData.nextInvoiceNumber === null || Number(formData.nextInvoiceNumber) < 1) {
      newErrors.nextInvoiceNumber = 'Starting invoice number must be 1 or higher';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && (await validateStep2())) {
      setCurrentStep(3);
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    const isStep1Valid = validateStep1();
    if (!isStep1Valid) {
      setCurrentStep(1);
      return;
    }
    const isStep2Valid = await validateStep2();
    if (!isStep2Valid) {
      setCurrentStep(2);
      return;
    }
    const isStep3Valid = validateStep3();
    if (!isStep3Valid) {
      return;
    }

    setIsSubmitting(true);
    try {
      await registerAuth({
        email: formData.email.trim(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        businessName: formData.businessName.trim(),
        phone: formData.phone.trim(),
        gstin: formData.hasGstin && formData.gstin.trim() ? formData.gstin.trim() : undefined,
        pan: formData.pan.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        postalCode: formData.postalCode.trim(),
        bankName: formData.bankName.trim(),
        accountNumber: formData.accountNumber.trim(),
        ifscCode: formData.ifscCode.trim(),
        branch: formData.branch.trim(),
        upiId: formData.upiId.trim(),
        invoicePrefix: formData.invoicePrefix.trim() || 'INV-',
        nextInvoiceNumber: Number(formData.nextInvoiceNumber) || 1001
      });
    } catch (err: any) {
      const serverMessage = err?.response?.data?.message || err?.message || '';
      if (serverMessage.toLowerCase().includes('email')) {
        setErrors((prev) => ({ ...prev, email: serverMessage }));
        setCurrentStep(1);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-warm-bg flex items-center justify-center p-4 sm:p-6 my-6">
      <div className="w-full max-w-xl space-y-6">
        {/* Brand Logo & Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center mb-1">
            <Logo className="w-12 h-12" size={48} />
          </div>
          <h1 className="text-2xl font-bold text-warm-text tracking-tight">
            Register Your Business
          </h1>
          <p className="text-xs text-warm-textMuted max-w-md mx-auto">
            Set up your GST-compliant company profile and start issuing professional invoices.
          </p>
        </div>

        {/* Step Progress Stepper */}
        <div className="bg-warm-surface border border-warm-border/80 p-3 flex items-center justify-between gap-2 shadow-2xs">
          {[
            { step: 1, label: 'Owner Account', icon: User },
            { step: 2, label: 'Business & GST', icon: Building2 },
            { step: 3, label: 'Bank & Invoicing', icon: Landmark }
          ].map((item) => {
            const Icon = item.icon;
            const isActive = currentStep === item.step;
            const isCompleted = currentStep > item.step;

            return (
              <div
                key={item.step}
                className={`flex items-center gap-2 px-2.5 py-1.5 flex-1 transition-all ${
                  isActive
                    ? 'bg-warm-accent text-white font-semibold shadow-2xs'
                    : isCompleted
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                      : 'text-warm-textMuted opacity-60'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    isActive
                      ? 'bg-white text-warm-accent'
                      : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-warm-border/80 text-warm-text'
                  }`}
                >
                  {isCompleted ? <Check className="w-3 h-3" /> : item.step}
                </div>
                <div className="hidden sm:block text-left truncate">
                  <p className="text-[11px] leading-tight truncate">{item.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Multi-Step Card */}
        <div className="bg-warm-surface border border-warm-border/80 shadow-warmLg p-6 sm:p-8 space-y-5">
          {/* STEP 1: OWNER ACCOUNT */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="border-b border-warm-border/60 pb-3">
                <h2 className="text-sm font-bold text-warm-text uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-warm-accent" />
                  Step 1: Account Credentials
                </h2>
                <p className="text-xs text-warm-textMuted mt-0.5">
                  Create your administrator account to manage your business.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  placeholder="Enter first name"
                  leftIcon={<User className="w-4 h-4" />}
                  value={formData.firstName}
                  error={errors.firstName}
                  onChange={(e) => {
                    clearError('firstName');
                    setFormData({ ...formData, firstName: e.target.value });
                  }}
                  required
                />
                <Input
                  label="Last Name"
                  placeholder="Enter last name"
                  value={formData.lastName}
                  error={errors.lastName}
                  onChange={(e) => {
                    clearError('lastName');
                    setFormData({ ...formData, lastName: e.target.value });
                  }}
                  required
                />
              </div>

              <Input
                label="Work Email Address"
                type="email"
                placeholder="Enter work email address"
                leftIcon={<Mail className="w-4 h-4" />}
                value={formData.email}
                error={errors.email}
                onChange={(e) => {
                  clearError('email');
                  setFormData({ ...formData, email: e.target.value });
                }}
                required
              />

              <Input
                label="Password (min 8 characters)"
                type="password"
                placeholder="Enter password (min. 8 characters)"
                leftIcon={<Lock className="w-4 h-4" />}
                value={formData.password}
                error={errors.password}
                onChange={(e) => {
                  clearError('password');
                  setFormData({ ...formData, password: e.target.value });
                }}
                required
              />

              <Button
                type="button"
                onClick={handleNext}
                className="w-full h-11 text-sm font-semibold mt-4"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Next: Business &amp; GST Details
              </Button>
            </div>
          )}

          {/* STEP 2: BUSINESS & GST (Stage 2: A Smart Auto-Fill) */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="border-b border-warm-border/60 pb-3">
                <h2 className="text-sm font-bold text-warm-text uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-warm-accent" />
                  Step 2: Business &amp; GST Setup
                </h2>
                <p className="text-xs text-warm-textMuted mt-0.5">
                  Smart auto-fill extracts your State, State Code, and PAN directly from your GSTIN.
                </p>
              </div>

              {/* GSTIN Toggle Option */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-warm-input border border-warm-border/60">
                <button
                  type="button"
                  onClick={() => {
                    clearError('gstin');
                    setFormData({ ...formData, hasGstin: true });
                  }}
                  className={`py-2 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    formData.hasGstin
                      ? 'bg-warm-surface text-warm-accent shadow-xs border border-warm-border/60 font-bold'
                      : 'text-warm-textMuted hover:text-warm-text'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  GST Registered
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearError('gstin');
                    setFormData({ ...formData, hasGstin: false, gstin: '' });
                  }}
                  className={`py-2 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    !formData.hasGstin
                      ? 'bg-warm-surface text-warm-accent shadow-xs border border-warm-border/60 font-bold'
                      : 'text-warm-textMuted hover:text-warm-text'
                  }`}
                >
                  Non-GST / Unregistered
                </button>
              </div>

              {/* GSTIN Smart Auto-Fill Field */}
              {formData.hasGstin && (
                <div className="p-3.5 bg-blue-50/50 border border-blue-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      15-Digit GSTIN (Auto-Fill) <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-blue-700 font-medium">Format: 24AAACC1206D1ZM</span>
                  </div>

                  <Input
                    placeholder="Enter 15-character GSTIN"
                    value={formData.gstin}
                    error={errors.gstin}
                    onChange={(e) => handleGstinChange(e.target.value)}
                    className="font-mono text-sm uppercase font-semibold tracking-wider bg-white"
                    required
                  />

                  {gstinFeedback?.isValid && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-100/60 px-2.5 py-1.5 border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Verified GSTIN Format: <strong>{gstinFeedback.stateName}</strong> (PAN: {gstinFeedback.pan})
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Business Name */}
              <Input
                label="Company / Enterprise Legal Name"
                placeholder="Enter registered business or company name"
                leftIcon={<Building2 className="w-4 h-4" />}
                value={formData.businessName}
                error={errors.businessName}
                onChange={(e) => {
                  clearError('businessName');
                  setFormData({ ...formData, businessName: e.target.value });
                }}
                required
              />

              {/* PAN & State */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="PAN Number"
                  placeholder="Enter 10-character PAN"
                  value={formData.pan}
                  error={errors.pan}
                  onChange={(e) => {
                    clearError('pan');
                    setFormData({ ...formData, pan: e.target.value.toUpperCase() });
                  }}
                  className="font-mono uppercase"
                  required
                />

                <Select
                  label="Registered State"
                  options={INDIAN_STATES.map((s) => ({
                    value: s.name,
                    label: `${s.code} — ${s.name}`
                  }))}
                  value={formData.state}
                  error={errors.state}
                  onChange={(e) => handleStateChange(e.target.value)}
                  required
                />
              </div>

              {/* Address, City, Pincode */}
              <Input
                label="Registered Business Address"
                placeholder="Enter street address, building, suite or industrial estate"
                value={formData.address}
                error={errors.address}
                onChange={(e) => {
                  clearError('address');
                  setFormData({ ...formData, address: e.target.value });
                }}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {formData.state ? (
                  <Select
                    label="City"
                    value={formData.city}
                    error={errors.city}
                    options={[
                      { value: '', label: cityList.length > 0 ? 'Select City' : 'Select City' },
                      ...cityList.map((c) => ({ value: c, label: c })),
                      ...(formData.city && !cityList.includes(formData.city)
                        ? [{ value: formData.city, label: formData.city }]
                        : [])
                    ]}
                    onChange={(e) => handleCityChange(e.target.value)}
                    required
                  />
                ) : (
                  <Input
                    label="City"
                    placeholder="Select State first"
                    value={formData.city}
                    error={errors.city}
                    disabled
                    required
                  />
                )}
                <Input
                  label="PIN Code"
                  placeholder="Enter 6-digit PIN code"
                  value={formData.postalCode}
                  error={errors.postalCode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  required
                />
              </div>

              <Input
                label="Business Mobile / Phone"
                placeholder="Enter 10-digit mobile number"
                leftIcon={<Phone className="w-4 h-4" />}
                value={formData.phone}
                error={errors.phone}
                onChange={(e) => {
                  clearError('phone');
                  setFormData({ ...formData, phone: e.target.value });
                }}
                required
              />

              {/* Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1"
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleNext}
                  className="flex-1"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Next: Bank Details
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: BANK & INVOICE NUMBERING DEFAULTS */}
          {currentStep === 3 && (
            <form onSubmit={handleComplete} className="space-y-4 animate-in fade-in duration-200">
              <div className="border-b border-warm-border/60 pb-3">
                <h2 className="text-sm font-bold text-warm-text uppercase tracking-wider flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-warm-accent" />
                  Step 3: Bank Details &amp; Invoice Setup
                </h2>
                <p className="text-xs text-warm-textMuted mt-0.5">
                  These payment instructions will be cleanly printed on your generated PDF invoices.
                </p>
              </div>

              {/* IFSC Auto-Lookup Box */}
              <div className="p-3 bg-warm-input/60 border border-warm-border/60 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-warm-text flex items-center gap-1">
                    <Landmark className="w-3.5 h-3.5 text-warm-accent" />
                    Bank IFSC Code <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-warm-textMuted font-medium">Format: HDFC0001234</span>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Enter 11-character IFSC"
                    value={formData.ifscCode}
                    error={errors.ifscCode}
                    onChange={(e) => {
                      clearError('ifscCode');
                      const val = e.target.value.toUpperCase().trim();
                      setFormData({ ...formData, ifscCode: val });
                      if (val.length === 11) handleIfscLookup(val);
                    }}
                    className="font-mono uppercase font-semibold"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleIfscLookup(formData.ifscCode)}
                    disabled={isLookingUpIfsc || formData.ifscCode.length !== 11}
                    className="shrink-0"
                  >
                    {isLookingUpIfsc ? 'Fetching...' : 'Lookup'}
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <Input
                    label="Bank Name"
                    placeholder="Enter bank name"
                    value={formData.bankName}
                    error={errors.bankName}
                    onChange={(e) => {
                      clearError('bankName');
                      setFormData({ ...formData, bankName: e.target.value });
                    }}
                    required
                  />
                  <Input
                    label="Branch Name"
                    placeholder="Enter branch name / locality"
                    value={formData.branch}
                    error={errors.branch}
                    onChange={(e) => {
                      clearError('branch');
                      setFormData({ ...formData, branch: e.target.value });
                    }}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Bank Account Number"
                    placeholder="Enter bank account number"
                    value={formData.accountNumber}
                    error={errors.accountNumber}
                    onChange={(e) => {
                      clearError('accountNumber');
                      setFormData({ ...formData, accountNumber: e.target.value });
                    }}
                    className="font-mono"
                    required
                  />
                  <Input
                    label="UPI ID / VPA (Optional)"
                    placeholder="Enter UPI ID (username@bank)"
                    value={formData.upiId}
                    error={errors.upiId}
                    onChange={(e) => {
                      clearError('upiId');
                      setFormData({ ...formData, upiId: e.target.value });
                    }}
                  />
                </div>
              </div>

              {/* Invoice Numbering Setup */}
              <div className="pt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-warm-accent flex items-center gap-1.5 mb-2">
                  <Hash className="w-4 h-4" /> Invoice Sequence Defaults
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Invoice Prefix"
                    placeholder="INV-"
                    value={formData.invoicePrefix}
                    error={errors.invoicePrefix}
                    onChange={(e) => {
                      clearError('invoicePrefix');
                      setFormData({ ...formData, invoicePrefix: e.target.value });
                    }}
                    required
                  />
                  <Input
                    label="Starting Number"
                    type="number"
                    placeholder="1001"
                    value={formData.nextInvoiceNumber}
                    error={errors.nextInvoiceNumber}
                    onChange={(e) => {
                      clearError('nextInvoiceNumber');
                      setFormData({ ...formData, nextInvoiceNumber: Number(e.target.value) });
                    }}
                    required
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  className="flex-1"
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                  Back
                </Button>

                <Button
                  type="submit"
                  isLoading={isSubmitting || isLoading}
                  className="flex-1 h-11 text-sm font-semibold bg-warm-accent hover:bg-warm-accentHover text-white shadow-sm"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Launch Dashboard
                </Button>
              </div>
            </form>
          )}

          {/* Security Badge */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-warm-textSubtle pt-2 border-t border-warm-border/40">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>GST Compliant • 256-Bit SSL Encrypted Storage</span>
          </div>
        </div>

        {/* Footer Link */}
        <p className="text-center text-xs text-warm-textMuted">
          Already have a business account?{' '}
          <Link href="/login" className="font-bold text-warm-accent hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
