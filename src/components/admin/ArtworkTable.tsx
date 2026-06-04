'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Artwork, Category, Tag, genreLabel } from '@/types/artwork';
import Button from '@/components/common/Button';

type SortField = 'created' | 'title' | 'year' | 'collection' | 'series' | 'theme' | 'region' | 'genre' | 'medium';
type SortOrder = 'asc' | 'desc';

// 정렬 드롭다운 옵션 — 목록에 보이는 컬럼 + '등록순'(업로드된 순서)
const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'created', label: '등록순(최근)' },
  { value: 'year', label: '연도' },
  { value: 'title', label: '제목' },
  { value: 'collection', label: '소장처' },
  { value: 'series', label: '시리즈' },
  { value: 'theme', label: '주제' },
  { value: 'region', label: '지역' },
  { value: 'genre', label: '장르' },
];

const MAX_FEATURED = 20;

interface ArtworkTableProps {
  artworks: Artwork[];
  categories: Category[];
  allTags: Tag[];
  onEdit: (artwork: Artwork) => void;
  onDelete: (artwork: Artwork) => void;
  // 선택한 여러 작품을 한 번의 요청으로 삭제(경합/유실 방지). 성공 시 true 반환.
  onBulkDelete?: (ids: string[]) => Promise<boolean> | void;
  onTagsChange: (artworkId: string, tags: Tag[]) => void;
  // 전역 태그 삭제/수정 등 여러 작품에 영향 → 전체 새로고침
  onTagsRefresh?: () => void;
  // 낙관적 업데이트용: 변경된 작품 정보를 전달 (부모가 새로고침 없이 로컬 상태만 갱신 → 랙 제거)
  onFeaturedChange?: (updates: Array<{ id: string; is_featured: boolean; order: number }>) => void;
  onHiddenChange?: (id: string, hidden: boolean) => void;
}

