'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Artwork, ArtworkFormData, Category, CategoryFormData, AboutInfo, AboutFormData, CvInfo, CvFormData, Exhibition, ExhibitionFormData, Tag, StatsData } from '@/types/artwork';
import { NAV_COLORS, NEUTRAL_NAV_COLOR } from '@/lib/menu';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import ArtworkTable from '@/components/admin/ArtworkTable';
import ArtworkForm from '@/components/admin/ArtworkForm';
import ArtworkBatchUpload from '@/components/admin/ArtworkBatchUpload';
import WorkGroupManager from '@/components/admin/WorkGroupManager';
import ResourceManager from '@/components/admin/ResourceManager';
import CategoryTable from '@/components/admin/CategoryTable';
import CategoryForm from '@/components/admin/CategoryForm';
import AboutForm from '@/components/admin/AboutForm';
import CvForm from '@/components/admin/CvForm';
import SettingsForm from '@/components/admin/SettingsForm';
import ExhibitionTable from '@/components/admin/ExhibitionTable';
import ExhibitionForm from '@/components/admin/ExhibitionForm';
import PressManager from '@/components/admin/PressManager';
import StatsPanel from '@/components/admin/StatsPanel';
import NoticeManager from '@/components/admin/NoticeManager';

type Tab = 'cv' | 'artworks' | 'workgroups' | 'categories' | 'exhibitions' | 'press' | 'resources' | 'about' | 'notice' | 'stats' | 'settings';

