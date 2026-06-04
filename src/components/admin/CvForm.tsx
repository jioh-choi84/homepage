'use client';

import { useState, useEffect } from 'react';
import {
  CvInfo,
  CvFormData,
  EducationItem,
  ResidencyItem,
  CollectionItem,
  FellowshipItem,
  AwardItem,
  PublicationItem,
} from '@/types/artwork';
import { TranslateAllButton, type TranslatePair } from './TranslateButton';
import SaveBar, { type SaveMsg } from './SaveBar';

interface CvFormProps {
  cvInfo?: CvInfo;
  onSubmit: (data: CvFormData) => Promise<void>;
}

export default function CvForm({ cvInfo, onSubmit }: CvFormProps) {
  const [education, setEducation] = useState<EducationItem[]>([]);
  // 출생지/거주지
  const [birthCity, setBirthCity] = useState('');
  const [birthCityEn, setBirthCityEn] = useState('');
  const [birthCountry, setBirthCountry] = useState('');
  const [birthCountryEn, setBirthCountryEn] = useState('');
  const [liveCity, setLiveCity] = useState('');
  const [liveCityEn, setLiveCityEn] = useState('');
  const [liveCountry, setLiveCountry] = useState('');
  const [liveCountryEn, setLiveCountryEn] = useState('');
  // 경력 섹션
  const [residencies, setResidencies] = useState<ResidencyItem[]>([]);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [fellowships, setFellowships] = useState<FellowshipItem[]>([]);
  const [awards, setAwards] = useState<AwardItem[]>([]);
  const [publications, setPublications] = useState<PublicationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState<SaveMsg | null>(null);

  useEffect(() => {
    if (cvInfo) {
      setEducation(cvInfo.education || []);
      setBirthCity(cvInfo.birth_city || '');
      setBirthCityEn(cvInfo.birth_city_en || '');
      setBirthCountry(cvInfo.birth_country || '');
      setBirthCountryEn(cvInfo.birth_country_en || '');
      setLiveCity(cvInfo.live_city || '');
      setLiveCityEn(cvInfo.live_city_en || '');
      setLiveCountry(cvInfo.live_country || '');
      setLiveCountryEn(cvInfo.live_country_en || '');
      setResidencies(cvInfo.residencies || []);
      setCollections(cvInfo.collections || []);
      setFellowships(cvInfo.fellowships || []);
      setAwards(cvInfo.awards || []);
      setPublications(cvInfo.publications || []);
    }
  }, [cvInfo]);

  const addEducation = () => setEducation([...education, { year: '', description: '' }]);
  const removeEducation = (index: number) => setEducation(education.filter((_, i) => i !== index));
  const updateEducation = (index: number, field: keyof EducationItem, value: string) => {
    const updated = [...education];
    updated[index] = { ...updated[index], [field]: value };
    setEducation(updated);
  };

  // Residencies CRUD
  const addResidency = () => setResidencies([...residencies, { year: '', program: '', location: '' }]);
  const removeResidency = (index: number) => setResidencies(residencies.filter((_, i) => i !== index));
  const updateResidency = (index: number, field: keyof ResidencyItem, value: string) => {
    const updated = [...residencies];
    updated[index] = { ...updated[index], [field]: value };
    setResidencies(updated);
  };

  // Collections CRUD
  const addCollection = () => setCollections([...collections, { year: '', name: '', location: '' }]);
  const removeCollection = (index: number) => setCollections(collections.filter((_, i) => i !== index));
  const updateCollection = (index: number, field: keyof CollectionItem, value: string) => {
    const updated = [...collections];
    updated[index] = { ...updated[index], [field]: value };
    setCollections(updated);
  };

  // Fellowships CRUD
  const addFellowship = () => setFellowships([...fellowships, { year: '', name: '' }]);
  const removeFellowship = (index: number) => setFellowships(fellowships.filter((_, i) => i !== index));
  const updateFellowship = (index: number, field: keyof FellowshipItem, value: string) => {
    const updated = [...fellowships];
    updated[index] = { ...updated[index], [field]: value };
    setFellowships(updated);
  };

  // Awards CRUD
  const addAward = () => setAwards([...awards, { year: '', name: '' }]);
  const removeAward = (index: number) => setAwards(awards.filter((_, i) => i !== index));
  const updateAward = (index: number, field: keyof AwardItem, value: string) => {
    const updated = [...awards];
    updated[index] = { ...updated[index], [field]: value };
    setAwards(updated);
  };

  // Publications CRUD
  const addPublication = () => setPublications([...publications, { year: '', title: '' }]);
  const removePublication = (index: number) => setPublications(publications.filter((_, i) => i !== index));
  const updatePublication = (index: number, field: keyof PublicationItem, value: string) => {
    const updated = [...publications];
    updated[index] = { ...updated[index], [field]: value };
    setPublications(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaveMsg(null);

    try {
      await onSubmit({
        birth_city: birthCity || undefined,
        birth_city_en: birthCityEn || undefined,
        birth_country: birthCountry || undefined,
        birth_country_en: birthCountryEn || undefined,
        live_city: liveCity || undefined,
        live_city_en: liveCityEn || undefined,
        live_country: liveCountry || undefined,
        live_country_en: liveCountryEn || undefined,
        education: education.filter((e) => e.year && e.description),
        residencies: residencies.filter((r) => r.year && r.program),
        collections: collections.filter((c) => c.year && c.name),
        fellowships: fellowships.filter((f) => f.year && f.name),
        awards: awards.filter((a) => a.year && a.name),
        publications: publications.filter((p) => p.year && p.title),
      });
      setSaveMsg({ ok: true, text: '저장되었습니다.' });
    } catch (err) {
      setSaveMsg({ ok: false, text: `저장 실패 — ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">


      {/* 출생지/거주지 */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">출생지 / 거주지</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">출생 도시</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={birthCity}
                onChange={(e) => setBirthCity(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
                placeholder="서울"
              />
              <input
                type="text"
                value={birthCityEn}
                onChange={(e) => setBirthCityEn(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
                placeholder="Seoul"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">출생 국가</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={birthCountry}
                onChange={(e) => setBirthCountry(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
                placeholder="대한민국"
              />
              <input
                type="text"
                value={birthCountryEn}
                onChange={(e) => setBirthCountryEn(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
                placeholder="South Korea"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">거주 도시</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={liveCity}
                onChange={(e) => setLiveCity(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
                placeholder="서울"
              />
              <input
                type="text"
                value={liveCityEn}
                onChange={(e) => setLiveCityEn(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
                placeholder="Seoul"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">거주 국가</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={liveCountry}
                onChange={(e) => setLiveCountry(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
                placeholder="대한민국"
              />
              <input
                type="text"
                value={liveCountryEn}
                onChange={(e) => setLiveCountryEn(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
                placeholder="South Korea"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Education */}
      <div className="border-t border-gray-200 pt-6">
        <label className="block text-sm font-medium mb-2 text-gray-700">Education</label>
        {education.map((item, index) => (
          <div key={index} className="mb-3 p-3 border border-gray-200 rounded bg-gray-50">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={item.year}
                onChange={(e) => updateEducation(index, 'year', e.target.value)}
                placeholder="연도"
                className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              />
              <input
                type="text"
                value={item.description}
                onChange={(e) => updateEducation(index, 'description', e.target.value)}
                placeholder="학력 내용 (한글)"
                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              />
              <button
                type="button"
                onClick={() => removeEducation(index)}
                className="text-red-400 hover:text-red-300 px-2"
              >
                삭제
              </button>
            </div>
            <div className="flex gap-2">
              <div className="w-24" />
              <input
                type="text"
                value={item.description_en || ''}
                onChange={(e) => updateEducation(index, 'description_en', e.target.value)}
                placeholder="Education (English)"
                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              />
              <div className="px-2 w-[52px]" />
            </div>
          </div>
        ))}
        <button type="button" onClick={addEducation} className="text-sm text-blue-400 hover:text-blue-300">
          + 학력 추가
        </button>
      </div>

      {/* Residencies */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700">Residencies</label>
        {residencies.map((item, index) => (
          <div key={index} className="mb-3 p-3 border border-gray-200 rounded bg-gray-50">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={item.year}
                onChange={(e) => updateResidency(index, 'year', e.target.value)}
                placeholder="연도"
                className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              />
              <input
                type="text"
                value={item.program}
                onChange={(e) => updateResidency(index, 'program', e.target.value)}
                placeholder="프로그램명"
                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              />
              <button
                type="button"
                onClick={() => removeResidency(index)}
                className="text-red-400 hover:text-red-300 px-2"
              >
                삭제
              </button>
            </div>
            <div className="flex gap-2 mb-2">
              <div className="w-24" />
              <input
                type="text"
                value={item.program_en || ''}
                onChange={(e) => updateResidency(index, 'program_en', e.target.value)}
                placeholder="Program Name (English)"
                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              />
              <div className="px-2 w-[52px]" />
            </div>
            <div className="flex gap-2">
              <div className="w-24" />
              <input
                type="text"
                value={item.location}
                onChange={(e) => updateResidency(index, 'location', e.target.value)}
                placeholder="장소 (한글)"
                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              />
              <input
                type="text"
                value={item.location_en || ''}
                onChange={(e) => updateResidency(index, 'location_en', e.target.value)}
                placeholder="Location (English)"
                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              />
            </div>
          </div>
        ))}
        <button type="button" onClick={addResidency} className="text-sm text-blue-400 hover:text-blue-300">
          + 레지던시 추가
        </button>
      </div>

      {/* Collections */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700">Collections</label>
        {collections.map((item, index) => (
          <div key={index} className="mb-3 p-3 border border-gray-200 rounded bg-gray-50">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={item.year}
                onChange={(e) => updateCollection(index, 'year', e.target.value)}
                placeholder="연도"
                className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              />
              <input
                type="text"
                value={item.name}
                onChange={(e) => updateCollection(index, 'name', e.target.value)}
                placeholder="소장처명"
                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              />
              <button
                type="button"
                onClick={() => removeCollection(index)}
                className="text-red-400 hover:text-red-300 px-2"
              >
                삭제
              </button>
            </div>
            <div className="flex gap-2 mb-2">
              <div className="w-24" />
              <input
                type="text"
                value={item.name_en || ''}
                onChange={(e) => updateCollection(index, 'name_en', e.target.value)}
                placeholder="Institution (English)"
                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              />
              <div className="px-2 w-[52px]" />
            </div>
            <div className="flex gap-2">
              <div className="w-24" />
              <input
                type="text"
                value={item.location || ''}
                onChange={(e) => updateCollection(index, 'location', e.target.value)}
                placeholder="장소 (한글)"
                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              />
              <input
                type="text"
                value={item.location_en || ''}
                onChange={(e) => updateCollection(index, 'location_en', e.target.value)}
                placeholder="Location (English)"
                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              />
            </div>
          </div>
        ))}
        <button type="button" onClick={addCollection} className="text-sm text-blue-400 hover:text-blue-300">
          + 소장처 추가
        </button>
      </div>

      {/* Fellowships */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700">Fellowships</label>
        {fellowships.map((item, index) => (
          <div key={index} className="mb-3 p-3 border border-gray-200 rounded bg-gray-50">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={item.year}
                onChange={(e) => updateFellowship(index, 'year', e.target.value)}
                placeholder="연도"
                className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              />
              <input
                type="text"
                value={item.name}
                onChange={(e) => updateFellowship(index, 'name', e.target.value)}
                placeholder="펠로우십명"
                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              />
              <button
                type="button"
                onClick={() => removeFellowship(index)}
                className="text-red-400 hover:text-red-300 px-2"
              >
                삭제
              </button>
            </div>
            <div className="flex gap-2">
              <div className="w-24" />
              <input
                type="text"
                value={item.name_en || ''}
                onChange={(e) => updateFellowship(index, 'name_en', e.target.value)}
                placeholder="Fellowship Name (English)"
                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              />
              <div className="px-2 w-[52px]" />
            </div>
          </div>
        ))}
        <button type="button" onClick={addFellowship} className="text-sm text-blue-400 hover:text-blue-300">
          + 펠로우십 추가
        </button>
      </div>

      {/* Awards */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700">Awards</label>
        {awards.map((item, index) => (
          <div key={index} className="mb-3 p-3 border border-gray-200 rounded bg-gray-50">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={item.year}
                onChange={(e) => updateAward(index, 'year', e.target.value)}
                placeholder="연도"
                className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              />
              <input
                type="text"
                value={item.name}
                onChange={(e) => updateAward(index, 'name', e.target.value)}
                placeholder="수상명"
                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              />
              <button
                type="button"
                onClick={() => removeAward(index)}
                className="text-red-400 hover:text-red-300 px-2"
              >
                삭제
              </button>
            </div>
            <div className="flex gap-2">
              <div className="w-24" />
              <input
                type="text"
                value={item.name_en || ''}
                onChange={(e) => updateAward(index, 'name_en', e.target.value)}
                placeholder="Award Name (English)"
                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              />
              <div className="px-2 w-[52px]" />
            </div>
          </div>
        ))}
        <button type="button" onClick={addAward} className="text-sm text-blue-400 hover:text-blue-300">
          + 수상 추가
        </button>
      </div>

      {/* Publications */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700">Publications</label>
        {publications.map((item, index) => (
          <div key={index} className="mb-3 p-3 border border-gray-200 rounded bg-gray-50">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={item.year}
                onChange={(e) => updatePublication(index, 'year', e.target.value)}
                placeholder="연도"
                className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              />
              <input
                type="text"
                value={item.title}
                onChange={(e) => updatePublication(index, 'title', e.target.value)}
                placeholder="출판물 제목"
                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              />
              <button
                type="button"
                onClick={() => removePublication(index)}
                className="text-red-400 hover:text-red-300 px-2"
              >
                삭제
              </button>
            </div>
            <div className="flex gap-2">
              <div className="w-24" />
              <input
                type="text"
                value={item.title_en || ''}
                onChange={(e) => updatePublication(index, 'title_en', e.target.value)}
                placeholder="Publication Title (English)"
                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              />
              <div className="px-2 w-[52px]" />
            </div>
          </div>
        ))}
        <button type="button" onClick={addPublication} className="text-sm text-blue-400 hover:text-blue-300">
          + 출판물 추가
        </button>
      </div>

      <SaveBar
        type="submit"
        loading={loading}
        message={saveMsg}
        extra={
          <>
        <TranslateAllButton
          pairs={[
            { source: birthCity, target: birthCityEn, apply: setBirthCityEn },
            { source: birthCountry, target: birthCountryEn, apply: setBirthCountryEn },
            { source: liveCity, target: liveCityEn, apply: setLiveCityEn },
            { source: liveCountry, target: liveCountryEn, apply: setLiveCountryEn },
            ...education.map((e, i): TranslatePair => ({ source: e.description, target: e.description_en || '', apply: (v) => updateEducation(i, 'description_en', v) })),
            ...residencies.flatMap((r, i): TranslatePair[] => [
              { source: r.program, target: r.program_en || '', apply: (v) => updateResidency(i, 'program_en', v) },
              { source: r.location, target: r.location_en || '', apply: (v) => updateResidency(i, 'location_en', v) },
            ]),
            ...collections.flatMap((c, i): TranslatePair[] => [
              { source: c.name, target: c.name_en || '', apply: (v) => updateCollection(i, 'name_en', v) },
              { source: c.location || '', target: c.location_en || '', apply: (v) => updateCollection(i, 'location_en', v) },
            ]),
            ...fellowships.map((f, i): TranslatePair => ({ source: f.name, target: f.name_en || '', apply: (v) => updateFellowship(i, 'name_en', v) })),
            ...awards.map((a, i): TranslatePair => ({ source: a.name, target: a.name_en || '', apply: (v) => updateAward(i, 'name_en', v) })),
            ...publications.map((p, i): TranslatePair => ({ source: p.title, target: p.title_en || '', apply: (v) => updatePublication(i, 'title_en', v) })),
          ]}
        />
            <span className="text-xs text-gray-400">한글 입력 후 누르면 빈 영문칸을 모두 채웁니다</span>
          </>
        }
      />
    </form>
  );
}
