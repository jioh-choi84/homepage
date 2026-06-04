interface Props {
  /** 메인 본문 HTML (한글+이미지+영상) */
  html: string | null;
  /** 영문 글(글만) — 있으면 메인 본문 아래에 이어서 표시(언어 전환과 무관, 항상) */
  en?: string | null;
  className?: string;
}

/**
 * 리치 본문 렌더. CKEditor 콘텐츠 스타일(.ck-content)을 그대로 적용해
 * 편집기에서 보이던 줄바꿈·이미지/영상 배치와 동일하게 표시한다.
 * 본문은 단일 글이며, 영문(en)이 있으면 한글 본문 하단에 자연스럽게 이어 붙인다.
 */
export default function LocalizedRichContent({ html, en, className = '' }: Props) {
  const hasEn = !!(en && en.trim());
  return (
    <div className={className}>
      <div className="ck-content" dangerouslySetInnerHTML={{ __html: html || '' }} />
      {hasEn && (
        <div className="mt-10 pt-8 border-t border-[var(--border)]">
          <p className="text-xs uppercase tracking-[0.15em] text-[var(--text-secondary)] mb-4">English</p>
          <div className="ck-content" dangerouslySetInnerHTML={{ __html: en! }} />
        </div>
      )}
    </div>
  );
}
