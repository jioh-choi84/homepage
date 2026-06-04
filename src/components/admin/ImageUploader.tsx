'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { compressImage, isTiff } from '@/lib/image-compress';

interface ImageUploaderProps {
  onUpload: (imageUrl: string, thumbnailUrl: string, originalName?: string) => void;
  currentImage?: string;
  /** true면 미리보기 이미지를 흐리게 표시 (숨김 처리 표시용) */
  blurred?: boolean;
}

export default function ImageUploader({ onUpload, currentImage, blurred = false }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 편집 항목 전환 등으로 currentImage가 바뀌면 미리보기도 동기화
  // (업로드 중에는 currentImage가 그대로라 effect가 끼어들지 않음)
  useEffect(() => {
    setPreview(currentImage || null);
  }, [currentImage]);

  const handleFile = useCallback(async (file: File) => {
    setError(null);

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'image/tif'];
    const tiff = isTiff(file);
    if (!allowedTypes.includes(file.type) && !tiff) {
      setError('PNG, JPG, WebP, TIFF 파일만 업로드 가능합니다');
      return;
    }

    if (file.size > 200 * 1024 * 1024) {
      setError('파일 크기는 200MB 이하여야 합니다');
      return;
    }

    // TIFF는 미리보기가 브라우저에서 안 되므로 dataURL 미리보기 생략
    if (!tiff) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }

    setUploading(true);
    setProgress(0);
    setStatusText(null);

    try {
      // Step 0: 큰 이미지/TIFF는 업로드 전에 자동 축소·WebP 압축 (Cloudinary 10MB 제한 대응)
      let uploadFile = file;
      if (tiff || file.size > Math.floor(9.5 * 1024 * 1024)) {
        setStatusText('이미지 최적화 중…');
        uploadFile = await compressImage(file);
        // TIFF 변환 실패 시(원본 그대로면) 업로드 불가 → 안내
        if (uploadFile === file && tiff) {
          throw new Error('TIFF 변환에 실패했습니다. 다른 형식으로 시도해주세요.');
        }
        if (uploadFile !== file) setPreview(URL.createObjectURL(uploadFile));
      }

      // Step 1: Get Cloudinary upload signature
      setStatusText('업로드 중…');
      setProgress(10);
      const sigResponse = await fetch(
        `/api/portfolio/upload?filename=${encodeURIComponent(uploadFile.name)}&contentType=${encodeURIComponent(uploadFile.type)}`
      );

      if (!sigResponse.ok) {
        const errorData = await sigResponse.json();
        throw new Error(errorData.error || '업로드 준비 실패');
      }

      const { signature, timestamp, publicId, folder, cloudName, apiKey } = await sigResponse.json();

      // Step 2: Upload directly to Cloudinary
      setProgress(20);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('folder', folder);
      formData.append('public_id', publicId);

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: formData }
      );

      if (!uploadResponse.ok) {
        throw new Error('이미지 업로드 실패');
      }

      const result = await uploadResponse.json();
      setProgress(90);

      const imageUrl = result.secure_url;
      // Generate thumbnail using Cloudinary transformation
      const thumbnailUrl = imageUrl.replace('/upload/', '/upload/c_fill,w_400,h_400/');

      setProgress(100);
      onUpload(imageUrl, thumbnailUrl, file.name);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : '업로드 실패');
      setPreview(currentImage || null);
    } finally {
      setUploading(false);
      setStatusText(null);
    }
  }, [currentImage, onUpload]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleClear = () => {
    setPreview(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    // 부모에도 삭제 반영 — 저장 시 이미지가 실제로 제거되도록
    onUpload('', '');
  };

  return (
    <div className="space-y-2">
      {preview ? (
        <div className="relative aspect-[4/3] bg-[var(--border)]">
          <Image
            src={preview}
            alt="Preview"
            fill
            className={`object-contain transition-all ${blurred ? 'blur-[3px] opacity-75' : ''}`}
          />
          {!uploading && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
              aria-label="이미지 삭제"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
              {statusText && (
                <p className="text-white text-xs">{statusText}</p>
              )}
              <div className="w-3/4 bg-white/20 rounded-full h-2">
                <div
                  className="bg-white h-2 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          className={`aspect-[4/3] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
            dragActive
              ? 'border-[var(--accent)] bg-[var(--accent)]/5'
              : 'border-[var(--border)] hover:border-[var(--text-secondary)]'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-[var(--text-secondary)] mb-3"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p className="text-[var(--text-secondary)] text-sm mb-1">
            이미지를 드래그하거나 클릭하여 업로드
          </p>
          <p className="text-[var(--text-secondary)] text-xs">
            PNG, JPG, WebP, TIFF (최대 200MB · 업로드 시 자동 최적화)
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/tiff,.jpg,.jpeg,.tif,.tiff"
        onChange={handleChange}
        className="hidden"
      />

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}
    </div>
  );
}
