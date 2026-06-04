'use client';

import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import Image from 'next/image';
import { cloudinaryLoader } from '@/lib/cloudinary-loader';

export interface ZoomableImageRef {
  zoomIn: () => void;
  zoomOut: () => void;
  resetTransform: () => void;
}

interface ZoomableImageProps {
  src: string;
  alt: string;
  onScaleChange?: (scale: number) => void;
  onLongPress?: () => void;
}

const MAGNIFIER_SIZE = 400;
const MAGNIFIER_ZOOM = 2.5;
const MAGNIFIER_DELAY = 500;
const LONG_PRESS_DELAY = 3000;

const ZoomableImage = forwardRef<ZoomableImageRef, ZoomableImageProps>(
  ({ src, alt, onScaleChange, onLongPress }, ref) => {
    const [showMagnifier, setShowMagnifier] = useState(false);
    const [magnifierPos, setMagnifierPos] = useState({ x: 0, y: 0 });
    const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 });
    const [currentScale, setCurrentScale] = useState(1);
    const isZoomed = currentScale > 1.05;
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const transformRef = useRef<ReactZoomPanPinchRef>(null);
    const magnifierTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const touchPosRef = useRef<{ clientX: number; clientY: number } | null>(null);

    // 외부에서 줌 컨트롤 사용 가능하도록 노출
    useImperativeHandle(ref, () => ({
      zoomIn: () => transformRef.current?.zoomIn(),
      zoomOut: () => transformRef.current?.zoomOut(),
      resetTransform: () => transformRef.current?.resetTransform(),
    }));

    const updateImageDimensions = useCallback(() => {
      if (imageRef.current && imageContainerRef.current) {
        const container = imageContainerRef.current;
        const containerRect = container.getBoundingClientRect();
        const img = imageRef.current;

        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;

        const containerAspect = containerRect.width / containerRect.height;
        const imageAspect = naturalWidth / naturalHeight;

        let displayWidth, displayHeight;
        if (imageAspect > containerAspect) {
          displayWidth = containerRect.width;
          displayHeight = containerRect.width / imageAspect;
        } else {
          displayHeight = containerRect.height;
          displayWidth = containerRect.height * imageAspect;
        }

        setImageDimensions({
          width: displayWidth,
          height: displayHeight,
          naturalWidth,
          naturalHeight,
        });
      }
    }, []);

    const handleImageLoad = useCallback(() => {
      const imgElement = imageContainerRef.current?.querySelector('img');
      if (imgElement) {
        imageRef.current = imgElement;
        updateImageDimensions();
      }
    }, [updateImageDimensions]);

    useEffect(() => {
      window.addEventListener('resize', updateImageDimensions);
      return () => window.removeEventListener('resize', updateImageDimensions);
    }, [updateImageDimensions]);

    const updateMagnifierPosition = useCallback((clientX: number, clientY: number) => {
      if (!imageContainerRef.current) return;
      const container = imageContainerRef.current;
      const rect = container.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      setMagnifierPos({ x, y });
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (isZoomed) return;
      updateMagnifierPosition(e.clientX, e.clientY);
      setShowMagnifier(true);
    }, [updateMagnifierPosition, isZoomed]);

    const handleMouseUp = useCallback(() => {
      setShowMagnifier(false);
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (!showMagnifier) return;
      updateMagnifierPosition(e.clientX, e.clientY);
    }, [showMagnifier, updateMagnifierPosition]);

    const handleMouseLeave = useCallback(() => {
      setShowMagnifier(false);
    }, []);

    const clearTouchTimers = useCallback(() => {
      if (magnifierTimerRef.current) {
        clearTimeout(magnifierTimerRef.current);
        magnifierTimerRef.current = null;
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }, []);

    const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
      if (e.touches.length !== 1 || isZoomed) return;
      const touch = e.touches[0];
      touchPosRef.current = { clientX: touch.clientX, clientY: touch.clientY };

      magnifierTimerRef.current = setTimeout(() => {
        if (touchPosRef.current) {
          updateMagnifierPosition(touchPosRef.current.clientX, touchPosRef.current.clientY);
          setShowMagnifier(true);
        }
      }, MAGNIFIER_DELAY);

      longPressTimerRef.current = setTimeout(() => {
        setShowMagnifier(false);
        clearTouchTimers();
        onLongPress?.();
      }, LONG_PRESS_DELAY);
    }, [isZoomed, updateMagnifierPosition, clearTouchTimers, onLongPress]);

    const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      touchPosRef.current = { clientX: touch.clientX, clientY: touch.clientY };

      if (showMagnifier && !isZoomed) {
        updateMagnifierPosition(touch.clientX, touch.clientY);
      } else {
        clearTouchTimers();
      }
    }, [showMagnifier, isZoomed, updateMagnifierPosition, clearTouchTimers]);

    const handleTouchEnd = useCallback(() => {
      clearTouchTimers();
      touchPosRef.current = null;
      setShowMagnifier(false);
    }, [clearTouchTimers]);

    const getMagnifierStyle = useCallback(() => {
      if (!imageContainerRef.current || !imageDimensions.width) return {};

      const container = imageContainerRef.current;
      const containerRect = container.getBoundingClientRect();

      const imageOffsetX = (containerRect.width - imageDimensions.width) / 2;
      const imageOffsetY = (containerRect.height - imageDimensions.height) / 2;

      const relativeX = magnifierPos.x - imageOffsetX;
      const relativeY = magnifierPos.y - imageOffsetY;

      const percentX = (relativeX / imageDimensions.width) * 100;
      const percentY = (relativeY / imageDimensions.height) * 100;

      const bgWidth = imageDimensions.width * MAGNIFIER_ZOOM;
      const bgHeight = imageDimensions.height * MAGNIFIER_ZOOM;

      const bgPosX = (percentX / 100) * bgWidth - MAGNIFIER_SIZE / 2;
      const bgPosY = (percentY / 100) * bgHeight - MAGNIFIER_SIZE / 2;

      return {
        left: magnifierPos.x - MAGNIFIER_SIZE / 2,
        top: magnifierPos.y - MAGNIFIER_SIZE / 2,
        width: MAGNIFIER_SIZE,
        height: MAGNIFIER_SIZE,
        backgroundImage: `url(${src})`,
        backgroundSize: `${bgWidth}px ${bgHeight}px`,
        backgroundPosition: `-${bgPosX}px -${bgPosY}px`,
        backgroundRepeat: 'no-repeat',
      };
    }, [magnifierPos, imageDimensions, src]);

    return (
      <div className="w-full h-full overflow-hidden" style={{ clipPath: 'inset(0)', contain: 'paint' }}>
        <TransformWrapper
          ref={transformRef}
          initialScale={1}
          minScale={1}
          maxScale={4}
          centerOnInit
          limitToBounds={true}
          alignmentAnimation={{ sizeX: 0, sizeY: 0 }}
          wheel={{ smoothStep: 0.001, activationKeys: [] }}
          doubleClick={{ mode: 'toggle' }}
          panning={{ disabled: !isZoomed || showMagnifier }}
          onTransformed={(_ref, state) => {
            setCurrentScale(state.scale);
            onScaleChange?.(state.scale);
          }}
        >
          <TransformComponent
            wrapperStyle={{ width: '100%', height: '100%' }}
            contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
          <div
            ref={imageContainerRef}
            className={`relative w-full h-full flex items-center justify-center ${
              isZoomed ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
            }`}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <Image
              src={src}
              alt={alt}
              fill
              sizes="100vw"
              className="object-contain"
              priority
              onLoad={handleImageLoad}
              {...(src?.includes('res.cloudinary.com') ? { loader: cloudinaryLoader } : {})}
            />

            {showMagnifier && (
              <div
                className="absolute rounded-lg border-2 border-white/50 shadow-lg pointer-events-none z-20"
                style={getMagnifierStyle()}
              />
            )}
          </div>
        </TransformComponent>
      </TransformWrapper>
      </div>
    );
  }
);

ZoomableImage.displayName = 'ZoomableImage';

export default ZoomableImage;
