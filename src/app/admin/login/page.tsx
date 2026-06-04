'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/common/Button';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  // 비밀번호 찾기(임시 비밀번호 이메일 전송)
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMsg(null);
    setResetLoading(true);
    try {
      const response = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await response.json();
      if (response.ok) {
        setResetMsg({ type: 'success', text: `${data.masked ?? '등록된 이메일'}(으)로 임시 비밀번호를 보냈습니다. 최대 1분 후 임시 비밀번호로 로그인하세요.` });
        setResetEmail('');
      } else {
        setResetMsg({ type: 'error', text: data.error || '전송에 실패했습니다.' });
      }
    } catch {
      setResetMsg({ type: 'error', text: '요청 중 오류가 발생했습니다.' });
    } finally {
      setResetLoading(false);
    }
  };

  useEffect(() => {
    // DB에서 힌트 조회, 없으면 환경변수 폴백
    const fetchHint = async () => {
      try {
        const response = await fetch('/api/admin-settings');
        if (response.ok) {
          const data = await response.json();
          setHint(data.password_hint || process.env.NEXT_PUBLIC_ADMIN_HINT || null);
        }
      } catch {
        setHint(process.env.NEXT_PUBLIC_ADMIN_HINT || null);
      }
    };
    fetchHint();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        router.push('/admin');
      } else {
        setError('비밀번호가 올바르지 않습니다');
      }
    } catch {
      setError('로그인 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-gray-100">
      <div className="w-full max-w-sm bg-white p-8 rounded-lg shadow-lg">
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl text-center mb-8 text-gray-900">
          Admin Access
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              className="w-full h-12 px-4 border border-gray-300 bg-white text-gray-900 placeholder-gray-400 rounded focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-400"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            loading={loading}
            disabled={!password}
          >
            로그인
          </Button>

          {hint && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                {showHint ? '힌트 숨기기' : '비밀번호 힌트'}
              </button>
              {showHint && (
                <p className="mt-2 text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded">
                  {hint}
                </p>
              )}
            </div>
          )}
        </form>

        {/* 비밀번호 찾기 — 등록된 작가 이메일로 임시 비밀번호 발송 */}
        <div className="mt-4 pt-4 border-t border-gray-200 text-center">
          <button
            type="button"
            onClick={() => { setShowReset(!showReset); setResetMsg(null); }}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            비밀번호를 잊으셨나요?
          </button>

          {showReset && (
            <form onSubmit={handleReset} className="mt-3 space-y-2 text-left">
              <p className="text-xs text-gray-500">
                등록된 작가 이메일을 입력하면 해당 메일로 임시 비밀번호를 보냅니다.
              </p>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="작가 이메일 주소"
                className="w-full h-11 px-4 border border-gray-300 bg-white text-gray-900 placeholder-gray-400 rounded focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-400"
              />
              <Button
                type="submit"
                className="w-full"
                variant="secondary"
                loading={resetLoading}
                disabled={!resetEmail}
              >
                임시 비밀번호 전송
              </Button>
              {resetMsg && (
                <p className={`text-sm px-3 py-2 rounded ${resetMsg.type === 'success' ? 'text-green-700 bg-green-50' : 'text-red-500 bg-red-50'}`}>
                  {resetMsg.text}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
