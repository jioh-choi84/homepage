'use client';

import { useLocale } from '@/i18n';
import { getLocalizedValue } from '@/lib/i18n-utils';
import { SocialLink } from '@/types/artwork';
import ContactForm from './ContactForm';

interface ContactInfo {
  artist_name: string;
  artist_name_en: string | null;
  bio_paragraphs: string[];
  bio_paragraphs_en: string[];
  contact_email: string | null;
  social_links: SocialLink[];
  studio_address: string | null;
  studio_address_en: string | null;
  contact_note: string | null;
  contact_note_en: string | null;
}

interface ContactContentProps {
  contactInfo: ContactInfo | null;
}

const SOCIAL_ICONS: Record<SocialLink['platform'], React.ReactElement> = {
  instagram: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  ),
  facebook: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  twitter: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  youtube: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
  website: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
    </svg>
  ),
  other: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
    </svg>
  ),
};

export default function ContactContent({ contactInfo }: ContactContentProps) {
  const { locale, t } = useLocale();

  const artistName = contactInfo
    ? getLocalizedValue(locale, contactInfo.artist_name, contactInfo.artist_name_en)
    : '';

  const bioParagraphs = contactInfo
    ? getLocalizedValue(
        locale,
        contactInfo.bio_paragraphs,
        contactInfo.bio_paragraphs_en && contactInfo.bio_paragraphs_en.length > 0
          ? contactInfo.bio_paragraphs_en
          : null
      )
    : [];

  const studioAddress = contactInfo
    ? getLocalizedValue(locale, contactInfo.studio_address, contactInfo.studio_address_en)
    : null;

  const getSocialLabel = (link: SocialLink) => {
    const labels: Record<SocialLink['platform'], string> = {
      instagram: 'Instagram',
      facebook: 'Facebook',
      twitter: 'X',
      youtube: 'YouTube',
      website: locale === 'ko' ? '웹사이트' : 'Website',
      other: link.label || (locale === 'ko' ? '링크' : 'Link'),
    };
    return link.label || labels[link.platform];
  };

  return (
    <>
      <h1 className="text-3xl font-light tracking-wide mb-12 text-[var(--foreground)]">
        {t.contact.title}
      </h1>

      <div className="space-y-8">
        {/* 1. Artist Name */}
        {artistName && (
          <div>
            <h2 className="text-sm text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              {t.contact.artist}
            </h2>
            <p className="text-lg text-[var(--foreground)]">{artistName}</p>
          </div>
        )}

        {/* 2. Introduction */}
        {bioParagraphs && bioParagraphs.length > 0 && (
          <div>
            <h2 className="text-sm text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              {t.contact.introduction}
            </h2>
            <div className="space-y-2 text-[var(--text-secondary)]">
              {bioParagraphs.map((para, index) => (
                <p key={index}>{para}</p>
              ))}
            </div>
          </div>
        )}

        {/* 3. Email */}
        <div>
          <h2 className="text-sm text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            {t.contact.email}
          </h2>
          {contactInfo?.contact_email ? (
            <a
              href={`mailto:${contactInfo.contact_email}`}
              className="text-lg text-[var(--foreground)] hover:text-[var(--text-secondary)] transition-colors"
            >
              {contactInfo.contact_email}
            </a>
          ) : (
            <p className="text-[var(--text-secondary)]">{t.contact.noContact}</p>
          )}
        </div>

        {/* 4. SNS Links */}
        {contactInfo?.social_links && contactInfo.social_links.length > 0 && (
          <div>
            <h2 className="text-sm text-[var(--text-secondary)] uppercase tracking-wider mb-3">
              {t.contact.socialLinks}
            </h2>
            <div className="flex flex-wrap gap-4">
              {contactInfo.social_links.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[var(--foreground)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  {SOCIAL_ICONS[link.platform]}
                  <span>{getSocialLabel(link)}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 5. Studio Address */}
        {studioAddress && (
          <div>
            <h2 className="text-sm text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              {t.contact.studioAddress}
            </h2>
            <p className="text-lg text-[var(--foreground)] flex items-start gap-2">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{studioAddress}</span>
            </p>
          </div>
        )}

        {/* Inquiry notice */}
        {(contactInfo?.contact_note || contactInfo?.contact_note_en) && (
          <div className="pt-8 border-t border-[var(--border)]">
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
              {getLocalizedValue(locale, contactInfo.contact_note, contactInfo.contact_note_en) || t.contact.inquiryNotice}
            </p>
          </div>
        )}

        {/* Contact Form */}
        <ContactForm />
      </div>
    </>
  );
}
