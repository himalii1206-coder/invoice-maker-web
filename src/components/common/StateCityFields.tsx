'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { INDIAN_STATES, getCitiesForState, lookupPincode, normalizeStateName } from '@/lib/geo';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/utils';
import { MapPin, Hash, Loader2, ChevronDown, Check } from 'lucide-react';

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

  const [isCityOpen, setIsCityOpen] = useState(false);
  const [cityHighlightIdx, setCityHighlightIdx] = useState(-1);
  const cityContainerRef = useRef<HTMLDivElement>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);

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

  const filteredCities = useMemo(() => {
    const query = (cityValue || '').trim().toLowerCase();
    if (!query) return cities.slice(0, 100);

    const matches = cities.filter((c) => c.toLowerCase().includes(query)).slice(0, 100);
    const exactMatch = cities.some((c) => c.toLowerCase() === query);
    if (!exactMatch && query) {
      return [cityValue.trim(), ...matches];
    }
    return matches;
  }, [cityValue, cities]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cityContainerRef.current && !cityContainerRef.current.contains(e.target as Node)) {
        setIsCityOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsCityOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isCityOpen) {
        setIsCityOpen(true);
        setCityHighlightIdx(0);
      } else {
        setCityHighlightIdx((prev) => Math.min(prev + 1, filteredCities.length - 1));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCityHighlightIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      if (isCityOpen && cityHighlightIdx >= 0 && filteredCities[cityHighlightIdx]) {
        e.preventDefault();
        onCityChange(filteredCities[cityHighlightIdx]);
        setIsCityOpen(false);
      }
    }
  };

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
          label="State"
          required={required}
          value={normalizedSelectedState}
          options={stateOptions}
          disabled={disabled}
          error={stateError}
          onChange={(e) => {
            onStateChange(e.target.value);
          }}
        />
      </div>

      <div className="w-full space-y-1.5" ref={cityContainerRef}>
        <label className="block text-xs font-semibold uppercase tracking-wider text-warm-textMuted">
          City {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-textMuted pointer-events-none">
            {isLoadingCities ? (
              <Loader2 className="w-4 h-4 animate-spin text-warm-accent" />
            ) : (
              <MapPin className="w-4 h-4" />
            )}
          </div>
          <input
            ref={cityInputRef}
            type="text"
            value={cityValue}
            disabled={disabled}
            placeholder={isLoadingCities ? 'Loading cities...' : 'Enter or select city'}
            onFocus={() => {
              if (cities.length > 0) setIsCityOpen(true);
            }}
            onChange={(e) => {
              onCityChange(e.target.value);
              if (cities.length > 0) setIsCityOpen(true);
              setCityHighlightIdx(0);
            }}
            onKeyDown={handleCityKeyDown}
            className={cn(
              'w-full h-10 pl-9 pr-9 bg-warm-input text-warm-text placeholder:text-warm-placeholder text-sm rounded-none border border-warm-border/60 transition-colors focus:outline-none focus:ring-2 focus:ring-warm-accent/40 focus:border-warm-accent disabled:opacity-60 disabled:cursor-not-allowed',
              cityError && 'border-red-500 focus:ring-red-500/40 focus:border-red-500'
            )}
          />
          {cities.length > 0 && (
            <button
              type="button"
              tabIndex={-1}
              disabled={disabled}
              onClick={() => {
                setIsCityOpen((prev) => !prev);
                cityInputRef.current?.focus();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-warm-textMuted hover:text-warm-text transition-colors cursor-pointer"
            >
              <ChevronDown
                className={cn(
                  'w-4 h-4 transition-transform duration-200',
                  isCityOpen && 'rotate-180 text-warm-accent'
                )}
              />
            </button>
          )}

          {isCityOpen && filteredCities.length > 0 && (
            <div className="absolute left-0 top-full mt-1 w-full bg-warm-surface border border-warm-border/80 shadow-warmLg z-50 max-h-56 overflow-y-auto">
              <ul className="py-1 divide-y divide-warm-border/20">
                {filteredCities.map((city, idx) => {
                  const isSelected = city.toLowerCase() === cityValue.trim().toLowerCase();
                  const isHighlighted = idx === cityHighlightIdx;
                  return (
                    <li key={`${city}-${idx}`}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onCityChange(city);
                          setIsCityOpen(false);
                        }}
                        onMouseEnter={() => setCityHighlightIdx(idx)}
                        className={cn(
                          'w-full px-3.5 py-2 text-left text-sm flex items-center justify-between transition-colors cursor-pointer',
                          isHighlighted
                            ? 'bg-warm-accent/15 text-warm-accent font-medium'
                            : 'text-warm-text hover:bg-warm-input/60',
                          isSelected && 'text-warm-accent font-semibold bg-warm-accent/5'
                        )}
                      >
                        <span className="truncate">{city}</span>
                        {isSelected && <Check className="w-4 h-4 text-warm-accent shrink-0 ml-2" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
        {cityError ? (
          <p className="text-xs text-red-600 mt-1 font-medium">{cityError}</p>
        ) : (
          <p className="text-xs text-warm-textSubtle mt-1">
            {cities.length > 0
              ? `${cities.length} cities available in dropdown`
              : 'Type city name or select state for suggestions'}
          </p>
        )}
      </div>
    </>
  );
}
