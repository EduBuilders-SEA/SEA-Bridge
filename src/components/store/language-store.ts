'use client';

import { languages } from '@/lib/languages';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = (typeof languages)[number]['value'];

interface LanguageState {
  selectedLanguage: Language;
  setSelectedLanguage: (language: Language) => void;
  getLanguageLabel: (language: Language) => string;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, _get) => ({
      selectedLanguage: 'English',

      setSelectedLanguage: (language: Language) => {
        set({ selectedLanguage: language });
      },

      getLanguageLabel: (language: Language) => {
        const lang = languages.find((l) => l.value === language);
        return lang?.label ?? language;
      },
    }),
    {
      name: 'translation-language-storage', // unique name for localStorage
    }
  )
);
