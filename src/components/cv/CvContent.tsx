'use client';

import { CvInfo, Exhibition, EXHIBITION_TYPE_OPTIONS, exhibitionTypeLabel } from '@/types/artwork';
import { useLocale } from '@/i18n';
import { getLocalizedValue } from '@/lib/i18n-utils';

interface CvContentProps {
  cvInfo: CvInfo | null;
  // artist_name은 About에 유지되고 CV가 참조 (표준 분리)
  artistName: string | null;
  artistNameEn: string | null;
  exhibitions: Exhibition[];
}

export default function CvContent({ cvInfo, artistName, artistNameEn, exhibitions }: CvContentProps) {
  const { locale, t } = useLocale();

  const displayName = getLocalizedValue(locale, artistName, artistNameEn) || 'Chuni Park';

  // 입력 순서와 무관하게 항목 내에서 최근→과거(연도 내림차순) 자동 정렬.
  // 연도가 "2019–2021"처럼 범위면 가장 최근(가장 큰) 연도를 기준으로 한다.
  const yearNum = (y?: string): number => {
    const m = String(y ?? '').match(/\d{4}/g);
    return m ? Math.max(...m.map(Number)) : -1;
  };
  const byYearDesc = <T extends { year?: string }>(arr: T[]): T[] =>
    [...arr].sort((a, b) => yearNum(b.year) - yearNum(a.year));

  const education = byYearDesc(cvInfo?.education || []);
  const residencies = byYearDesc(cvInfo?.residencies || []);
  const collections = byYearDesc(cvInfo?.collections || []);
  const fellowships = byYearDesc(cvInfo?.fellowships || []);
  const awards = byYearDesc(cvInfo?.awards || []);
  const publications = byYearDesc(cvInfo?.publications || []);
  const cvFileUrl = cvInfo?.cv_file_url;

  // Born in / Live & Work in
  const birthPlace = cvInfo
    ? getLocalizedValue(
        locale,
        [cvInfo.birth_city, cvInfo.birth_country].filter(Boolean).join(', '),
        [cvInfo.birth_city_en, cvInfo.birth_country_en].filter(Boolean).join(', ')
      )
    : null;

  const livePlace = cvInfo
    ? getLocalizedValue(
        locale,
        [cvInfo.live_city, cvInfo.live_country].filter(Boolean).join(', '),
        [cvInfo.live_city_en, cvInfo.live_country_en].filter(Boolean).join(', ')
      )
    : null;


  // CV Section Component
  const CVSection = ({
    title,
    children
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div className="mb-10">
      <h3 className="text-sm font-medium tracking-wider text-[var(--text-secondary)] uppercase mb-4">
        {title}
      </h3>
      {children}
    </div>
  );

  // Exhibition List Component
  const ExhibitionList = ({ items }: { items: Exhibition[] }) => (
    <ul className="space-y-1.5 text-[var(--text-secondary)]">
      {items.map((exhibition) => (
        <li key={exhibition.id} className="leading-relaxed">
          <span className="text-[var(--text-secondary)] mr-2">{exhibition.year}</span>
          {getLocalizedValue(locale, exhibition.title, exhibition.title_en)}
          {(exhibition.venue || exhibition.venue_en) && (
            <span className="text-[var(--text-secondary)]">
              , {getLocalizedValue(locale, exhibition.venue, exhibition.venue_en)}
            </span>
          )}
          {(exhibition.location || exhibition.location_en) && (
            <span className="text-[var(--text-secondary)]">
              , {getLocalizedValue(locale, exhibition.location, exhibition.location_en)}
            </span>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="max-w-2xl">
      {/* Artist Name */}
      <h1 className="text-4xl font-light tracking-wide mb-8 text-[var(--foreground)]">
        {displayName}
      </h1>

      {/* Born in / Live & Work in */}
      {(birthPlace || livePlace) && (
        <div className="mb-10 space-y-1 text-[var(--text-secondary)]">
          {birthPlace && (
            <p>
              <span className="text-[var(--text-secondary)]">{t.cv.bornIn}</span> {birthPlace}
            </p>
          )}
          {livePlace && (
            <p>
              <span className="text-[var(--text-secondary)]">{t.cv.liveAndWorkIn}</span> {livePlace}
            </p>
          )}
        </div>
      )}

      {/* Education */}
      {education.length > 0 && (
        <CVSection title={t.cv.education}>
          <ul className="space-y-1.5 text-[var(--text-secondary)]">
            {education.map((item, index) => (
              <li key={index} className="leading-relaxed">
                <span className="text-[var(--text-secondary)] mr-2">{item.year}</span>
                {getLocalizedValue(locale, item.description, item.description_en)}
              </li>
            ))}
          </ul>
        </CVSection>
      )}

      {/* Exhibitions — 유형별 섹션(개인전·그룹전·팝업전·기획전·초대전·아트페어·비엔날레·공모전) */}
      {EXHIBITION_TYPE_OPTIONS.map((opt) => {
        const items = exhibitions.filter((e) => e.type === opt.value);
        if (items.length === 0) return null;
        return (
          <CVSection key={opt.value} title={exhibitionTypeLabel(opt.value, locale)}>
            <ExhibitionList items={items} />
          </CVSection>
        );
      })}

      {/* Publications */}
      {publications.length > 0 && (
        <CVSection title={t.cv.publications}>
          <ul className="space-y-1.5 text-[var(--text-secondary)]">
            {publications.map((item, index) => (
              <li key={index} className="leading-relaxed">
                <span className="text-[var(--text-secondary)] mr-2">{item.year}</span>
                {getLocalizedValue(locale, item.title, item.title_en)}
                {(item.publisher || item.publisher_en) && (
                  <span className="text-[var(--text-secondary)]">
                    , {getLocalizedValue(locale, item.publisher, item.publisher_en)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </CVSection>
      )}

      {/* Residencies */}
      {residencies.length > 0 && (
        <CVSection title={t.cv.residencies}>
          <ul className="space-y-1.5 text-[var(--text-secondary)]">
            {residencies.map((item, index) => (
              <li key={index} className="leading-relaxed">
                <span className="text-[var(--text-secondary)] mr-2">{item.year}</span>
                {getLocalizedValue(locale, item.program, item.program_en)}
                {(item.location || item.location_en) && (
                  <span className="text-[var(--text-secondary)]">
                    , {getLocalizedValue(locale, item.location, item.location_en)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </CVSection>
      )}

      {/* Collections */}
      {collections.length > 0 && (
        <CVSection title={t.cv.collections}>
          <ul className="space-y-1.5 text-[var(--text-secondary)]">
            {collections.map((item, index) => (
              <li key={index} className="leading-relaxed">
                <span className="text-[var(--text-secondary)] mr-2">{item.year}</span>
                {getLocalizedValue(locale, item.name, item.name_en)}
                {(item.location || item.location_en) && (
                  <span className="text-[var(--text-secondary)]">
                    , {getLocalizedValue(locale, item.location, item.location_en)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </CVSection>
      )}

      {/* Fellowships */}
      {fellowships.length > 0 && (
        <CVSection title={t.cv.fellowships}>
          <ul className="space-y-1.5 text-[var(--text-secondary)]">
            {fellowships.map((item, index) => (
              <li key={index} className="leading-relaxed">
                <span className="text-[var(--text-secondary)] mr-2">{item.year}</span>
                {getLocalizedValue(locale, item.name, item.name_en)}
                {(item.organization || item.organization_en) && (
                  <span className="text-[var(--text-secondary)]">
                    , {getLocalizedValue(locale, item.organization, item.organization_en)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </CVSection>
      )}

      {/* Awards */}
      {awards.length > 0 && (
        <CVSection title={t.cv.awards}>
          <ul className="space-y-1.5 text-[var(--text-secondary)]">
            {awards.map((item, index) => (
              <li key={index} className="leading-relaxed">
                <span className="text-[var(--text-secondary)] mr-2">{item.year}</span>
                {getLocalizedValue(locale, item.name, item.name_en)}
                {(item.organization || item.organization_en) && (
                  <span className="text-[var(--text-secondary)]">
                    , {getLocalizedValue(locale, item.organization, item.organization_en)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </CVSection>
      )}

      {/* CV Download */}
      {cvFileUrl && (
        <div className="mt-12">
          <a
            href={cvFileUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 border border-white text-[var(--foreground)] text-sm tracking-wider hover:bg-white hover:text-black transition-colors"
          >
            {t.cv.downloadCv}
          </a>
        </div>
      )}
    </div>
  );
}
