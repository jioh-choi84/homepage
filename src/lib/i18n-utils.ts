import type { Locale } from '@/i18n';

/**
 * 현재 언어에 따라 영문 또는 한글 값을 반환
 * 영문 값이 없으면 한글 값으로 폴백
 */
export function getLocalizedValue<T>(
  locale: Locale,
  koValue: T,
  enValue: T | null | undefined
): T {
  if (locale === 'en' && enValue !== null && enValue !== undefined) {
    // 문자열인 경우 빈 문자열도 체크
    if (typeof enValue === 'string' && enValue.trim() === '') {
      return koValue;
    }
    // 배열인 경우 빈 배열도 체크
    if (Array.isArray(enValue) && enValue.length === 0) {
      return koValue;
    }
    return enValue;
  }
  return koValue;
}

/**
 * 번역 문자열에서 플레이스홀더를 치환
 * 예: "© {year} {name}" -> "© 2024 정환"
 */
export function formatTranslation(
  template: string,
  values: Record<string, string | number>
): string {
  return template.replace(/{(\w+)}/g, (_, key) => {
    return values[key]?.toString() ?? '';
  });
}
