'use client';

import dynamic from 'next/dynamic';

// CKEditor는 브라우저 전용 → SSR 비활성 동적 로딩
const RichEditorClient = dynamic(() => import('./RichEditorClient'), {
  ssr: false,
  loading: () => <div className="border border-gray-300 rounded h-[240px] bg-gray-50 flex items-center justify-center text-sm text-gray-400">편집기 로딩 중…</div>,
});

export default function RichEditor(props: { value: string; onChange: (html: string) => void; textOnly?: boolean }) {
  return <RichEditorClient {...props} />;
}
