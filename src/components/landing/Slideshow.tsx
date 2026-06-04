'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Artwork } from '@/types/artwork';
import { useLocale } from '@/i18n';
import { getLocalizedValue } from '@/lib/i18n-utils';
import { cloudinaryLoader } from '@/lib/cloudinary-loader';

interface SlideshowProps {
  artworks: Artwork[];
}

export default function Slideshow({ artworks }: SlideshowProps) {
  const { locale, t } = useLocale();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoPlayTimer = useRef<NodeJS.Timeout | null>(null);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const autoPlayStopped = useRef(false); // 수동 조작 시 자동재생 영구 정지
  
  // 마우스 드래그 상태
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  
  // 터치 스와이프 상태 (감도 조절용)
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isTouchSwiping = useRef(false);

  // 무한 루프를 위해 앞뒤 클론 포함한 슬라이드 배열
  // [last, ...artworks, first] → 실제 인덱스는 +1 오프셋
  const hasMultiple = artworks.length > 1;
  const cloneOffset = hasMultiple ? 1 : 0;

  // 특정 인덱스로 스크롤 (클론 오프셋 적용)
  const scrollToIndex = useCallback((index: number, smooth = true) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const targetScroll = (index + cloneOffset) * container.offsetWidth;
    container.scrollTo({
      left: targetScroll,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, [cloneOffset]);

  const goToNext = useCallback(() => {
    if (artworks.length <= 1) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    
    setCurrentIndex(prev => {
      const nextIndex = prev + 1;
      if (nextIndex >= artworks.length) {
        // 마지막 → 클론 첫번째로 smooth 이동, 이후 진짜 첫번째로 점프
        const clonePos = (artworks.length + cloneOffset) * container.offsetWidth;
        container.scrollTo({ left: clonePos, behavior: 'smooth' });
        setTimeout(() => {
          container.scrollTo({ left: cloneOffset * container.offsetWidth, behavior: 'auto' });
        }, 500);
        return 0;
      }
      setTimeout(() => scrollToIndex(nextIndex), 0);
      return nextIndex;
    });
  }, [artworks.length, scrollToIndex, cloneOffset]);

  const goToPrev = useCallback(() => {
    if (artworks.length <= 1) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    
    setCurrentIndex(prev => {
      const prevIndex = prev - 1;
      if (prevIndex < 0) {
        // 첫번째 → 클론 마지막으로 smooth 이동, 이후 진짜 마지막으로 점프
        container.scrollTo({ left: 0, behavior: 'smooth' });
        setTimeout(() => {
          const realLastPos = (artworks.length - 1 + cloneOffset) * container.offsetWidth;
          container.scrollTo({ left: realLastPos, behavior: 'auto' });
        }, 500);
        return artworks.length - 1;
      }
      setTimeout(() => scrollToIndex(prevIndex), 0);
      return prevIndex;
    });
  }, [artworks.length, scrollToIndex, cloneOffset]);

  // 자동 재생 (7초 간격, 기존 5초에서 +2초)
  const startAutoPlay = useCallback(() => {
    if (artworks.length <= 1 || autoPlayStopped.current) return;
    if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    autoPlayTimer.current = setInterval(goToNext, 7000);
  }, [artworks.length, goToNext]);

  const stopAutoPlay = useCallback(() => {
    if (autoPlayTimer.current) {
      clearInterval(autoPlayTimer.current);
      autoPlayTimer.current = null;
    }
  }, []);

  // 수동 조작 시 자동재생 영구 정지
  const stopAutoPlayPermanently = useCallback(() => {
    autoPlayStopped.current = true;
    stopAutoPlay();
  }, [stopAutoPlay]);

  // 초기 스크롤 위치 (클론 오프셋만큼)
  useEffect(() => {
    if (hasMultiple) {
      const container = scrollContainerRef.current;
      if (container) {
        container.scrollTo({ left: cloneOffset * container.offsetWidth, behavior: 'auto' });
      }
    }
  }, [hasMultiple, cloneOffset]);

  useEffect(() => {
    startAutoPlay();
    return () => {
      stopAutoPlay();
    };
  }, [startAutoPlay, stopAutoPlay]);

  // 스크롤 이벤트 - 현재 인덱스 업데이트
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || isDragging.current) return;

    // 스크롤 끝 감지 (debounce)
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      const scrollPos = container.scrollLeft;
      const slideWidth = container.offsetWidth;
      const rawIndex = Math.round(scrollPos / slideWidth);
      const newIndex = rawIndex - cloneOffset; // 클론 오프셋 제거
      
      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < artworks.length) {
        setCurrentIndex(newIndex);
      }
    }, 100);
  }, [currentIndex, artworks.length]);

  // 마우스 드래그 시작
  const handleMouseDown = (e: React.MouseEvent) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    isDragging.current = true;
    startX.current = e.pageX - container.offsetLeft;
    scrollLeft.current = container.scrollLeft;
    stopAutoPlay();
    
    container.style.cursor = 'grabbing';
    container.style.scrollSnapType = 'none'; // 드래그 중 스냅 비활성화
  };

  // 마우스 드래그 중
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX.current) * 1.5; // 드래그 속도 배율
    container.scrollLeft = scrollLeft.current - walk;
  };

  // 마우스 드래그 종료
  const handleMouseUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    
    const container = scrollContainerRef.current;
    if (!container) return;
    
    container.style.cursor = 'grab';
    container.style.scrollSnapType = 'x mandatory'; // 스냅 다시 활성화
    
    // 가장 가까운 슬라이드로 스냅 (클론 오프셋 고려)
    const scrollPos = container.scrollLeft;
    const slideWidth = container.offsetWidth;
    const rawIndex = Math.round(scrollPos / slideWidth);
    const newIndex = rawIndex - cloneOffset;
    
    if (newIndex >= 0 && newIndex < artworks.length) {
      setCurrentIndex(newIndex);
      scrollToIndex(newIndex);
    } else if (newIndex < 0) {
      setCurrentIndex(artworks.length - 1);
      scrollToIndex(artworks.length - 1);
    } else if (newIndex >= artworks.length) {
      setCurrentIndex(0);
      scrollToIndex(0);
    }
    
    stopAutoPlayPermanently();
  };

  const handleMouseLeave = () => {
    if (isDragging.current) {
      handleMouseUp();
    }
  };

  // 터치 스와이프 — 감도 낮추기 (최소 80px 이동 필요)
  const SWIPE_THRESHOLD = 80;
  
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isTouchSwiping.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isTouchSwiping.current) {
      const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
      const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
      // 수평 스와이프 감지 (수평 > 수직)
      if (dx > dy && dx > 10) {
        isTouchSwiping.current = true;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isTouchSwiping.current) return;
    
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    
    if (Math.abs(dx) >= SWIPE_THRESHOLD) {
      stopAutoPlayPermanently();
      if (dx < 0) {
        goToNext(); // 왼쪽 스와이프 → 다음
      } else {
        goToPrev(); // 오른쪽 스와이프 → 이전
      }
    }
  };

  // 화살표 클릭 — 수동 조작 시 자동재생 영구 정지
  const handleArrowClick = (direction: 'prev' | 'next') => {
    stopAutoPlayPermanently();
    if (direction === 'prev') goToPrev();
    else goToNext();
  };

  // 도트 클릭 — 수동 조작 시 자동재생 영구 정지
  const handleDotClick = (index: number) => {
    stopAutoPlayPermanently();
    setCurrentIndex(index);
    scrollToIndex(index);
  };

  if (artworks.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center pt-24">
        <p className="text-[var(--text-secondary)] text-lg">No artworks to display</p>
      </div>
    );
  }

  const currentArtwork = artworks[currentIndex];
  const title = getLocalizedValue(locale, currentArtwork.title, currentArtwork.title_en);

  return (
    <div className="h-screen pt-24 flex flex-col">
      {/* 스크롤 컨테이너 */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 relative overflow-x-auto overflow-y-hidden select-none"
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          scrollSnapType: 'x mandatory',
          cursor: 'grab',
        }}
        onScroll={handleScroll}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* 모든 슬라이드 (무한루프: [클론마지막, ...원본, 클론첫번째]) */}
        <div className="flex h-full">
          {(() => {
            const slides = [...artworks];
            // 무한루프용 클론 슬라이드 추가
            if (hasMultiple) {
              slides.unshift(artworks[artworks.length - 1]); // 앞에 마지막 클론
              slides.push(artworks[0]); // 뒤에 첫번째 클론
            }
            return slides.map((artwork, index) => (
              <div 
                key={`slide-${index}`}
                className="flex-shrink-0 w-full h-full snap-center flex items-center justify-center p-8"
              >
                <div className="relative w-full h-full max-w-5xl mx-auto">
                  <Image
                    src={artwork.image_url}
                    alt={artwork.title}
                    fill
                    className="object-contain pointer-events-none"
                    sizes="(max-width: 768px) 100vw, 80vw"
                    draggable={false}
                    priority={index <= 3}
                    {...(artwork.image_url?.includes('res.cloudinary.com') ? { loader: cloudinaryLoader } : {})}
                  />
                </div>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Navigation Arrows */}
      {artworks.length > 1 && (
        <>
          <button
            onClick={() => handleArrowClick('prev')}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors z-10"
            aria-label={t.aria.prevArtwork}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
              className="w-8 h-8"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            onClick={() => handleArrowClick('next')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors z-10"
            aria-label={t.aria.nextArtwork}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
              className="w-8 h-8"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </>
      )}

      {/* Artwork Info */}
      <div className="py-6 px-8 text-center">
        <h2 className="text-lg font-light tracking-wide text-[var(--foreground)]">
          {title}
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {currentArtwork.year}
        </p>
      </div>

      {/* Dots Indicator */}
      {artworks.length > 1 && (
        <div className="pb-8 flex justify-center gap-2">
          {artworks.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-white' : 'bg-gray-600'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* 스크롤바 숨기기 */}
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