// 태그 입력 컴포넌트
function TagInput({ 
  artwork, 
  allTags,
  usedTagIds,
  onTagsChange,
  onDeleteTag,
  onEditTag,
}: { 
  artwork: Artwork;
  allTags: Tag[];
  usedTagIds: Set<string>;
  onTagsChange: (artworkId: string, tags: Tag[]) => void;
  onDeleteTag: (tagId: string, tagName: string) => void;
  onEditTag: (tagId: string, tagName: string) => void;
}) {
  const [inputValue, setInputValue] = useState('');
  const [localTags, setLocalTags] = useState<Tag[]>(artwork.tags || []);
  const inputRef = useRef<HTMLInputElement>(null);
  // 태그 저장 요청 직렬화 (연속 추가/삭제 경쟁 방지)
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());

  // 작품이 바뀌면 로컬 태그 동기화 (이름 기준 중복 제거 — 기존에 쌓인 중복 정리)
  useEffect(() => {
    const seen = new Set<string>();
    const out: Tag[] = [];
    for (const t of artwork.tags || []) {
      const k = t.name.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(t);
    }
    setLocalTags(out);
    // 작품을 전환할 때만 동기화 (저장 응답은 persist에서 직접 반영 → 재동기화 충돌 방지)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artwork.id]);

  // 현재 작품의 태그들 (로컬 상태가 표시 소스 — 즉시 반영)
  const currentTags = localTags;
  const currentTagNames = currentTags.map(t => t.name);

  // 작품 태그 '전체 집합'을 서버에 저장(replace). 로컬을 단일 소스로 → 누적/중복/조각 차단.
  const persistTags = (names: string[]) => {
    const clean: string[] = [];
    const seen = new Set<string>();
    for (const raw of names) {
      const n = raw.trim();
      if (!n || n.includes('#')) continue;
      const k = n.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      clean.push(n);
    }
    queueRef.current = queueRef.current.then(async () => {
      try {
        const res = await fetch(`/api/portfolio/${artwork.id}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag_names: clean, replace: true }),
        });
        if (res.ok) {
          const newTags: Tag[] = await res.json();
          setLocalTags(newTags);
          onTagsChange(artwork.id, newTags);
        }
      } catch (error) {
        console.error('Error saving tags:', error);
      }
    });
  };

  // 태그 추가 — 칩 즉시 표시(낙관적) + 전체 집합 저장
  const addTags = (tagNames: string[]) => {
    const valid = tagNames
      .map(n => n.trim())
      .filter(n => n.length > 0 && !n.includes('#'));
    const existingLower = new Set(currentTagNames.map(n => n.toLowerCase()));
    const fresh = valid.filter(n => !existingLower.has(n.toLowerCase()));
    setInputValue('');
    if (fresh.length === 0) return;

    setLocalTags(prev => [
      ...prev,
      ...fresh.map(n => ({ id: `tmp-${n}-${Math.random()}`, name: n, created_at: '' })),
    ]);
    persistTags([...currentTagNames, ...fresh]);
  };

  // 작품에서 태그 제거 — 즉시 사라짐(낙관적) + 전체 집합 저장
  const removeTagFromArtwork = (tagId: string) => {
    const remaining = currentTags.filter(t => t.id !== tagId);
    setLocalTags(remaining);
    persistTags(remaining.map(t => t.name));
  };

  // 태그에 '#'은 허용하지 않음 (오류 표시)
  const hasHash = inputValue.includes('#');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 한글 IME 조합 중 Enter는 무시 — 조합 확정 Enter가 태그 추가까지 발동해
    // 마지막 음절이 중복 입력되던 버그 방지
    if ((e.nativeEvent as { isComposing?: boolean }).isComposing) return;
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (hasHash) return; // # 포함 시 추가 막고 오류 표시 유지
      if (inputValue.trim()) {
        const names = inputValue.split(',').map(n => n.trim()).filter(n => n);
        addTags(names);
      }
    }
  };

  return (
    <div className="relative">
      <div className={`flex flex-wrap gap-1 min-h-[32px] p-1 border rounded bg-white ${hasHash ? 'border-red-400 focus-within:border-red-500' : 'border-gray-200 focus-within:border-gray-400'}`}>
        {currentTags.map(tag => (
          <span 
            key={tag.id} 
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
          >
            {tag.name}
            <button
              type="button"
              onClick={() => removeTagFromArtwork(tag.id)}
              className="text-gray-400 hover:text-red-500"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={currentTags.length === 0 ? "태그 입력 후 Enter" : "추가…"}
          className="flex-1 min-w-[84px] px-1 py-0.5 text-xs outline-none bg-transparent placeholder-gray-400"
        />
      </div>
      {hasHash && (
        <p className="mt-1 text-xs text-red-500">‘#’ 없이 단어만 입력하세요.</p>
      )}
    </div>
  );
}

// 대표작 순서 드롭다운
function FeaturedDropdown({
  artwork,
  featuredArtworks,
  onFeaturedChange,
}: {
  artwork: Artwork;
  featuredArtworks: Artwork[];
  onFeaturedChange: (artworkId: string, order: number | null) => void;
}) {
  // order는 0-based로 저장, UI는 1-based로 표시
  const currentOrder = artwork.is_featured ? (artwork.order ?? 0) + 1 : null;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    
    if (value === '') {
      onFeaturedChange(artwork.id, null);
    } else {
      const newOrder = parseInt(value);
      
      // 최대 개수 체크
      if (featuredArtworks.length >= MAX_FEATURED && !artwork.is_featured) {
        alert(`대표작은 최대 ${MAX_FEATURED}개까지 선택할 수 있습니다.`);
        return;
      }
      
      onFeaturedChange(artwork.id, newOrder);
    }
  };

  return (
    <select
      value={currentOrder ?? ''}
      onChange={handleChange}
      className="w-14 h-8 px-1 text-sm border border-gray-200 rounded bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400"
    >
      <option value="">-</option>
      {Array.from({ length: MAX_FEATURED }, (_, i) => i + 1).map(n => (
        <option key={n} value={n}>{n}</option>
      ))}
    </select>
  );
}

export default function ArtworkTable({ 
  artworks, 
  categories, 
  allTags, 
  onEdit,
  onDelete,
  onBulkDelete,
  onTagsChange,
  onTagsRefresh,
  onFeaturedChange,
  onHiddenChange,
}: ArtworkTableProps) {
  const [sortField, setSortField] = useState<SortField>('year');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  // 다중 선택(일괄 삭제용)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  // 썸네일 마우스오버 미리보기 (fixed 위치라 표/overflow에 안 잘림)
  const [hoverPreview, setHoverPreview] = useState<{ url: string; x: number; y: number } | null>(null);
  const [deletingTag, setDeletingTag] = useState<{ id: string; name: string } | null>(null);
  const [editingTag, setEditingTag] = useState<{ id: string; name: string } | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // 스크롤 위치 감지
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 사용 중인 태그 ID 집합 (최소 1개 작품에 연결된 태그)
  const usedTagIds = useMemo(() => {
    const ids = new Set<string>();
    artworks.forEach(a => {
      a.tags?.forEach(t => ids.add(t.id));
    });
    return ids;
  }, [artworks]);

  // 대표작 목록
  const featuredArtworks = useMemo(() => {
    return artworks.filter(a => a.is_featured);
  }, [artworks]);

  // 작품 목록이 바뀌면(삭제 반영 등) 더 이상 없는 id는 선택에서 제거
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const exists = new Set(artworks.map((a) => a.id));
      const next = new Set<string>();
      prev.forEach((id) => { if (exists.has(id)) next.add(id); });
      return next.size === prev.size ? prev : next;
    });
  }, [artworks]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const allSelected = artworks.length > 0 && selectedIds.size === artworks.length;
  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => (prev.size === artworks.length ? new Set() : new Set(artworks.map((a) => a.id))));
  }, [artworks]);

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0 || !onBulkDelete) return;
    setBulkDeleting(true);
    try {
      await onBulkDelete(Array.from(selectedIds));
      // 성공/실패와 무관하게 모달은 닫는다(성공 시 목록 변경으로 선택이 정리됨).
    } finally {
      setBulkDeleting(false);
      setShowBulkDeleteConfirm(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      // 연도·등록순은 최신(내림차순)이 기본, 나머지 텍스트는 가나다순(오름차순)
      setSortOrder(field === 'year' || field === 'created' ? 'desc' : 'asc');
    }
  };

  // 정렬 (제목은 항상 오름차순 보조 정렬)
  const sortedArtworks = useMemo(() => {
    // 텍스트 컬럼 비교: 빈 값은 정렬 방향과 무관하게 항상 뒤로 보낸다.
    const cmpText = (x: string | null | undefined, y: string | null | undefined) => {
      const xv = (x || '').trim();
      const yv = (y || '').trim();
      if (!xv && !yv) return 0;
      if (!xv) return sortOrder === 'asc' ? 1 : -1; // 역정렬 후에도 뒤로 가도록 부호 보정
      if (!yv) return sortOrder === 'asc' ? -1 : 1;
      return xv.localeCompare(yv, 'ko');
    };
    return [...artworks].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'created':
          // created_at(업로드 시각) 내림차순이 '최근 등록순'. ISO 문자열은 사전식=시간순.
          comparison = (a.created_at || '').localeCompare(b.created_at || '');
          // 같은 배치(동일 timestamp)는 order(삽입 순서)로 보조 정렬
          if (comparison === 0) comparison = (a.order ?? 0) - (b.order ?? 0);
          break;
        case 'title':
          comparison = (a.title || '').localeCompare(b.title || '', 'ko');
          break;
        case 'year':
          comparison = (a.year || 0) - (b.year || 0);
          break;
        case 'collection':
          comparison = cmpText(a.collection, b.collection);
          break;
        case 'series':
          comparison = cmpText(a.series, b.series);
          break;
        case 'theme':
          comparison = cmpText(a.theme, b.theme);
          break;
        case 'region':
          comparison = cmpText(a.region, b.region);
          break;
        case 'genre':
          comparison = genreLabel(a.genre, 'ko').localeCompare(genreLabel(b.genre, 'ko'), 'ko');
          break;
        case 'medium':
          comparison = (a.medium || '').localeCompare(b.medium || '', 'ko');
          break;
      }

      const primaryResult = sortOrder === 'asc' ? comparison : -comparison;

      // 동일한 경우 제목으로 오름차순 보조 정렬
      if (primaryResult === 0 && sortField !== 'title') {
        return (a.title || '').localeCompare(b.title || '', 'ko');
      }

      return primaryResult;
    });
  }, [artworks, sortField, sortOrder]);

  // 대표작 순서 변경 — UI는 낙관적 즉시 반영, 저장은 백그라운드 (새로고침 X → 랙 제거)
  const handleFeaturedChange = useCallback(async (artworkId: string, order: number | null) => {
    const updates: Array<{ id: string; is_featured: boolean; order: number }> = [];
    if (order === null) {
      updates.push({ id: artworkId, is_featured: false, order: 0 });
    } else {
      const conflicting = featuredArtworks.find(a => a.id !== artworkId && a.order === order - 1);
      if (conflicting) updates.push({ id: conflicting.id, is_featured: false, order: 0 });
      updates.push({ id: artworkId, is_featured: true, order: order - 1 });
    }
    onFeaturedChange?.(updates); // UI 먼저 반영
    try {
      for (const u of updates) {
        await fetch(`/api/portfolio/${u.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_featured: u.is_featured, order: u.order }),
        });
      }
    } catch (error) {
      console.error('Error updating featured:', error);
    }
  }, [onFeaturedChange, featuredArtworks]);

  // 숨기기 토글 — UI 낙관적 반영 + 백그라운드 저장
  const handleToggleHidden = useCallback(async (artworkId: string, hidden: boolean) => {
    onHiddenChange?.(artworkId, hidden); // UI 먼저 반영
    try {
      await fetch(`/api/portfolio/${artworkId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden }),
      });
    } catch (error) {
      console.error('Error updating hidden:', error);
    }
  }, [onHiddenChange]);

  // 대표작 전체 리셋
  const handleResetFeatured = async () => {
    const updates = featuredArtworks.map(a => ({ id: a.id, is_featured: false, order: 0 }));
    onFeaturedChange?.(updates);
    setShowResetConfirm(false);
    try {
      for (const u of updates) {
        await fetch(`/api/portfolio/${u.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_featured: false, order: 0 }),
        });
      }
    } catch (error) {
      console.error('Error resetting featured:', error);
    }
  };

  // 태그 완전 삭제
  const handleDeleteTag = async () => {
    if (!deletingTag) return;
    
    try {
      const response = await fetch(`/api/tags/${deletingTag.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onTagsRefresh?.();
        setDeletingTag(null);
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
    }
  };

  // 태그 수정 시작
  const handleStartEditTag = (tagId: string, tagName: string) => {
    setEditingTag({ id: tagId, name: tagName });
    setEditTagName(tagName);
  };

  // 태그 수정 저장
  const handleSaveEditTag = async () => {
    if (!editingTag || !editTagName.trim()) return;
    
    try {
      const response = await fetch(`/api/tags/${editingTag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editTagName.trim() }),
      });

      if (response.ok) {
        onTagsRefresh?.();
        setEditingTag(null);
        setEditTagName('');
      } else {
        const data = await response.json();
        alert(data.error || '태그 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error updating tag:', error);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="ml-1 text-gray-400">↕</span>;
    }
    return <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  const SortableHeader = ({ field, children, className = '' }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <th
      className={`text-center py-1.5 px-1 font-medium text-xs text-gray-600 cursor-pointer hover:text-gray-900 select-none ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center justify-center">
        {children}
        <SortIcon field={field} />
      </div>
    </th>
  );

  if (artworks.length === 0) {
    return (
      <div className="text-center py-12 bg-white border border-gray-200 rounded-lg shadow-sm">
        <p className="text-gray-500">
          등록된 작품이 없습니다. 첫 작품을 추가해보세요.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        {/* Sort Controls — 스크롤 시 상단 고정 (관리자 헤더+탭 아래) */}
        <div className="sticky top-[116px] z-20 p-3 border-b border-gray-200 flex items-center justify-between text-sm bg-gray-50">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">정렬:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="bg-white border border-gray-300 rounded px-2 py-1 text-gray-700 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="bg-white border border-gray-300 rounded px-2 py-1 text-gray-700 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
            >
              <option value="desc">내림차순</option>
              <option value="asc">오름차순</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            {selectedIds.size > 0 && onBulkDelete && (
              <>
                <span className="text-gray-600">{selectedIds.size}개 선택됨</span>
                <button
                  type="button"
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  className="px-2.5 py-1 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded"
                >
                  선택 삭제 ({selectedIds.size})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  선택 해제
                </button>
              </>
            )}
            <span className="text-gray-500">대표작: {featuredArtworks.length}/{MAX_FEATURED}</span>
          </div>
        </div>

        <div>
          <table className="w-full">
            <thead className="sticky top-[163px] z-10 bg-gray-50 border-b border-gray-200">
              <tr>
                {onBulkDelete && (
                  <th className="text-center py-1.5 px-0.5 font-medium text-xs text-gray-600 w-8" title="전체 선택">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = selectedIds.size > 0 && !allSelected; }}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </th>
                )}
                <th className="text-center py-1.5 px-0.5 font-medium text-xs text-gray-600 w-12">
                  <div className="flex items-center justify-center gap-1">
                    <span>대표</span>
                    {featuredArtworks.length > 0 && (
                      <button
                        onClick={() => setShowResetConfirm(true)}
                        className="px-1 py-0.5 text-[10px] bg-gray-200 hover:bg-gray-300 text-gray-600 rounded"
                        title="대표작 전체 리셋"
                      >
                        리셋
                      </button>
                    )}
                  </div>
                </th>
                <th className="text-center py-1.5 px-0.5 font-medium text-xs text-gray-600 w-8" title="공개 사이트에서 숨김">숨김</th>
                <th className="text-center py-1.5 px-0.5 font-medium text-xs text-gray-600 w-12">썸네일</th>
                <SortableHeader field="title" className="w-28">제목</SortableHeader>
                <SortableHeader field="year" className="w-12">연도</SortableHeader>
                <SortableHeader field="collection" className="w-20">소장처</SortableHeader>
                <SortableHeader field="series" className="w-20">시리즈</SortableHeader>
                <SortableHeader field="theme" className="w-16">주제</SortableHeader>
                <SortableHeader field="region" className="w-14">지역</SortableHeader>
                <SortableHeader field="genre" className="w-12">장르</SortableHeader>
                <th className="text-center py-1.5 px-1 font-medium text-xs text-gray-600 w-28">태그</th>
                <th className="text-center py-1.5 px-0.5 font-medium text-xs text-gray-600 w-14">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedArtworks.map((artwork) => (
                <tr
                  key={artwork.id}
                  className={`hover:bg-gray-50 align-top ${selectedIds.has(artwork.id) ? 'bg-red-50' : ''}`}
                >
                  {onBulkDelete && (
                    <td className="py-1.5 px-0.5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(artwork.id)}
                        onChange={() => toggleSelect(artwork.id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="py-1.5 px-0.5">
                    <FeaturedDropdown
                      artwork={artwork}
                      featuredArtworks={featuredArtworks}
                      onFeaturedChange={handleFeaturedChange}
                    />
                  </td>
                  <td className="py-1.5 px-0.5 text-center">
                    <input
                      type="checkbox"
                      checked={!!artwork.hidden}
                      onChange={(e) => handleToggleHidden(artwork.id, e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                      title="공개 사이트에서 숨기기"
                    />
                  </td>
                  <td className="py-1.5 px-0.5">
                    <div
                      className="relative w-12 h-12 bg-gray-100 rounded overflow-hidden cursor-zoom-in"
                      onMouseEnter={(e) => {
                        const r = e.currentTarget.getBoundingClientRect();
                        setHoverPreview({ url: artwork.image_url, x: r.right, y: r.top });
                      }}
                      onMouseLeave={() => setHoverPreview(null)}
                    >
                      <Image
                        src={artwork.thumbnail_url}
                        alt={artwork.title}
                        fill
                        className={`object-cover transition-all ${artwork.hidden ? 'blur-[3px] opacity-75' : ''}`}
                        sizes="48px"
                      />
                    </div>
                  </td>
                  <td className="py-1.5 px-1">
                    <span className="block font-medium text-gray-900 text-xs break-words whitespace-normal leading-tight">{artwork.title || artwork.title_en}</span>
                  </td>
                  <td className="py-1.5 px-1 text-gray-600 text-xs text-center">
                    {artwork.year}
                  </td>
                  <td className="py-1.5 px-1">
                    <span className="block text-gray-600 text-xs break-words whitespace-normal leading-tight">{artwork.collection || '-'}</span>
                  </td>
                  <td className="py-1.5 px-1">
                    <span className="block text-gray-600 text-xs break-words whitespace-normal leading-tight">{artwork.series || '-'}</span>
                  </td>
                  <td className="py-1.5 px-1">
                    <span className="block text-gray-600 text-xs break-words whitespace-normal leading-tight">{artwork.theme || '-'}</span>
                  </td>
                  <td className="py-1.5 px-1">
                    <span className="block text-gray-600 text-xs break-words whitespace-normal leading-tight">{artwork.region || '-'}</span>
                  </td>
                  <td className="py-1.5 px-1">
                    <span className="block text-gray-600 text-xs leading-tight">{genreLabel(artwork.genre, 'ko')}</span>
                  </td>
                  <td className="py-1.5 px-1">
                    <TagInput
                      artwork={artwork}
                      allTags={allTags}
                      usedTagIds={usedTagIds}
                      onTagsChange={onTagsChange}
                      onDeleteTag={(id, name) => setDeletingTag({ id, name })}
                      onEditTag={handleStartEditTag}
                    />
                  </td>
                  <td className="py-1.5 px-0.5">
                    <div className="flex flex-col items-stretch gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onEdit(artwork)}
                        className="h-auto py-0.5 px-1.5 leading-tight text-xs whitespace-nowrap border-gray-300 text-gray-700 hover:bg-gray-100"
                      >
                        수정
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onDelete(artwork)}
                        className="h-auto py-0.5 px-1.5 leading-tight text-xs text-red-600 border-red-300 hover:bg-red-50 whitespace-nowrap"
                      >
                        삭제
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 썸네일 마우스오버 큰 그림 미리보기 (fixed) */}
      {hoverPreview && (
        <div
          className="hidden md:block fixed z-[60] pointer-events-none"
          style={{
            left: Math.min(hoverPreview.x + 12, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 340),
            top: Math.max(8, Math.min(hoverPreview.y - 40, (typeof window !== 'undefined' ? window.innerHeight : 800) - 340)),
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hoverPreview.url}
            alt=""
            className="max-w-[320px] max-h-[320px] rounded-lg shadow-2xl border border-gray-200 bg-white object-contain"
          />
        </div>
      )}

      {/* 맨위로 버튼 */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 w-12 h-12 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 transition-colors flex items-center justify-center z-50"
          title="맨 위로"
        >
          ↑
        </button>
      )}

      {/* 태그 삭제 확인 모달 */}
      {deletingTag && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium mb-2">태그 삭제</h3>
            <p className="text-gray-600 mb-4">
              &quot;{deletingTag.name}&quot; 태그를 삭제하시겠습니까?<br/>
              <span className="text-sm text-red-500">모든 작품에서 이 태그가 제거됩니다.</span>
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeletingTag(null)}>
                취소
              </Button>
              <Button onClick={handleDeleteTag} className="bg-red-500 hover:bg-red-600">
                삭제
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 일괄 삭제 확인 모달 */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium mb-2">선택 작품 삭제</h3>
            <p className="text-gray-600 mb-4">
              선택한 <b>{selectedIds.size}개</b> 작품을 삭제하시겠습니까?<br/>
              <span className="text-sm text-red-500">되돌릴 수 없습니다.</span>
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowBulkDeleteConfirm(false)} disabled={bulkDeleting}>
                취소
              </Button>
              <Button onClick={handleBulkDelete} loading={bulkDeleting} className="bg-red-500 hover:bg-red-600">
                {selectedIds.size}개 삭제
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 대표작 리셋 확인 모달 */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium mb-2">대표작 리셋</h3>
            <p className="text-gray-600 mb-4">
              현재 선정된 대표작 {featuredArtworks.length}개를 모두 해제하시겠습니까?<br/>
              <span className="text-sm text-gray-500">해제 후 새로 선정할 수 있습니다.</span>
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowResetConfirm(false)}>
                취소
              </Button>
              <Button onClick={handleResetFeatured} className="bg-red-500 hover:bg-red-600">
                리셋
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 태그 수정 모달 */}
      {editingTag && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium mb-2">태그 수정</h3>
            <p className="text-gray-500 text-sm mb-3">
              &quot;{editingTag.name}&quot; 태그를 수정합니다.<br/>
              이 태그가 적용된 모든 작품에 반영됩니다.
            </p>
            <input
              type="text"
              value={editTagName}
              onChange={(e) => setEditTagName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 mb-4"
              placeholder="새 태그 이름"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEditTag();
                if (e.key === 'Escape') setEditingTag(null);
              }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditingTag(null)}>
                취소
              </Button>
              <Button onClick={handleSaveEditTag}>
                저장
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
