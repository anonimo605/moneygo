'use client';

import React, { createContext, useState, useContext, useMemo, type ReactNode, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { AppConfig } from '@/lib/types';


type Currency = 'USD' | 'COP';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  exchangeRate: number;
  formatCurrency: (value: number, options?: Intl.NumberFormatOptions & { currency?: Currency, isValueInSourceCurrency?: boolean }) => string;
  isLoadingRate: boolean;
  appConfig: AppConfig | null;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const DEFAULT_EXCHANGE_RATE = 4000;

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>('USD');
  const firestore = useFirestore();

  const currencyConfigRef = useMemoFirebase(() => {
      if (!firestore) return null;
      return doc(firestore, 'app_config', 'main');
  }, [firestore]);
  const { data: appConfig, isLoading: isLoadingConfig } = useDoc<AppConfig>(currencyConfigRef);

  const exchangeRate = useMemo(() => appConfig?.cop_exchange_rate || DEFAULT_EXCHANGE_RATE, [appConfig]);

  const formatCurrency = useMemo(() => (value: number, options: Intl.NumberFormatOptions & { currency?: Currency, isValueInSourceCurrency?: boolean } = {}) => {
    const displayCurrency = options.currency || currency;
    const { isValueInSourceCurrency, ...restOptions } = options;

    let valueToFormat: number;
    if (isValueInSourceCurrency && displayCurrency === 'COP') {
        valueToFormat = value;
    } else {
        // Default behavior: value is always in USD, convert if needed
        valueToFormat = displayCurrency === 'COP' ? value * exchangeRate : value;
    }
    
    const defaultOptions: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: displayCurrency,
    };
    
    if (displayCurrency === 'COP') {
        defaultOptions.minimumFractionDigits = 0;
        defaultOptions.maximumFractionDigits = 0;
    } else {
        defaultOptions.minimumFractionDigits = 2;
        defaultOptions.maximumFractionDigits = 2;
    }

    const { currency: optionCurrency, ...intlOptions } = restOptions;
    const finalOptions = { ...defaultOptions, ...intlOptions };
    
    let locale = 'en-US';
    if (displayCurrency === 'COP') {
      locale = 'es-CO';
    }
    
    return new Intl.NumberFormat(locale, finalOptions).format(valueToFormat);

  }, [currency, exchangeRate]);

  const value = {
    currency,
    setCurrency,
    exchangeRate,
    formatCurrency,
    isLoadingRate: isLoadingConfig,
    appConfig: appConfig ?? null,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
