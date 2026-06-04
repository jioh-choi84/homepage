'use client';

import { useState, useEffect, useRef } from 'react';
import { Tag } from '@/types/artwork';

interface TagInputProps {
  artworkId?: string;
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
}

export default function TagInput({ artworkId, selectedTags, onTagsChange }: TagInputProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showNewTagModal, setShowNewTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [artworksForNewTag, setArtworksForNewTag] = useState<{ id: string; title: string; selected: boolean }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // 모든 태그 로드
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await fetch('/api/tags');
        if (res.ok) {
          const tags = await res.json();
          setAllTags(tags);
        }
      } catch (err) {
        console.error('Error fetching tags:', err);
      }
    };
    fetchTags();
  }, []);

  // 필터된 제안 목록
  const filteredTags = allTags.filter(
    tag => 
      tag.name.toLowerCase().includes(inputValue.toLowerCase()) &&
      !selectedTags.some(st => st.id === tag.id)
  );

  // 태그 선택
  const handleSelectTag = (tag: Tag) => {
    onTagsChange([...selectedTags, tag]);
    setInputValue('');
    setShowSuggestions(false);
  };

  // 태그 제거
  const handleRemoveTag = (tagId: string) => {
    onTagsChange(selectedTags.filter(t => t.id !== tagId));
  };

  // 새 태그 생성 시작
  const handleCreateNewTag = async () => {
    if (!inputValue.trim()) return;
    
    setNewTagName(inputValue.trim());
    setInputValue('');
    setShowSuggestions(false);
    
    // 기존 작품 목록 가져오기
    try {
      const res = await fetch('/api/portfolio');
      if (res.ok) {
        const artworks = await res.json();
        setArtworksForNewTag(
          artworks.map((a: { id: string; title: string }) => ({
            id: a.id,
            title: a.title,
            selected: false,
          }))
        );
      }
    } catch (err) {
      console.error('Error fetching artworks:', err);
    }
    
    setShowNewTagModal(true);
  };

  // 새 태그 저장
  const handleSaveNewTag = async () => {
    try {
      // 1. 태그 생성
      const createRes = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName }),
      });
      
      if (!createRes.ok) {
        const error = await createRes.json();
        alert(error.error || '태그 생성에 실패했습니다.');
        return;
      }
      
      const newTag = await createRes.json();
      
      // 2. 선택된 작품들에 태그 추가
      const selectedArtworks = artworksForNewTag.filter(a => a.selected);
      for (const artwork of selectedArtworks) {
        await fetch(`/api/portfolio/${artwork.id}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag_ids: [newTag.id] }),
        });
      }
      
      // 3. 현재 작품에도 태그 추가
      onTagsChange([...selectedTags, newTag]);
      
      // 4. 태그 목록 업데이트
      setAllTags([...allTags, newTag]);
      
      setShowNewTagModal(false);
      setNewTagName('');
      setArtworksForNewTag([]);
    } catch (err) {
      console.error('Error creating tag:', err);
      alert('태그 생성 중 오류가 발생했습니다.');
    }
  };

  // 작품 선택 토글
  const toggleArtworkSelection = (artworkId: string) => {
    setArtworksForNewTag(prev =>
      prev.map(a => a.id === artworkId ? { ...a, selected: !a.selected } : a)
    );
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        태그 (관리자만 볼 수 있음)
      </label>
      
      {/* 선택된 태그들 */}
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedTags.map(tag => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
          >
            {tag.name}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag.id)}
              className="hover:text-blue-600"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      
      {/* 입력 필드 */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder="태그 검색 또는 새로 만들기..."
          className="w-full h-10 px-3 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900"
        />
        
        {/* 제안 목록 */}
        {showSuggestions && inputValue && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-auto">
            {filteredTags.map(tag => (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleSelectTag(tag)}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 text-gray-900"
              >
                {tag.name}
              </button>
            ))}
            
            {/* 새 태그 만들기 옵션 */}
            {inputValue.trim() && !allTags.some(t => t.name.toLowerCase() === inputValue.toLowerCase()) && (
              <button
                type="button"
                onClick={handleCreateNewTag}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 text-blue-600 border-t"
              >
                + "{inputValue}" 새 태그 만들기
              </button>
            )}
            
            {filteredTags.length === 0 && !inputValue.trim() && (
              <div className="px-3 py-2 text-gray-500">검색 결과가 없습니다</div>
            )}
          </div>
        )}
      </div>
      
      {/* 새 태그 모달 */}
      {showNewTagModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-auto">
            <h3 className="text-lg font-medium mb-4 text-gray-900">
              새 태그: "{newTagName}"
            </h3>
            
            <p className="text-sm text-gray-600 mb-4">
              이 태그를 추가할 기존 작품을 선택하세요 (선택사항)
            </p>
            
            <div className="space-y-2 max-h-60 overflow-auto mb-4">
              {artworksForNewTag.map(artwork => (
                <label
                  key={artwork.id}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={artwork.selected}
                    onChange={() => toggleArtworkSelection(artwork.id)}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-900">{artwork.title}</span>
                </label>
              ))}
            </div>
            
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowNewTagModal(false);
                  setNewTagName('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveNewTag}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                태그 생성
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