// 관리자 탭 = 홈페이지 메뉴와 제목·순서·컬러 일치 (홈 순서 그대로 + 나머지 뒤).
// Home·Contact은 편집 콘텐츠가 없어 제외. series·About·setting은 홈에 없어 중립색.
const TABS: { key: Tab; label: string; color: string }[] = [
  { key: 'cv', label: 'CV', color: NAV_COLORS['/cv'] },
  { key: 'artworks', label: 'Works', color: NAV_COLORS['/works'] },
  { key: 'exhibitions', label: 'Exhibition', color: NAV_COLORS['/exhibition'] },
  { key: 'resources', label: 'Resources', color: NAV_COLORS['/resources'] },
  { key: 'press', label: 'Press', color: NAV_COLORS['/press'] },
  { key: 'workgroups', label: 'Series', color: NEUTRAL_NAV_COLOR },
  { key: 'about', label: 'About', color: NEUTRAL_NAV_COLOR },
  { key: 'notice', label: '공지', color: NEUTRAL_NAV_COLOR },
  { key: 'stats', label: '통계', color: NEUTRAL_NAV_COLOR },
  { key: 'settings', label: 'Setting', color: NEUTRAL_NAV_COLOR },
];

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('artworks');

  // Artworks state
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [artworksLoading, setArtworksLoading] = useState(true);
  const [isArtworkFormOpen, setIsArtworkFormOpen] = useState(false);
  const [isBatchUploadOpen, setIsBatchUploadOpen] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<Artwork | null>(null);
  const [deletingArtwork, setDeletingArtwork] = useState<Artwork | null>(null);

  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  // Exhibitions state
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [exhibitionsLoading, setExhibitionsLoading] = useState(true);
  const [editingExhibition, setEditingExhibition] = useState<Exhibition | null>(null);
  const [deletingExhibition, setDeletingExhibition] = useState<Exhibition | null>(null);

  // About state
  const [aboutInfo, setAboutInfo] = useState<AboutInfo | null>(null);
  const [aboutLoading, setAboutLoading] = useState(true);

  // CV state
  const [cvInfo, setCvInfo] = useState<CvInfo | null>(null);
  const [cvLoading, setCvLoading] = useState(true);

  // Stats state
  const [stats, setStats] = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Tags state
  const [allTags, setAllTags] = useState<Tag[]>([]);

  // Settings state
  const [currentHint, setCurrentHint] = useState<string>('');

  // Common state
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    fetchArtworks();
    fetchCategories();
    fetchExhibitions();
    fetchAbout();
    fetchCv();
    fetchSettings();
    fetchTags();
    fetchStats();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth');
      if (!response.ok) {
        router.push('/admin/login');
      }
    } catch {
      router.push('/admin/login');
    }
  };

  const fetchArtworks = async () => {
    try {
      const response = await fetch('/api/portfolio?fresh=1&t=' + Date.now(), { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setArtworks(data);
      }
    } catch {
      setError('작품 목록을 불러올 수 없습니다');
    } finally {
      setArtworksLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch {
      setError('카테고리 목록을 불러올 수 없습니다');
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchExhibitions = async () => {
    try {
      const response = await fetch('/api/exhibitions');
      if (response.ok) {
        const data = await response.json();
        setExhibitions(data);
      }
    } catch {
      setError('전시 목록을 불러올 수 없습니다');
    } finally {
      setExhibitionsLoading(false);
    }
  };

  const fetchAbout = async () => {
    try {
      const response = await fetch('/api/about');
      if (response.ok) {
        const data = await response.json();
        setAboutInfo(data);
      }
    } catch {
      setError('작가소개 정보를 불러올 수 없습니다');
    } finally {
      setAboutLoading(false);
    }
  };

  const fetchCv = async () => {
    try {
      const response = await fetch('/api/cv');
      if (response.ok) {
        const data = await response.json();
        setCvInfo(data);
      }
    } catch {
      setError('CV 정보를 불러올 수 없습니다');
    } finally {
      setCvLoading(false);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const response = await fetch('/api/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch {
      setError('통계를 불러올 수 없습니다');
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin-settings');
      if (response.ok) {
        const data = await response.json();
        setCurrentHint(data.password_hint || '');
      }
    } catch {
      // 설정 조회 실패는 무시
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags');
      if (response.ok) {
        const data = await response.json();
        setAllTags(data);
      }
    } catch {
      // 태그 조회 실패는 무시
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/admin/login');
  };

  // Artwork handlers
  const handleArtworkFormSubmit = async (
    data: ArtworkFormData & { image_url: string; thumbnail_url: string }
  ) => {
    const url = editingArtwork
      ? `/api/portfolio/${editingArtwork.id}`
      : '/api/portfolio';
    const method = editingArtwork ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      const saved = await response.json();
      const wasEdit = !!editingArtwork;
      setIsArtworkFormOpen(false);
      setEditingArtwork(null);
      // 낙관적 갱신: 응답으로 받은 작품을 로컬 목록에 즉시 반영 (Blob 전파 지연에도 바로 보임)
      setArtworks((prev) =>
        wasEdit ? prev.map((a) => (a.id === saved.id ? { ...a, ...saved } : a)) : [saved, ...prev],
      );
      setToast(wasEdit ? '수정되었습니다' : '저장되었습니다');
    } else {
      let errorMsg = '저장 실패';
      try {
        const body = await response.json();
        errorMsg = body.error || errorMsg;
      } catch { /* empty response */ }
      throw new Error(errorMsg);
    }
  };

  const handleArtworkDelete = async () => {
    if (!deletingArtwork) return;
    setDeleteLoading(true);

    try {
      const response = await fetch(`/api/portfolio/${deletingArtwork.id}`, {
        method: 'DELETE',
      });

      if (response.ok || response.status === 404) {
        // 낙관적 갱신: refetch 금지(Blob 쓰기 직후 전파 지연으로 삭제본이 되살아나 보임).
        // 로컬 목록에서 즉시 제거. 404(이미 삭제됨)도 성공으로 간주.
        const id = deletingArtwork.id;
        setArtworks((prev) => prev.filter((a) => a.id !== id));
        setDeletingArtwork(null);
        setToast('삭제되었습니다');
      } else {
        setDeletingArtwork(null);
        setToast('삭제 실패');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setToast('삭제 실패');
    } finally {
      setDeleteLoading(false);
    }
  };

  // 일괄 삭제 — 단 한 번의 요청으로(경합/유실 방지). 1건씩 연속 삭제 시 Blob 전파
  // 지연 때문에 삭제가 되살아나던 문제를 일괄 처리로 해결. 성공 시 로컬에서 즉시 제거.
  const handleArtworkBulkDelete = async (ids: string[]): Promise<boolean> => {
    if (!ids.length) return false;
    try {
      const res = await fetch('/api/portfolio/batch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) { setToast('일괄 삭제 실패'); return false; }
      const { removed } = await res.json().catch(() => ({ removed: ids.length }));
      const idSet = new Set(ids);
      setArtworks((prev) => prev.filter((a) => !idSet.has(a.id)));
      setToast(`${removed ?? ids.length}개 삭제되었습니다`);
      return true;
    } catch (err) {
      console.error('Bulk delete error:', err);
      setToast('일괄 삭제 실패');
      return false;
    }
  };

  // Category handlers
  const handleCategoryFormSubmit = async (data: CategoryFormData & { cover_image_url?: string }) => {
    const url = editingCategory
      ? `/api/categories/${editingCategory.id}`
      : '/api/categories';
    const method = editingCategory ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      setIsCategoryFormOpen(false);
      setEditingCategory(null);
      fetchCategories();
      setToast(editingCategory ? '수정되었습니다' : '저장되었습니다');
    } else {
      const { error } = await response.json();
      throw new Error(error || '저장 실패');
    }
  };

  const handleCategoryDelete = async () => {
    if (!deletingCategory) return;
    setDeleteLoading(true);

    try {
      const response = await fetch(`/api/categories/${deletingCategory.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDeletingCategory(null);
        fetchCategories();
        setToast('삭제되었습니다');
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Exhibition handlers
  const handleExhibitionFormSubmit = async (data: ExhibitionFormData) => {
    const url = editingExhibition
      ? `/api/exhibitions/${editingExhibition.id}`
      : '/api/exhibitions';
    const method = editingExhibition ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      // 낙관적 갱신: refetch 금지(Blob 읽기 지연으로 옛 값이 옴). 응답값으로 로컬 갱신.
      const saved: Exhibition = await response.json();
      setExhibitions((prev) =>
        editingExhibition
          ? prev.map((e) => (e.id === saved.id ? saved : e))
          : [...prev, saved]
      );
      setEditingExhibition(null);
      setToast(editingExhibition ? '수정되었습니다' : '저장되었습니다');
    } else {
      const { error } = await response.json();
      throw new Error(error || '저장 실패');
    }
  };

  const handleExhibitionDelete = async () => {
    if (!deletingExhibition) return;
    setDeleteLoading(true);

    try {
      const response = await fetch(`/api/exhibitions/${deletingExhibition.id}`, {
        method: 'DELETE',
      });

      if (response.ok || response.status === 404) {
        // 낙관적 갱신: refetch 금지(Blob 전파 지연). 로컬에서 즉시 제거.
        const id = deletingExhibition.id;
        setExhibitions((prev) => prev.filter((e) => e.id !== id));
        if (editingExhibition?.id === id) setEditingExhibition(null);
        setDeletingExhibition(null);
        setToast('삭제되었습니다');
      } else {
        setDeletingExhibition(null);
        setToast('삭제 실패');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setToast('삭제 실패');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAboutSubmit = async (data: AboutFormData) => {
    const response = await fetch('/api/about', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      fetchAbout();
      setToast('저장되었습니다');
    } else {
      const { error } = await response.json();
      throw new Error(error || '저장 실패');
    }
  };

  const handleCvSubmit = async (data: CvFormData) => {
    const response = await fetch('/api/cv', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      // 낙관적 갱신: refetch 금지(Blob 전파 지연으로 옛 값이 읽힘). PUT 응답(저장된 값)으로 즉시 반영.
      const saved = await response.json();
      setCvInfo(saved);
      setToast('저장되었습니다');
    } else {
      const { error } = await response.json();
      throw new Error(error || '저장 실패');
    }
  };

  const handleSettingsSubmit = async (data: {
    current_password: string;
    new_password?: string;
    password_hint?: string;
  }) => {
    const response = await fetch('/api/admin-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      fetchSettings();
      setToast('설정이 저장되었습니다');
    } else {
      const { error } = await response.json();
      throw new Error(error || '저장 실패');
    }
  };

  return (
    <>
      <main className="min-h-screen bg-gray-100">
        {/* 상단 고정 영역: 헤더 + 탭 (스크롤해도 계속 보임) */}
        <div className="sticky top-0 z-40">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/jioh-choi-logo.png"
                alt="Jioh Choi"
                width={3545}
                height={850}
                priority
                className="h-8 w-auto"
              />
              <span className="text-xl font-light tracking-wide text-gray-900">관리자</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-900 text-sm"
            >
              로그아웃
            </button>
          </div>
        </header>

        {/* Tabs — 홈페이지 메뉴와 제목·순서·컬러 일치 */}
        <div className="max-w-6xl mx-auto px-6 bg-white">
          <div className="flex flex-wrap border-b border-gray-200">
            {TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    color: tab.color,
                    borderBottomColor: active ? tab.color : 'transparent',
                    opacity: active ? 1 : 0.6,
                  }}
                  className="px-6 py-4 text-sm font-medium border-b-2 transition-opacity hover:opacity-100"
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-6 py-8">
          {activeTab === 'artworks' && (
            <>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">
                  작품 목록 <span className="text-gray-500 font-normal">({artworks.length}개)</span>
                </h2>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setIsBatchUploadOpen(true)}>
                    일괄 업로드
                  </Button>
                  <Button onClick={() => { setEditingArtwork(null); setIsArtworkFormOpen(true); }}>
                    + 새 작품
                  </Button>
                </div>
              </div>
              {artworksLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 animate-pulse rounded" />
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-4">{error}</p>
                  <Button onClick={fetchArtworks}>다시 시도</Button>
                </div>
              ) : (
                <ArtworkTable
                  artworks={artworks}
                  categories={categories}
                  allTags={allTags}
                  onEdit={(artwork) => { setEditingArtwork(artwork); setIsArtworkFormOpen(true); }}
                  onDelete={setDeletingArtwork}
                  onBulkDelete={handleArtworkBulkDelete}
                  onTagsChange={(id, tags) => {
                    // 새로고침 없이 로컬 상태만 갱신 (칩 즉시 반영 + 옛 Blob로 덮어쓰기 방지)
                    setArtworks((prev) => prev.map((a) => (a.id === id ? { ...a, tags } : a)));
                    // 새로 생긴 태그를 자동완성 목록(allTags)에도 병합
                    setAllTags((prev) => {
                      const map = new Map(prev.map((t) => [t.id, t]));
                      tags.forEach((t) => { if (!t.id.startsWith('tmp-')) map.set(t.id, t); });
                      return Array.from(map.values());
                    });
                  }}
                  onTagsRefresh={() => { fetchArtworks(); fetchTags(); setToast('저장됨'); }}
                  onFeaturedChange={(updates) => {
                    setArtworks((prev) => prev.map((a) => {
                      const u = updates.find((x) => x.id === a.id);
                      return u ? { ...a, is_featured: u.is_featured, order: u.order } : a;
                    }));
                    setToast('저장됨');
                  }}
                  onHiddenChange={(id, hidden) => {
                    setArtworks((prev) => prev.map((a) => (a.id === id ? { ...a, hidden } : a)));
                    setToast('저장됨');
                  }}
                />
              )}
            </>
          )}

          {activeTab === 'workgroups' && (
            <>
              <h2 className="text-lg font-medium text-gray-900 mb-6">작품 묶음 관리</h2>
              <WorkGroupManager existingArtworks={artworks} onToast={setToast} onArtworksChanged={setArtworks} />
            </>
          )}

          {activeTab === 'categories' && (
            <>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">카테고리 목록</h2>
                <Button onClick={() => { setEditingCategory(null); setIsCategoryFormOpen(true); }}>
                  + 새 카테고리
                </Button>
              </div>
              {categoriesLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 animate-pulse rounded" />
                  ))}
                </div>
              ) : (
                <CategoryTable
                  categories={categories}
                  onEdit={(category) => { setEditingCategory(category); setIsCategoryFormOpen(true); }}
                  onDelete={setDeletingCategory}
                />
              )}
            </>
          )}

          {activeTab === 'exhibitions' && (
            <>
              <h2 className="text-lg font-medium text-gray-900 mb-6">전시 관리</h2>
              {/* 인라인 편집기 (Resources와 동일한 방식) */}
              <div className="border border-gray-200 rounded p-4 bg-gray-50 mb-8">
                <h3 className="text-sm font-medium text-gray-800 mb-3">{editingExhibition ? '전시 수정' : '새 전시 추가'}</h3>
                <ExhibitionForm
                  key={editingExhibition?.id || 'new'}
                  exhibition={editingExhibition || undefined}
                  onSubmit={handleExhibitionFormSubmit}
                  onCancel={() => setEditingExhibition(null)}
                />
              </div>
              {exhibitionsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 animate-pulse rounded" />
                  ))}
                </div>
              ) : (
                <ExhibitionTable
                  exhibitions={exhibitions}
                  onEdit={(exhibition) => { setEditingExhibition(exhibition); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  onDelete={setDeletingExhibition}
                  onToggleHidden={(id, hidden) =>
                    setExhibitions((prev) => prev.map((e) => (e.id === id ? { ...e, hidden } : e)))
                  }
                />
              )}
            </>
          )}

          {activeTab === 'press' && (
            <>
              <h2 className="text-lg font-medium text-gray-900 mb-6">Press 관리</h2>
              <PressManager onToast={setToast} />
            </>
          )}

          {activeTab === 'resources' && (
            <>
              <h2 className="text-lg font-medium text-gray-900 mb-6">Resources 관리</h2>
              <ResourceManager onToast={setToast} />
            </>
          )}

          {activeTab === 'cv' && (
            <>
              <h2 className="text-lg font-medium mb-6 text-gray-900">CV 관리</h2>
              {cvLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 animate-pulse rounded" />
                  ))}
                </div>
              ) : (
                <CvForm
                  cvInfo={cvInfo || undefined}
                  onSubmit={handleCvSubmit}
                />
              )}
            </>
          )}

          {activeTab === 'about' && (
            <>
              <h2 className="text-lg font-medium mb-6 text-gray-900">작가소개 관리</h2>
              {aboutLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 animate-pulse rounded" />
                  ))}
                </div>
              ) : (
                <AboutForm
                  aboutInfo={aboutInfo || undefined}
                  onSubmit={handleAboutSubmit}
                />
              )}
            </>
          )}

          {activeTab === 'notice' && (
            <>
              <h2 className="text-lg font-medium mb-6 text-gray-900">팝업 공지</h2>
              <NoticeManager onToast={setToast} />
            </>
          )}

          {activeTab === 'stats' && (
            <>
              <h2 className="text-lg font-medium mb-6 text-gray-900">운영 통계</h2>
              <StatsPanel stats={stats} loading={statsLoading} onRefresh={fetchStats} artworks={artworks} exhibitions={exhibitions} />
            </>
          )}

          {activeTab === 'settings' && (
            <>
              <h2 className="text-lg font-medium mb-6 text-gray-900">관리자 설정</h2>
              <SettingsForm
                currentHint={currentHint}
                onSubmit={handleSettingsSubmit}
              />
            </>
          )}
        </div>
      </main>

      {/* Batch Upload Modal */}
      <Modal
        isOpen={isBatchUploadOpen}
        onClose={() => setIsBatchUploadOpen(false)}
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <h2 className="text-xl font-medium mb-4 text-gray-900">작품 일괄 업로드</h2>
          <ArtworkBatchUpload
            existingArtworks={artworks}
            onComplete={(created) => {
              if (created.length) setArtworks((prev) => [...created, ...prev]);
              setToast(`${created.length}개 등록되었습니다`);
            }}
            onClose={() => setIsBatchUploadOpen(false)}
          />
        </div>
      </Modal>

      {/* Artwork Form Modal */}
      <Modal
        isOpen={isArtworkFormOpen}
        onClose={() => { setIsArtworkFormOpen(false); setEditingArtwork(null); }}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <h2 className="text-xl font-medium mb-6 text-gray-900">
            {editingArtwork ? '작품 수정' : '새 작품 추가'}
          </h2>
          <ArtworkForm
            artwork={editingArtwork || undefined}
            categories={categories}
            existingArtworks={artworks}
            onSubmit={handleArtworkFormSubmit}
            onCancel={() => { setIsArtworkFormOpen(false); setEditingArtwork(null); }}
            onArtworksChanged={setArtworks}
            onToast={setToast}
          />
        </div>
      </Modal>

      {/* Category Form Modal */}
      <Modal
        isOpen={isCategoryFormOpen}
        onClose={() => { setIsCategoryFormOpen(false); setEditingCategory(null); }}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <h2 className="text-xl font-medium mb-6 text-gray-900">
            {editingCategory ? '카테고리 수정' : '새 카테고리 추가'}
          </h2>
          <CategoryForm
            category={editingCategory || undefined}
            onSubmit={handleCategoryFormSubmit}
            onCancel={() => { setIsCategoryFormOpen(false); setEditingCategory(null); }}
          />
        </div>
      </Modal>


      {/* Delete Artwork Confirm Modal */}
      <Modal
        isOpen={!!deletingArtwork}
        onClose={() => setDeletingArtwork(null)}
        className="w-full max-w-sm"
      >
        <div className="p-6 text-center">
          <h2 className="text-lg font-medium mb-2 text-gray-900">정말 삭제하시겠습니까?</h2>
          <p className="text-gray-600 mb-1">
            &quot;{deletingArtwork?.title}&quot;을(를) 삭제합니다.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            이 작업은 되돌릴 수 없습니다.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="secondary" onClick={() => setDeletingArtwork(null)}>
              취소
            </Button>
            <Button
              onClick={handleArtworkDelete}
              loading={deleteLoading}
              className="bg-red-500 hover:bg-red-600"
            >
              삭제
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Category Confirm Modal */}
      <Modal
        isOpen={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        className="w-full max-w-sm"
      >
        <div className="p-6 text-center">
          <h2 className="text-lg font-medium mb-2 text-gray-900">정말 삭제하시겠습니까?</h2>
          <p className="text-gray-600 mb-1">
            &quot;{deletingCategory?.name}&quot; 카테고리를 삭제합니다.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            이 카테고리에 속한 작품들은 카테고리 없음으로 변경됩니다.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="secondary" onClick={() => setDeletingCategory(null)}>
              취소
            </Button>
            <Button
              onClick={handleCategoryDelete}
              loading={deleteLoading}
              className="bg-red-500 hover:bg-red-600"
            >
              삭제
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Exhibition Confirm Modal */}
      <Modal
        isOpen={!!deletingExhibition}
        onClose={() => setDeletingExhibition(null)}
        className="w-full max-w-sm"
      >
        <div className="p-6 text-center">
          <h2 className="text-lg font-medium mb-2 text-gray-900">정말 삭제하시겠습니까?</h2>
          <p className="text-gray-600 mb-1">
            &quot;{deletingExhibition?.title}&quot; 전시를 삭제합니다.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            이 작업은 되돌릴 수 없습니다.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="secondary" onClick={() => setDeletingExhibition(null)}>
              취소
            </Button>
            <Button
              onClick={handleExhibitionDelete}
              loading={deleteLoading}
              className="bg-red-500 hover:bg-red-600"
            >
              삭제
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}
