'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { Artwork } from '@/types/artwork';
import ZoomableImage, { ZoomableImageRef } from './ZoomableImage';
import LanguageSwitch from '@/components/common/LanguageSwitch';
import { useLocale } from '@/i18n';
import { getLocalizedValue } from '@/lib/i18n-utils';
import { cloudinaryLoader } from '@/lib/cloudinary-loader';

interface ArtworkModalProps {
  artwork: Artwork;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  groupLabel?: string; // 예: "#Recovery 3/12"
  artworkTags?: string[]; // 작품의 태그 목록
  onTagClick?: (tagName: string) => void; // 태그 클릭 시 콜백
  preloadImages?: string[]; // 좌우 작품 이미지 프리로드 URL
}

export default function ArtworkModal({
  artwork,
  onClose,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  groupLabel,
  artworkTags,
  onTagClick,
  preloadImages,
}: ArtworkModalProps) {
  const { locale, t } = useLocale();
  const [showCopyrightPopup, setShowCopyrightPopup] = useState(false);
  const [contactEmail, setContactEmail] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const swipeRef = useRef<{ startX: number; startY: number; startTime: number } | null>(null);
  const zoomRef = useRef<ZoomableImageRef>(null);

  // 뒤로가기 시 모달 닫기 (히스토리 연동)
  useEffect(() => {
    // 모달 열릴 때 히스토리에 상태 추가
    window.history.pushState({ modal: true }, '');
    
    const handlePopState = () => {
      // 뒤로가기 시 모달 닫기
      onClose();
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 모달 닫기 시 히스토리 정리
  const handleClose = useCallback(() => {
    // pushState로 추가한 히스토리 제거
    if (window.history.state?.modal) {
      window.history.back();
    } else {
      onClose();
    }
  }, [onClose]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          if (showCopyrightPopup) {
            setShowCopyrightPopup(false);
          } else {
            handleClose();
          }
          break;
        case 'ArrowLeft':
          if (hasPrev && onPrev && !showCopyrightPopup) {
            setSlideDirection('right');
            onPrev();
          }
          break;
        case 'ArrowRight':
          if (hasNext && onNext && !showCopyrightPopup) {
            setSlideDirection('left');
            onNext();
          }
          break;
      }
    },
    [handleClose, onPrev, onNext, hasPrev, hasNext, showCopyrightPopup]
  );

  // 좌우 작품 이미지 프리로드 (Cloudinary transform 적용 + GC 방지)
  const preloadedImagesRef = useRef<HTMLImageElement[]>([]);
  useEffect(() => {
    if (!preloadImages || preloadImages.length === 0) return;
    preloadedImagesRef.current = [];
    
    // 뷰포트 너비 기준으로 실제 로드될 URL 생성
    const viewportWidth = window.innerWidth;
    // Next.js Image는 deviceSizes 기준으로 srcset 생성: 640, 750, 828, 1080, 1200, 1920, 2048, 3840
    const targetWidth = [640, 750, 828, 1080, 1200, 1920, 2048, 3840].find(w => w >= viewportWidth) || 1920;
    
    preloadImages.forEach(url => {
      if (url) {
        // Cloudinary URL이면 transform 적용
        const preloadUrl = url.includes('res.cloudinary.com')
          ? cloudinaryLoader({ src: url, width: targetWidth })
          : url;
        const img = new window.Image();
        img.src = preloadUrl;
        preloadedImagesRef.current.push(img);
      }
    });
  }, [preloadImages]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  useEffect(() => {
    const handleContextMenuEvent = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const isPointerFine = window.matchMedia('(pointer: fine)').matches;
      if (isPointerFine) {
        setShowCopyrightPopup(true);
      }
      return false;
    };
    document.addEventListener('contextmenu', handleContextMenuEvent, true);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenuEvent, true);
    };
  }, []);

  useEffect(() => {
    const fetchContactEmail = async () => {
      try {
        const { cachedFetch } = await import('@/lib/client-cache');
        const data = await cachedFetch<{ contact_email?: string }>('/api/about');
        if (data.contact_email) setContactEmail(data.contact_email);
      } catch {
        // Ignore errors
      }
    };
    fetchContactEmail();
  }, []);

  const handleSwipeStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1 || isZoomed) return;
    swipeRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      startTime: Date.now(),
    };
  }, [isZoomed]);

  const handleSwipeEnd = useCallback((e: React.TouchEvent) => {
    if (!swipeRef.current || isZoomed) {
      swipeRef.current = null;
      return;
    }
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - swipeRef.current.startX;
    const deltaY = touch.clientY - swipeRef.current.startY;
    const elapsed = Date.now() - swipeRef.current.startTime;
    swipeRef.current = null;

    const SWIPE_THRESHOLD = 50;
    const SWIPE_MAX_TIME = 500;

    if (elapsed > SWIPE_MAX_TIME) return;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
    if (Math.abs(deltaX) < Math.abs(deltaY)) return;

    if (deltaX < 0 && hasNext && onNext) {
      setSlideDirection('left');
      onNext();
    } else if (deltaX > 0 && hasPrev && onPrev) {
      setSlideDirection('right');
      onPrev();
    }
  }, [isZoomed, hasNext, hasPrev, onNext, onPrev]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowCopyrightPopup(true);
    return false;
  }, []);

  const formatSize = () => {
    if (artwork.variable_size) {
      return locale === 'en' ? 'Variable dimensions' : '가변크기';
    }
    if (!artwork.width || !artwork.height) return null;
    if (locale === 'en') {
      const heightInch = (artwork.height * 0.393701).toFixed(1);
      const widthInch = (artwork.width * 0.393701).toFixed(1);
      return `${artwork.height} × ${artwork.width} cm (${heightInch} × ${widthInch} in)`;
    }
    return `${artwork.height} × ${artwork.width} cm`;
  };

  const getMedium = () => {
    return getLocalizedValue(locale, artwork.medium, artwork.medium_en);
  };

  const getCollection = () => {
    return getLocalizedValue(locale, artwork.collection, artwork.collection_en);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--background)] animate-fade-in flex flex-col" onContextMenu={handleContextMenu}>
      {/* Copyright popup */}
      {showCopyrightPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6 max-w-md mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-500">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M14.83 14.83a4 4 0 1 1 0-5.66" />
                </svg>
              </div>
              <h3 className="text-[var(--foreground)] text-lg font-medium">
                {locale === 'en' ? 'Copyright Notice' : '저작권 안내'}
              </h3>
            </div>
            <div className="text-[var(--text-secondary)] text-sm space-y-3">
              <p>
                {locale === 'en'
                  ? 'All artworks displayed on this website are protected by copyright law. Unauthorized copying, reproduction, distribution, or commercial use is strictly prohibited.'
                  : '본 웹사이트에 게시된 모든 작품은 저작권법에 의해 보호됩니다. 무단 복제, 배포, 상업적 이용은 법적 제재를 받을 수 있습니다.'}
              </p>
              <p>
                {locale === 'en'
                  ? 'For licensing inquiries or permission requests, please contact:'
                  : '작품 사용 및 라이선스 문의는 아래로 연락해 주세요:'}
              </p>
              {contactEmail && (
                <a
                  href={`mailto:${contactEmail}`}
                  className="inline-flex items-center gap-2 text-[var(--foreground)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  {contactEmail}
                </a>
              )}
            </div>
            <button
              onClick={() => setShowCopyrightPopup(false)}
              className="mt-6 w-full py-2 bg-white text-black rounded hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              {locale === 'en' ? 'Close' : '확인'}
            </button>
          </div>
        </div>
      )}

      {/* Top bar: Language switch + Close button */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <LanguageSwitch />
        <button
          onClick={handleClose}
          className="w-10 h-10 flex items-center justify-center text-[var(--foreground)]/70 hover:text-[var(--foreground)] transition-colors"
          aria-label={t.aria.closeModal}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Main content: Left arrow + Image + Right arrow */}
      <div className="flex-1 flex">
        {/* 왼쪽 화살표 영역 (고정 너비) */}
        <div className="w-16 shrink-0 flex items-center justify-center">
          {hasPrev && onPrev && (
            <button
              onClick={() => { setSlideDirection('right'); onPrev(); }}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--accent)] hover:text-[var(--background)] transition-all duration-300"
              aria-label={t.aria.prevArtwork}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
        </div>

        {/* 이미지 영역 (가운데, flex-1) */}
        <div
          key={artwork.id}
          className={`flex-1 relative overflow-hidden ${
            slideDirection === 'left' ? 'animate-slide-in-right' :
            slideDirection === 'right' ? 'animate-slide-in-left' : ''
          }`}
          style={{ clipPath: 'inset(0)', contain: 'paint' }}
          onTouchStart={handleSwipeStart}
          onTouchEnd={handleSwipeEnd}
          onAnimationEnd={() => setSlideDirection(null)}
        >
          <ZoomableImage
            ref={zoomRef}
            src={artwork.image_url}
            alt={getLocalizedValue(locale, artwork.title, artwork.title_en)}
            onScaleChange={(scale) => setIsZoomed(scale > 1.05)}
            onLongPress={() => setShowCopyrightPopup(true)}
          />
          {/* Copyright watermark overlay — 5개: 4 모서리 + 중앙 */}
          {(artwork.show_watermark ?? true) && (
            <div className="absolute inset-0 pointer-events-none">
              {/* 2x2 그리드 (모서리 4개) */}
              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center justify-center">
                    <span className="text-[var(--foreground)]/[0.13] text-3xl md:text-5xl font-bold select-none rotate-[-30deg]">
                      COPYRIGHT
                    </span>
                  </div>
                ))}
              </div>
              {/* 중앙 1개 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[var(--foreground)]/[0.13] text-3xl md:text-5xl font-bold select-none rotate-[-30deg]">
                  COPYRIGHT
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 오른쪽 화살표 영역 (고정 너비) */}
        <div className="w-16 shrink-0 flex items-center justify-center">
          {hasNext && onNext && (
            <button
              onClick={() => { setSlideDirection('left'); onNext(); }}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--accent)] hover:text-[var(--background)] transition-all duration-300"
              aria-label={t.aria.nextArtwork}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Bottom bar: Zoom controls (정중앙) + Artwork info (버튼 우측) */}
      <div
        key={`info-${artwork.id}`}
        className={`shrink-0 grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3 border-t border-[var(--border)] bg-[var(--surface)] ${
          slideDirection === 'left' ? 'animate-slide-in-right' :
          slideDirection === 'right' ? 'animate-slide-in-left' : ''
        }`}
      >
        {/* 왼쪽: 그룹 라벨 또는 태그 목록 */}
        <div className="flex flex-wrap gap-2">
          {groupLabel && groupLabel.startsWith('__COLOR_BLOCK__') ? (() => {
            // 색상 블록 모드: "__COLOR_BLOCK__#e53e3e__3/12"
            const parts = groupLabel.split('__');
            const color = parts[2] || '#999';
            const position = parts[3] || '';
            return (
              <button
                onClick={() => onTagClick?.('__COLOR_BACK__')}
                className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-70"
              >
                <div
                  className="w-5 h-5 rounded"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm text-[var(--text-secondary)]">
                  {position}
                </span>
              </button>
            );
          })() : groupLabel && groupLabel.startsWith('__YEAR_BLOCK__') ? (() => {
            // 연도 블록 모드: "__YEAR_BLOCK__2024__3/12"
            const parts = groupLabel.split('__');
            const year = parts[2] || '';
            const position = parts[3] || '';
            return (
              <button
                onClick={() => onTagClick?.('__YEAR_BACK__')}
                className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-70"
              >
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {year}
                </span>
                <span className="text-sm text-[var(--text-secondary)]">
                  {position}
                </span>
              </button>
            );
          })() : groupLabel ? (
            <button
              onClick={() => {
                // groupLabel에서 태그명 추출: "#Recovery 3/12" → "Recovery"
                const match = groupLabel.match(/^#(.+?)\s+\d/);
                if (match) onTagClick?.(match[1]);
              }}
              className="text-sm hover:underline cursor-pointer transition-opacity hover:opacity-70"
              style={{ color: 'rgb(178, 34, 34)' }}
            >
              {groupLabel}
            </button>
          ) : artworkTags && artworkTags.length > 0 ? (
            artworkTags.map(tag => (
              <button
                key={tag}
                onClick={() => onTagClick?.(tag)}
                className="text-sm hover:underline cursor-pointer transition-opacity hover:opacity-70"
                style={{ color: 'rgb(178, 34, 34)' }}
              >
                #{tag}
              </button>
            ))
          ) : null}
        </div>

        {/* Zoom controls - 정중앙 */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => zoomRef.current?.zoomOut()}
            className="w-8 h-8 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--border)] rounded transition-colors"
            aria-label="축소"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            onClick={() => zoomRef.current?.zoomIn()}
            className="w-8 h-8 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--border)] rounded transition-colors"
            aria-label="확대"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            onClick={() => zoomRef.current?.resetTransform()}
            className="w-8 h-8 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--border)] rounded transition-colors"
            aria-label="원래 크기"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        </div>

        {/* Artwork info - 우측, 좌측정렬 */}
        <div className="pl-6 text-left">
          <p className="text-[var(--foreground)] font-medium">
            {getLocalizedValue(locale, artwork.title, artwork.title_en)}
            <span className="text-[var(--text-secondary)] font-normal ml-2">{artwork.year}</span>
          </p>
          <p className="text-[var(--text-secondary)] text-sm">
            {formatSize()}
            {getMedium() && (formatSize() ? ` · ${getMedium()}` : getMedium())}
            {getCollection() && ` · ${t.artwork.collection}: ${getCollection()}`}
          </p>
        </div>
      </div>
    </div>
  );
}
