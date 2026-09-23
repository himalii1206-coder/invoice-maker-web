'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Palette, Check, RotateCcw, Sparkles, X } from 'lucide-react';

export function ThemeSelector() {
  const {
    accentColor,
    presetId,
    setAccentColor,
    selectPreset,
    resetTheme,
    presets
  } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [customHex, setCustomHex] = useState(accentColor);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync customHex input when accentColor changes
  useEffect(() => {
    setCustomHex(accentColor);
  }, [accentColor]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleCustomHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.trim();
    if (!val.startsWith('#') && val.length > 0) {
      val = '#' + val;
    }
    setCustomHex(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      setAccentColor(val);
    }
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomHex(val);
    setAccentColor(val);
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 bg-warm-surface hover:bg-warm-input border border-warm-border/80 transition-all text-xs font-semibold text-warm-text shadow-2xs group focus:outline-none"
        title="Customize Application Theme Color"
        aria-label="Customize Theme Color"
      >
        <div
          className="w-4 h-4 rounded-full border border-black/15 shadow-2xs shrink-0 transition-transform group-hover:scale-110 flex items-center justify-center"
          style={{ backgroundColor: accentColor }}
        />
        <Palette className="w-3.5 h-3.5 text-warm-textMuted group-hover:text-warm-accent transition-colors" />
        <span className="hidden sm:inline text-[11px] uppercase tracking-wider font-bold">Theme</span>
      </button>

      {/* Popover Card */}
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40 sm:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-warm-surface border border-warm-border shadow-warmLg z-50 p-4 space-y-3.5 animate-in fade-in zoom-in-95 duration-150 rounded-none">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-warm-border/60 pb-2.5">
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: accentColor }}
                >
                  <Sparkles className="w-3 h-3" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-warm-text">
                    Theme Color
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={resetTheme}
                  className="p-1 text-warm-textMuted hover:text-warm-text hover:bg-warm-input transition-colors text-[10px] font-medium flex items-center gap-1"
                  title="Reset to default theme"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-warm-textMuted hover:text-warm-text hover:bg-warm-input"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Curated Brand Palettes */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-warm-textMuted">
                Curated Palettes
              </label>

              <div className="grid grid-cols-4 gap-2">
                {presets.map((preset) => {
                  const isSelected =
                    presetId === preset.id ||
                    accentColor.toLowerCase() === preset.accent.toLowerCase();

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => selectPreset(preset)}
                      className={`flex flex-col items-center gap-1 p-2 border transition-all text-center group ${
                        isSelected
                          ? 'border-warm-accent bg-warm-accent/10 shadow-xs font-bold ring-1 ring-warm-accent'
                          : 'border-warm-border/60 bg-warm-surface hover:border-warm-border hover:bg-warm-input/50'
                      }`}
                      title={`${preset.name} (${preset.accent})`}
                    >
                      <div
                        className="w-6 h-6 rounded-full border border-black/10 shadow-2xs flex items-center justify-center transition-transform group-hover:scale-105"
                        style={{ backgroundColor: preset.accent }}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                      </div>
                      <span className="text-[10px] leading-tight text-warm-text truncate w-full">
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Hex Color Picker */}
            <div className="space-y-1.5 pt-2 border-t border-warm-border/60">
              <label className="text-[10px] font-bold uppercase tracking-wider text-warm-textMuted flex items-center justify-between">
                <span>Custom Primary Color</span>
                <span className="text-warm-textSubtle font-mono">{accentColor}</span>
              </label>

              <div className="flex items-center gap-2">
                {/* Visual Color Input */}
                <div className="relative w-10 h-9 border border-warm-border/80 overflow-hidden shrink-0 cursor-pointer shadow-2xs">
                  <input
                    type="color"
                    value={accentColor.startsWith('#') ? accentColor : '#7c4a27'}
                    onChange={handleColorPickerChange}
                    className="absolute -top-2 -left-2 w-14 h-14 cursor-pointer border-0 p-0"
                    title="Choose custom color"
                  />
                </div>

                {/* Hex Code Input */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={customHex}
                    placeholder="#7c4a27"
                    maxLength={7}
                    onChange={handleCustomHexChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (/^#[0-9A-Fa-f]{6}$/.test(customHex)) {
                          setAccentColor(customHex);
                        }
                        setIsOpen(false);
                      }
                    }}
                    className="w-full h-9 px-3 bg-warm-input text-xs font-mono font-bold text-warm-text border border-warm-border/80 focus:outline-none focus:ring-2 focus:ring-warm-accent/40 uppercase"
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
