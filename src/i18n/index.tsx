'use client';

import {
  createContext,
  useContext,
  useState,
  ReactNode,
} from 'react';
import { ko, type Translations } from './translations/ko';
import { en } from './translations/en';

export type Locale = 'ko' | 'en';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

const translations: Record<Locale, Translations> = { ko, en };

export function LocaleProvider({
  children,
  initialLocale = 'ko',
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  // 초기 언어는 서버(layout)에서 접속 국가로 결정해 prop으로 전달.
  // 서버·클라이언트가 동일한 값으로 시작하므로 하이드레이션 불일치/깜빡임 없음.
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // 전환 버튼은 메모리 상태로만 적용(영구 저장 없음).
  // 하드 리로드 시 다시 IP 기준으로 복귀("항상 IP 우선" 정책).
  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    document.documentElement.lang = newLocale;
  };

  return (
    <LocaleContext.Provider
      value={{ locale, setLocale, t: translations[locale] }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}

// 조건부 훅 - Provider 외부에서도 안전하게 사용
export function useLocaleOptional() {
  const context = useContext(LocaleContext);
  return context;
}
