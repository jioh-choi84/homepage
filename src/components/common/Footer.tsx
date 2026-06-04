'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AboutInfo, SocialLink } from '@/types/artwork';
import { useLocale } from '@/i18n';
import { getLocalizedValue, formatTranslation } from '@/lib/i18n-utils';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [aboutInfo, setAboutInfo] = useState<AboutInfo | null>(null);
  const { locale, t } = useLocale();

  useEffect(() => {
    fetch('/api/about')
      .then((res) => res.json())
      .then((data) => setAboutInfo(data))
      .catch(() => {});
  }, []);

  const getSocialLabel = (platform: SocialLink['platform']) => {
    const labels: Record<SocialLink['platform'], string> = {
      instagram: 'Instagram',
      facebook: 'Facebook',
      twitter: 'X',
      youtube: 'YouTube',
      website: t.footer.website,
      other: t.footer.links,
    };
    return labels[platform];
  };

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

  // 동적 콘텐츠 영문화
  const artistName = aboutInfo
    ? getLocalizedValue(
        locale,
        aboutInfo.artist_name,
        (aboutInfo as AboutInfo & { artist_name_en?: string }).artist_name_en
      )
    : t.footer.defaultName;

  const footerBio = aboutInfo
    ? getLocalizedValue(
        locale,
        aboutInfo.footer_bio || t.footer.defaultBio,
        (aboutInfo as AboutInfo & { footer_bio_en?: string }).footer_bio_en
      )
    : t.footer.defaultBio;

  return (
    <footer className="bg-[var(--background)] border-t border-gray-800">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Artist info */}
          <div>
            <h3
              className="text-xl text-[var(--foreground)] mb-4"
              style={{ fontFamily: 'var(--font-noto-serif), serif' }}
            >
              {artistName}
            </h3>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed whitespace-pre-line">
              {footerBio.split(/(?<=[.?!。])\s*/).join('\n')}
            </p>
          </div>

          {/* Contact & Social */}
          <div>
            <h4 className="text-[var(--foreground)] text-sm font-medium mb-4 tracking-wide">
              {t.footer.contact}
            </h4>
            <ul className="space-y-2 text-[var(--text-secondary)] text-sm">
              {aboutInfo?.contact_email && (
                <li>
                  <a
                    href={`mailto:${aboutInfo.contact_email}`}
                    className="hover:text-[var(--foreground)] transition-colors"
                  >
                    {aboutInfo.contact_email}
                  </a>
                </li>
              )}
              {aboutInfo?.phone_visible && aboutInfo?.contact_phone && (
                <li>
                  <a
                    href={`tel:${aboutInfo.contact_phone.replace(/-/g, '')}`}
                    className="hover:text-[var(--foreground)] transition-colors"
                  >
                    {aboutInfo.contact_phone}
                  </a>
                </li>
              )}
              {aboutInfo?.studio_address && (
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>
                    {getLocalizedValue(
                      locale,
                      aboutInfo.studio_address,
                      (aboutInfo as AboutInfo & { studio_address_en?: string }).studio_address_en
                    )}
                  </span>
                </li>
              )}
            </ul>

            {/* Social Links */}
            {aboutInfo?.social_links && aboutInfo.social_links.length > 0 && (
              <div className="mt-4">
                <div className="flex gap-3">
                  {aboutInfo.social_links.map((link, index) => {
                    return (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
                        title={link.label || getSocialLabel(link.platform)}
                      >
                        {SOCIAL_ICONS[link.platform]}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Copyright notice */}
        <div className="pt-8 border-t border-gray-800">
          <div className="text-center space-y-3">
            <p className="text-[var(--text-secondary)] text-xs">
              &copy; {currentYear} {artistName}. All rights reserved.
            </p>
            <p className="text-gray-600 text-xs leading-relaxed max-w-2xl mx-auto whitespace-pre-line">
              {formatTranslation(t.footer.notice, { name: artistName })}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
