'use client';

import { ReactNode } from 'react';

export interface SaveMsg {
  ok: boolean;
  text: string;
}

interface Props {
  /** 버튼 라벨 (기본 '저장') */
  saveLabel?: string;
  /** 'submit'이면 <form> 안에서 폼 제출, 'button'이면 onSave 호출 */
  type?: 'button' | 'submit';
  loading?: boolean;
  /** 저장 결과 메시지 — 성공(초록)/실패(빨강, 원인 로그) */
  message?: SaveMsg | null;
  /** type='button'일 때 클릭 핸들러 */
  onSave?: () => void;
  /** 취소(있으면 표시) */
  onCancel?: () => void;
  cancelLabel?: string;
  /** 저장 버튼 좌측 보조 영역(예: AI 일괄 채우기 버튼) */
  extra?: ReactNode;
}

/**
 * 관리자 폼 공통 저장 바. 화면 정중앙에 넓고 큰 '저장' 버튼을 두고,
 * 버튼 바로 아래에 성공/실패 메시지를 표시한다(실패 시 원인 로그를 빨간 글씨로).
 */
export default function SaveBar({
  saveLabel = '저장',
  type = 'button',
  loading = false,
  message = null,
  onSave,
  onCancel,
  cancelLabel = '취소',
  extra,
}: Props) {
  return (
    <div className="pt-5 mt-3 border-t border-gray-200">
      <div className="flex flex-col items-center gap-3">
        {extra && <div className="flex items-center justify-center gap-2 flex-wrap">{extra}</div>}
        <div className="flex items-center justify-center gap-3 w-full">
          <button
            type={type}
            onClick={type === 'button' ? onSave : undefined}
            disabled={loading}
            className="px-12 py-3 rounded-md bg-gray-900 text-white text-base font-semibold hover:bg-gray-800 disabled:opacity-50 min-w-[240px] max-w-md transition-colors"
          >
            {loading ? '저장 중…' : saveLabel}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm"
            >
              {cancelLabel}
            </button>
          )}
        </div>
        {message && (
          <p
            className={`text-sm text-center max-w-2xl ${
              message.ok ? 'text-green-600' : 'text-red-600 whitespace-pre-wrap break-words'
            }`}
          >
            {message.ok ? `✓ ${message.text}` : `⚠ ${message.text}`}
          </p>
        )}
      </div>
    </div>
  );
}
