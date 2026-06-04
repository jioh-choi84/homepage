'use client';

import Image from 'next/image';
import { AboutInfo } from '@/types/artwork';
import { useLocale } from '@/i18n';
import { getLocalizedValue } from '@/lib/i18n-utils';

interface AboutContentProps {
  aboutInfo: AboutInfo | null;
}

export default function AboutContent({ aboutInfo }: AboutContentProps) {
  const { locale, t } = useLocale();

  const artistName = aboutInfo
    ? getLocalizedValue(locale, aboutInfo.artist_name, aboutInfo.artist_name_en) || 'Jioh Choi'
    : 'Jioh Choi';

  const bioParagraphs = aboutInfo
    ? getLocalizedValue(
        locale,
        aboutInfo.bio_paragraphs,
        aboutInfo.bio_paragraphs_en && aboutInfo.bio_paragraphs_en.length > 0
          ? aboutInfo.bio_paragraphs_en
          : null
      )
    : [];

  const studioAddress = aboutInfo
    ? getLocalizedValue(locale, aboutInfo.studio_address, aboutInfo.studio_address_en)
    : null;

  return (
    <div className="max-w-2xl">
      {/* Profile image */}
      {aboutInfo?.profile_image_url && (
        <div className="relative w-48 aspect-[3/4] mb-8 bg-[var(--border)]">
          <Image
            src={aboutInfo.profile_image_url}
            alt={artistName}
            fill
            className="object-cover"
            sizes="192px"
          />
        </div>
      )}

      {/* Artist Name */}
      <h1 className="text-4xl font-light tracking-wide mb-8 text-[var(--foreground)]">
        {artistName}
      </h1>

      {/* Bio */}
      {bioParagraphs && bioParagraphs.length > 0 && (
        <div className="space-y-4 text-[var(--text-secondary)] leading-relaxed mb-12">
          {bioParagraphs.map((para, index) => (
            <p key={index}>{para}</p>
          ))}
        </div>
      )}

      {/* Contact summary */}
      <div className="space-y-6 border-t border-[var(--border)] pt-8">
        {aboutInfo?.contact_email && (
          <div>
            <h2 className="text-sm text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              {t.contact.email}
            </h2>
            <a
              href={`mailto:${aboutInfo.contact_email}`}
              className="text-[var(--foreground)] hover:text-[var(--text-secondary)] transition-colors"
            >
              {aboutInfo.contact_email}
            </a>
          </div>
        )}

        {aboutInfo?.social_links && aboutInfo.social_links.length > 0 && (
          <div>
            <h2 className="text-sm text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              {t.contact.socialLinks}
            </h2>
            <div className="flex flex-wrap gap-4">
              {aboutInfo.social_links.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--foreground)] hover:text-[var(--text-secondary)] transition-colors capitalize"
                >
                  {link.label || link.platform}
                </a>
              ))}
            </div>
          </div>
        )}

        {studioAddress && (
          <div>
            <h2 className="text-sm text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              {t.contact.studioAddress}
            </h2>
            <p className="text-[var(--foreground)]">{studioAddress}</p>
          </div>
        )}
      </div>
    </div>
  );
}
