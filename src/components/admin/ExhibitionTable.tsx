'use client';

import { useCallback } from 'react';
import { Exhibition, EXHIBITION_TYPE_OPTIONS } from '@/types/artwork';

interface ExhibitionTableProps {
  exhibitions: Exhibition[];
  onEdit: (exhibition: Exhibition) => void;
  onDelete: (exhibition: Exhibition) => void;
  // 낙관적 업데이트용: 숨김 토글 시 부모 로컬 상태만 갱신 (새로고침 X)
  onToggleHidden?: (id: string, hidden: boolean) => void;
}

export default function ExhibitionTable({
  exhibitions,
  onEdit,
  onDelete,
  onToggleHidden,
}: ExhibitionTableProps) {
  // 숨기기 토글 — UI 낙관적 반영 + 백그라운드 저장
  const handleToggleHidden = useCallback(
    async (id: string, hidden: boolean) => {
      onToggleHidden?.(id, hidden); // UI 먼저 반영
      try {
        await fetch(`/api/exhibitions/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hidden }),
        });
      } catch (error) {
        console.error('Error updating hidden:', error);
      }
    },
    [onToggleHidden]
  );

  if (exhibitions.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <p className="text-gray-600">등록된 전시가 없습니다</p>
      </div>
    );
  }

  const renderTable = (items: Exhibition[], title: string) => (
    <div className="mb-8">
      <h3 className="text-sm font-medium text-gray-600 mb-3">{title}</h3>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-600 uppercase w-12" title="공개 사이트에서 숨김">
                감추기
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                연도
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                전시명
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                갤러리
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                지역
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                관리
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((exhibition) => (
              <tr
                key={exhibition.id}
                className={`hover:bg-gray-50 ${exhibition.hidden ? 'opacity-50' : ''}`}
              >
                <td className="px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={!!exhibition.hidden}
                    onChange={(e) => handleToggleHidden(exhibition.id, e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                    title="공개 사이트에서 숨기기"
                  />
                </td>
                <td className="px-4 py-3 text-sm text-gray-400">{exhibition.year}</td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {exhibition.external_url ? (
                    <a
                      href={exhibition.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      {exhibition.title}
                    </a>
                  ) : (
                    exhibition.title
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{exhibition.venue || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{exhibition.location || '-'}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onEdit(exhibition)}
                    className="text-gray-600 hover:text-gray-900 text-sm mr-3"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => onDelete(exhibition)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div>
      {EXHIBITION_TYPE_OPTIONS.map((t) => {
        const items = exhibitions.filter((e) => e.type === t.value);
        return items.length > 0 ? <div key={t.value}>{renderTable(items, t.ko)}</div> : null;
      })}
    </div>
  );
}
