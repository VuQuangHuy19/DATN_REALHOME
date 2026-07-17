'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type AccentColor = 'blue' | 'emerald' | 'violet' | 'rose' | 'orange';
export type AppLanguage = 'vi' | 'en';

interface AppPreferencesContextType {
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
}

const AppPreferencesContext = createContext<AppPreferencesContextType | undefined>(undefined);

const THEME_COLORS: Record<AccentColor, { light: any; dark: any }> = {
  blue: {
    // Mặc định
    light: {},
    dark: {},
  },
  emerald: {
    light: {
      '--accent': '#059669',
      '--accent-500': '#10b981',
      '--accent-soft': '#d1fae5',
      '--accent-hsl': '160 84% 39%',
      '--ring-hsl': '160 84% 39%',
    },
    dark: {
      '--accent': '#10b981', // emerald-500
      '--accent-500': '#34d399', // emerald-400
      '--accent-soft': '#064e3b',
      '--accent-hsl': '160 84% 39%',
      '--ring-hsl': '160 84% 39%',
    },
  },
  violet: {
    light: {
      '--accent': '#7c3aed',
      '--accent-500': '#8b5cf6',
      '--accent-soft': '#ede9fe',
      '--accent-hsl': '262 83% 58%',
      '--ring-hsl': '262 83% 58%',
    },
    dark: {
      '--accent': '#8b5cf6', // violet-500
      '--accent-500': '#a78bfa', // violet-400
      '--accent-soft': '#4c1d95',
      '--accent-hsl': '262 83% 58%',
      '--ring-hsl': '262 83% 58%',
    },
  },
  rose: {
    light: {
      '--accent': '#e11d48',
      '--accent-500': '#f43f5e',
      '--accent-soft': '#ffe4e6',
      '--accent-hsl': '343 79% 50%',
      '--ring-hsl': '343 79% 50%',
    },
    dark: {
      '--accent': '#f43f5e', // rose-500
      '--accent-500': '#fb7185', // rose-400
      '--accent-soft': '#881337',
      '--accent-hsl': '343 79% 50%',
      '--ring-hsl': '343 79% 50%',
    },
  },
  orange: {
    light: {
      '--accent': '#ea580c',
      '--accent-500': '#f97316',
      '--accent-soft': '#ffedd5',
      '--accent-hsl': '24 93% 48%',
      '--ring-hsl': '24 93% 48%',
    },
    dark: {
      '--accent': '#f97316', // orange-500
      '--accent-500': '#fb923c', // orange-400
      '--accent-soft': '#7c2d12',
      '--accent-hsl': '24 93% 48%',
      '--ring-hsl': '24 93% 48%',
    },
  },
};

export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [accentColor, setAccentColorState] = useState<AccentColor>('blue');
  const [language, setLanguageState] = useState<AppLanguage>('vi');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedColor = localStorage.getItem('bds_accent_color') as AccentColor;
    const savedLang = localStorage.getItem('bds_language') as AppLanguage;
    if (savedColor && THEME_COLORS[savedColor]) setAccentColorState(savedColor);
    if (savedLang) setLanguageState(savedLang);
    setMounted(true);
  }, []);

  const setAccentColor = (color: AccentColor) => {
    setAccentColorState(color);
    localStorage.setItem('bds_accent_color', color);
  };

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    localStorage.setItem('bds_language', lang);
  };

  useEffect(() => {
    if (!mounted) return;
    
    // Inject custom colors into document root
    const root = document.documentElement;
    const colors = THEME_COLORS[accentColor];
    
    if (accentColor === 'blue') {
      // Remove custom overrides
      document.getElementById('bds-custom-theme')?.remove();
      return;
    }

    let styleEl = document.getElementById('bds-custom-theme');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'bds-custom-theme';
      document.head.appendChild(styleEl);
    }

    const css = `
      :root {
        --accent: ${colors.light['--accent']};
        --accent-500: ${colors.light['--accent-500']};
        --accent-soft: ${colors.light['--accent-soft']};
      }
      .dark {
        --accent: ${colors.dark['--accent']};
        --accent-500: ${colors.dark['--accent-500']};
        --accent-soft: ${colors.dark['--accent-soft']};
      }
      @layer base {
        :root {
          --accent: ${colors.light['--accent-hsl']};
          --ring: ${colors.light['--ring-hsl']};
        }
        .dark {
          --accent: ${colors.dark['--accent-hsl']};
          --ring: ${colors.dark['--ring-hsl']};
        }
      }
    `;
    styleEl.innerHTML = css;
  }, [accentColor, mounted]);

  return (
    <AppPreferencesContext.Provider value={{ accentColor, setAccentColor, language, setLanguage }}>
      {children}
    </AppPreferencesContext.Provider>
  );
}

export const useAppPreferences = () => {
  const context = useContext(AppPreferencesContext);
  if (context === undefined) {
    throw new Error('useAppPreferences must be used within an AppPreferencesProvider');
  }
  return context;
};
