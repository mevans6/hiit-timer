'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export const THEME_COLORS = [
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Blue',   value: '#3b82f6' },
  { name: 'Red',    value: '#ef4444' },
  { name: 'Green',  value: '#22c55e' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Pink',   value: '#ec4899' },
] as const;

export type ThemeColor = typeof THEME_COLORS[number]['value'];

const STORAGE_KEY = 'hiit-theme-color';
const DEFAULT_COLOR: ThemeColor = '#8b5cf6';

interface ThemeContextValue {
  accent: ThemeColor;
  setAccent: (c: ThemeColor) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  accent: DEFAULT_COLOR,
  setAccent: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState<ThemeColor>(DEFAULT_COLOR);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeColor | null;
    if (stored && THEME_COLORS.some(c => c.value === stored)) {
      setAccentState(stored);
    }
  }, []);

  function setAccent(c: ThemeColor) {
    setAccentState(c);
    localStorage.setItem(STORAGE_KEY, c);
  }

  return (
    <ThemeContext.Provider value={{ accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
