'use client';

import React, { useEffect, useState, useId } from 'react';
import { INDIAN_STATES, getCitiesForState, lookupPincode, normalizeStateName } from '@/lib/geo';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { MapPin, Hash, Loader2 } from 'lucide-react';

export interface StateCityFieldsProps {
  stateValue: string;
  cityValue: string;
  pincodeValue?: string;
  onStateChange: (state: string) => void;
  onCityChange: (city: string) => void;
  onPincodeChange?: (pincode: string) => void;
  stateError?: string;
  cityError?: string;
  pincodeError?: string;
  disabled?: boolean;
  required?: boolean;
  includePincode?: boolean;
}

export function StateCityFields({
  stateValue,
  cityValue,
  pincodeValue = '',
  onStateChange,
  onCityChange,
  onPincodeChange,
  stateError,
  cityError,
  pincodeError,
  disabled = false,
  required = true,
  includePincode = true
}: StateCityFieldsProps) {
  const [cities, setCities] = useState<string[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isLookingUpPin, setIsLookingUpPin] = useState(false);
  const datalistId = useId();

  // Load cities from free API whenever state changes
  useEffect(() => {
    const cleanState = normalizeStateName(stateValue);
    if (!cleanState) {
      setCities([]);
      return;
    }

    let isCurrent = true;
    setIsLoadingCities(true);

    getCitiesForState(cleanState)
      .then((list) => {
        if (isCurrent) {
          setCities(list);
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoadingCities(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [stateValue]);

  // Handle Pincode change and auto-lookup
  const handlePincodeInput = async (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 6);
    if (onPincodeChange) onPincodeChange(clean);

    if (clean.length === 6) {
      setIsLookingUpPin(true);
      try {
        const info = await lookupPincode(clean);
        if (info) {
          if (info.state) {
            // Find matched state with code
            const matched = INDIAN_STATES.find(
              (s) => s.name.toLowerCase() === info.state.toLowerCase()
            );
            onStateChange(matched ? `${matched.code}-${matched.name}` : info.state);
          }
          if (info.city) {
            onCityChange(info.city);
          }
        }
      } finally {
        setIsLookingUpPin(false);
      }
    }
  };

  const stateOptions = [
    { value: '', label: 'Select State / UT' },
    ...INDIAN_STATES.map((s) => ({
      value: `${s.code}-${s.name}`,
      label: `${s.code} - ${s.name}${s.isUnionTerritory ? ' (UT)' : ''}`
    }))
  ];

  // Match current stateValue with option format if simple name was provided
  const normalizedSelectedState = (() => {
    if (!stateValue) return '';
    const clean = normalizeStateName(stateValue).toLowerCase();
    const found = INDIAN_STATES.find((s) => s.name.toLowerCase() === clean);
    return found ? `${found.code}-${found.name}` : stateValue;
  })();

  return (
    <>
      {includePincode && onPincodeChange && (
        <div className="relative">
          <Input
            label="Pincode (Auto-lookup)"
            placeholder="Enter 6-digit PIN code"
            value={pincodeValue}
            maxLength={6}
            disabled={disabled}
            error={pincodeError}
            leftIcon={
              isLookingUpPin ? (
                <Loader2 className="w-4 h-4 animate-spin text-warm-accent" />
              ) : (
                <Hash className="w-4 h-4" />
              )
            }
            helperText={isLookingUpPin ? 'Looking up location via Postal API...' : 'Type 6-digit PIN to auto-fill State & City'}
            onChange={(e) => handlePincodeInput(e.target.value)}
          />
        </div>
      )}

      <div>
        <Select
          label="State / Union Territory"
          required={required}
          value={normalizedSelectedState}
          options={stateOptions}
          disabled={disabled}
          error={stateError}
          onChange={(e) => {
            onStateChange(e.target.value);
          }}
          helperText="GST State code and territory name"
        />
      </div>

      <div className="relative">
        <Input
          label="City / District"
          required={required}
          placeholder={isLoadingCities ? 'Loading cities...' : 'Enter or select city'}
          value={cityValue}
          disabled={disabled}
          error={cityError}
          leftIcon={
            isLoadingCities ? (
              <Loader2 className="w-4 h-4 animate-spin text-warm-accent" />
            ) : (
              <MapPin className="w-4 h-4" />
            )
          }
          list={datalistId}
          onChange={(e) => onCityChange(e.target.value)}
          helperText={
            cities.length > 0
              ? `${cities.length} cities available in dropdown / auto-suggest`
              : 'Type city name or select state for suggestions'
          }
        />

        {cities.length > 0 && (
          <datalist id={datalistId}>
            {cities.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        )}
      </div>
    </>
  );
}
