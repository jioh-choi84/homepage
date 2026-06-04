'use client';

import { useState, useEffect } from 'react';
import {
  AboutInfo,
  AboutFormData,
  SocialLink,
} from '@/types/artwork';
import ImageUploader from '@/components/admin/ImageUploader';
import { TranslateButton, TranslateAllButton, translateMany } from './TranslateButton';
import SaveBar, { type SaveMsg } from './SaveBar';

const SOCIAL_PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'website', label: '웹사이트' },
  { value: 'other', label: '기타' },
] as const;

interface AboutFormProps {
  aboutInfo?: AboutInfo;
  onSubmit: (data: AboutFormData) => Promise<void>;
}

export default function AboutForm({ aboutInfo, onSubmit }: AboutFormProps) {
  const [artistName, setArtistName] = useState('');
  const [artistNameEn, setArtistNameEn] = useState('');
  const [bioParagraphs, setBioParagraphs] = useState<string[]>(['']);
  const [bioParagraphsEn, setBioParagraphsEn] = useState<string[]>(['']);
  // 연락처
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [phoneVisible, setPhoneVisible] = useState(false);
  const [studioAddress, setStudioAddress] = useState('');
  const [studioAddressEn, setStudioAddressEn] = useState('');
  const [contactNote, setContactNote] = useState('');
  const [contactNoteEn, setContactNoteEn] = useState('');
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [footerBio, setFooterBio] = useState('');
  const [footerBioEn, setFooterBioEn] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState<SaveMsg | null>(null);

  useEffect(() => {
    if (aboutInfo) {
      setArtistName(aboutInfo.artist_name || '');
      setArtistNameEn(aboutInfo.artist_name_en || '');
      setBioParagraphs(
        aboutInfo.bio_paragraphs && aboutInfo.bio_paragraphs.length > 0
          ? aboutInfo.bio_paragraphs
          : ['']
      );
      setBioParagraphsEn(
        aboutInfo.bio_paragraphs_en && aboutInfo.bio_paragraphs_en.length > 0
          ? aboutInfo.bio_paragraphs_en
          : ['']
      );
      setContactEmail(aboutInfo.contact_email || '');
      setContactPhone(aboutInfo.contact_phone || '');
      setPhoneVisible(aboutInfo.phone_visible || false);
      setStudioAddress(aboutInfo.studio_address || '');
      setStudioAddressEn(aboutInfo.studio_address_en || '');
      setContactNote(aboutInfo.contact_note || '');
      setContactNoteEn(aboutInfo.contact_note_en || '');
      setSocialLinks(aboutInfo.social_links || []);
      setFooterBio(aboutInfo.footer_bio || '');
      setFooterBioEn(aboutInfo.footer_bio_en || '');
      setProfileImageUrl(aboutInfo.profile_image_url || '');
    }
  }, [aboutInfo]);

  const addBioParagraph = () => setBioParagraphs([...bioParagraphs, '']);
  const removeBioParagraph = (index: number) => {
    if (bioParagraphs.length > 1) {
      setBioParagraphs(bioParagraphs.filter((_, i) => i !== index));
    }
  };
  const updateBioParagraph = (index: number, value: string) => {
    const updated = [...bioParagraphs];
    updated[index] = value;
    setBioParagraphs(updated);
  };

  const addBioParagraphEn = () => setBioParagraphsEn([...bioParagraphsEn, '']);
  const removeBioParagraphEn = (index: number) => {
    if (bioParagraphsEn.length > 1) {
      setBioParagraphsEn(bioParagraphsEn.filter((_, i) => i !== index));
    }
  };
  const updateBioParagraphEn = (index: number, value: string) => {
    const updated = [...bioParagraphsEn];
    updated[index] = value;
    setBioParagraphsEn(updated);
  };
  // 소개글(한글) 문단들을 한 번에 영작 → 영문 문단 배열로 설정
  const translateBio = async () => {
    const src = bioParagraphs.filter((p) => p.trim());
    if (src.length === 0) return;
    const out = await translateMany(bioParagraphs);
    setBioParagraphsEn(bioParagraphs.map((_, i) => out[i] ?? bioParagraphsEn[i] ?? ''));
  };

  const addSocialLink = () =>
    setSocialLinks([...socialLinks, { platform: 'instagram', url: '' }]);
  const removeSocialLink = (index: number) =>
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  const updateSocialLink = (
    index: number,
    field: keyof SocialLink,
    value: string
  ) => {
    const updated = [...socialLinks];
    updated[index] = { ...updated[index], [field]: value } as SocialLink;
    setSocialLinks(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaveMsg(null);

    try {
      await onSubmit({
        artist_name: artistName,
        artist_name_en: artistNameEn || undefined,
        bio_paragraphs: bioParagraphs.filter((p) => p.trim()),
        bio_paragraphs_en: bioParagraphsEn.filter((p) => p.trim()),
        footer_bio: footerBio || undefined,
        footer_bio_en: footerBioEn || undefined,
        contact_email: contactEmail || undefined,
        contact_phone: contactPhone || undefined,
        phone_visible: phoneVisible,
        studio_address: studioAddress || undefined,
        studio_address_en: studioAddressEn || undefined,
        contact_note: contactNote || undefined,
        contact_note_en: contactNoteEn || undefined,
        social_links: socialLinks.filter((s) => s.url.trim()),
        profile_image_url: profileImageUrl || '',
      });
      setSaveMsg({ ok: true, text: '저장되었습니다.' });
    } catch (err) {
      setSaveMsg({ ok: false, text: `저장 실패 — ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-5xl">


      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700">프로필 이미지</label>
        <div className="w-[30%] min-w-[160px]">
          <ImageUploader
            onUpload={(url) => setProfileImageUrl(url)}
            currentImage={profileImageUrl}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            작가명 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            작가명 (영문)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={artistNameEn}
              onChange={(e) => setArtistNameEn(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              placeholder="Artist Name"
            />
            <TranslateButton source={artistName} onResult={setArtistNameEn} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">소개글</label>
          {bioParagraphs.map((para, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <textarea
                value={para}
                onChange={(e) => updateBioParagraph(index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 resize-y bg-white text-gray-900 placeholder-gray-400"
                rows={10}
                placeholder="소개글 문단을 입력하세요"
              />
              {bioParagraphs.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeBioParagraph(index)}
                  className="text-red-400 hover:text-red-300 px-2"
                >
                  삭제
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addBioParagraph}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            + 문단 추가
          </button>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">소개글 (영문)</label>
            <button type="button" onClick={translateBio}
              className="px-2 py-1 text-xs rounded border border-blue-300 text-blue-600 hover:bg-blue-50">
              AI로 소개글 영작
            </button>
          </div>
          {bioParagraphsEn.map((para, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <textarea
                value={para}
                onChange={(e) => updateBioParagraphEn(index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 resize-y bg-white text-gray-900 placeholder-gray-400"
                rows={10}
                placeholder="Enter bio paragraph in English"
              />
              {bioParagraphsEn.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeBioParagraphEn(index)}
                  className="text-red-400 hover:text-red-300 px-2"
                >
                  삭제
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addBioParagraphEn}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            + Add Paragraph
          </button>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">연락처 정보</h3>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700">연락처 이메일</label>
        <input
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
          placeholder="email@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700">전화번호</label>
        <div className="flex gap-3 items-center">
          <input
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
            placeholder="010-1234-5678"
          />
          <label className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
            <input
              type="checkbox"
              checked={phoneVisible}
              onChange={(e) => setPhoneVisible(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 bg-white text-blue-500 focus:ring-blue-500"
            />
            사이트에 노출
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">작업실 주소</label>
          <input
            type="text"
            value={studioAddress}
            onChange={(e) => setStudioAddress(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
            placeholder="서울시 강남구 ..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">작업실 주소 (영문)</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={studioAddressEn}
              onChange={(e) => setStudioAddressEn(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              placeholder="Gangnam-gu, Seoul, Korea"
            />
            <TranslateButton source={studioAddress} onResult={setStudioAddressEn} />
          </div>
        </div>
      </div>

      {/* 연락처 비고 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">연락처 비고 (Contact 페이지에 표시)</label>
          <textarea
            value={contactNote}
            onChange={(e) => setContactNote(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
            placeholder="작품, 전시, 협업에 관한 문의는 이메일로 연락 바랍니다."
            rows={2}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">연락처 비고 (영문)</label>
          <div className="flex items-start gap-2">
            <textarea
              value={contactNoteEn}
              onChange={(e) => setContactNoteEn(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              placeholder="For inquiries about artworks, exhibitions, or collaborations..."
              rows={2}
            />
            <TranslateButton source={contactNote} onResult={setContactNoteEn} />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700">SNS 계정</label>
        {socialLinks.map((link, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <select
              value={link.platform}
              onChange={(e) => updateSocialLink(index, 'platform', e.target.value)}
              className="w-32 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900"
            >
              {SOCIAL_PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <input
              type="url"
              value={link.url}
              onChange={(e) => updateSocialLink(index, 'url', e.target.value)}
              placeholder="https://..."
              className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
            />
            {link.platform === 'other' && (
              <input
                type="text"
                value={link.label || ''}
                onChange={(e) => updateSocialLink(index, 'label', e.target.value)}
                placeholder="표시명"
                className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              />
            )}
            <button
              type="button"
              onClick={() => removeSocialLink(index)}
              className="text-red-400 hover:text-red-300 px-2"
            >
              삭제
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addSocialLink}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          + SNS 추가
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Footer 소개문
            <span className="text-gray-500 font-normal ml-2">(사이트 하단에 표시)</span>
          </label>
          <input
            type="text"
            value={footerBio}
            onChange={(e) => setFooterBio(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
            placeholder="예: 한국의 자연과 인물을 담은 작품 활동을 하고 있습니다."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Footer 소개문 (영문)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={footerBioEn}
              onChange={(e) => setFooterBioEn(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              placeholder="e.g. Creating artworks that capture the nature and people of Korea."
            />
            <TranslateButton source={footerBio} onResult={setFooterBioEn} />
          </div>
        </div>
      </div>

      <SaveBar
        type="submit"
        loading={loading}
        message={saveMsg}
        extra={
          <>
            <TranslateAllButton
              pairs={[
                { source: artistName, target: artistNameEn, apply: setArtistNameEn },
                { source: studioAddress, target: studioAddressEn, apply: setStudioAddressEn },
                { source: contactNote, target: contactNoteEn, apply: setContactNoteEn },
                { source: footerBio, target: footerBioEn, apply: setFooterBioEn },
              ]}
            />
            <span className="text-xs text-gray-400">소개글은 영문 섹션의 &lsquo;AI로 소개글 영작&rsquo; 버튼 사용</span>
          </>
        }
      />
    </form>
  );
}
