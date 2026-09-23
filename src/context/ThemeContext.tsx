'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ThemeMode = 'warm' | 'light' | 'dark';

export interface ThemePreset {
  id: string;
  name: string;
  accent: string;
  category: string;
}

export const PRESET_THEMES: ThemePreset[] = [
  { id: 'espresso', name: 'Warm Espresso', accent: '#7c4a27', category: 'Classic Warm' },
  { id: 'indigo', name: 'Royal Indigo', accent: '#2563eb', category: 'Modern Tech' },
  { id: 'emerald', name: 'Forest Emerald', accent: '#059669', category: 'Clean & Trust' },
  { id: 'ruby', name: 'Crimson Ruby', accent: '#be123c', category: 'Luxury Wine' },
  { id: 'violet', name: 'Imperial Violet', accent: '#7c3aed', category: 'Vibrant & Bold' },
  { id: 'teal', name: 'Ocean Teal', accent: '#0891b2', category: 'Fresh & Crisp' },
  { id: 'terracotta', name: 'Sunset Terracotta', accent: '#ea580c', category: 'Warm Accent' },
  { id: 'slate', name: 'Obsidian Slate', accent: '#334155', category: 'Minimal Monochrome' }
];

export interface ThemeState {
  accentColor: string;
  mode: ThemeMode;
  presetId?: string;
}

interface ThemeContextType {
  accentColor: string;
  mode: ThemeMode;
  presetId?: string;
  setAccentColor: (color: string) => void;
  setMode: (mode: ThemeMode) => void;
  selectPreset: (preset: ThemePreset) => void;
  resetTheme: () => void;
  presets: ThemePreset[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'invoicemaker_theme_v1';

const DEFAULT_THEME: ThemeState = {
  accentColor: '#7c4a27',
  mode: 'light',
  presetId: 'espresso'
};

// Helper: Hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = (hex || '').replace('#', '').trim();
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16)
    };
  }
  if (clean.length === 6) {
    return {
      r: parseInt(clean.substring(0, 2), 16),
      g: parseInt(clean.substring(2, 4), 16),
      b: parseInt(clean.substring(4, 6), 16)
    };
  }
  return null;
}

// Helper: RGB to Hex
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [clamp(r), clamp(g), clamp(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

// Helper: Darken / Lighten
function adjustBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const factor = 1 + percent / 100;
  return rgbToHex(rgb.r * factor, rgb.g * factor, rgb.b * factor);
}

// Helper: Tint with White
function mixWithWhite(hex: string, weightPercent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const w = weightPercent / 100;
  return rgbToHex(rgb.r * (1 - w) + 255 * w, rgb.g * (1 - w) + 255 * w, rgb.b * (1 - w) + 255 * w);
}

// Helper: Tint with Black for Dark Mode
function mixWithBlack(hex: string, weightPercent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const w = weightPercent / 100;
  return rgbToHex(rgb.r * (1 - w), rgb.g * (1 - w), rgb.b * (1 - w));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeState>(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);

  // Initialize from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.accentColor) {
          setTheme(parsed);
        }
      }
    } catch {
      // Ignore localStorage errors
    } finally {
      setMounted(true);
    }
  }, []);

  // Apply CSS variables to :root whenever theme changes
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const { accentColor } = theme;

    const accentHover = adjustBrightness(accentColor, -16);
    const accentLight = mixWithWhite(accentColor, 91);
    const accentSubtle = mixWithWhite(accentColor, 82);

    // Harmonize the entire app (canvas background, inputs, borders, typography) with chosen brand color
    const bg = mixWithWhite(accentColor, 96.5);
    const surface = '#ffffff';
    const input = mixWithWhite(accentColor, 92);
    const border = mixWithWhite(accentColor, 84);
    const borderLight = mixWithWhite(accentColor, 93);
    const text = mixWithBlack(accentColor, 82);
    const textMuted = mixWithBlack(accentColor, 55);
    const textSubtle = mixWithWhite(mixWithBlack(accentColor, 35), 35);
    const placeholder = mixWithWhite(mixWithBlack(accentColor, 25), 45);

    root.style.setProperty('--warm-accent', accentColor);
    root.style.setProperty('--warm-accent-hover', accentHover);
    root.style.setProperty('--warm-accent-light', accentLight);
    root.style.setProperty('--warm-accent-subtle', accentSubtle);

    root.style.setProperty('--warm-bg', bg);
    root.style.setProperty('--warm-surface', surface);
    root.style.setProperty('--warm-input', input);
    root.style.setProperty('--warm-border', border);
    root.style.setProperty('--warm-border-light', borderLight);
    root.style.setProperty('--warm-text', text);
    root.style.setProperty('--warm-text-muted', textMuted);
    root.style.setProperty('--warm-text-subtle', textSubtle);
    root.style.setProperty('--warm-placeholder', placeholder);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    } catch {
      // Ignore write errors
    }
  }, [theme]);

  const setAccentColor = (color: string) => {
    // Check if it matches an existing preset
    const matchedPreset = PRESET_THEMES.find((p) => p.accent.toLowerCase() === color.toLowerCase());
    setTheme((prev) => ({
      ...prev,
      accentColor: color,
      presetId: matchedPreset ? matchedPreset.id : 'custom'
    }));
  };

  const setMode = (mode: ThemeMode) => {
    setTheme((prev) => ({ ...prev, mode }));
  };

  const selectPreset = (preset: ThemePreset) => {
    setTheme((prev) => ({
      ...prev,
      accentColor: preset.accent,
      presetId: preset.id
    }));
  };

  const resetTheme = () => {
    setTheme(DEFAULT_THEME);
  };

  return (
    <ThemeContext.Provider
      value={{
        accentColor: theme.accentColor,
        mode: theme.mode,
        presetId: theme.presetId,
        setAccentColor,
        setMode,
        selectPreset,
        resetTheme,
        presets: PRESET_THEMES
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
