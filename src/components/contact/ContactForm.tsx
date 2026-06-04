'use client';

import { useState } from 'react';
import { useLocale } from '@/i18n';
import { ContactFormData } from '@/types/artwork';

export default function ContactForm() {
  const { t } = useLocale();
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="mt-12 pt-8 border-t border-[var(--border)]">
      <h2 className="text-xl font-light text-[var(--foreground)] mb-6">{t.contactForm.title}</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm text-[var(--text-secondary)] mb-2">
              {t.contactForm.name}
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder={t.contactForm.namePlaceholder}
              className="w-full px-4 py-3 bg-gray-100 border border-[var(--border)] text-[var(--foreground)] placeholder-gray-500 focus:border-white focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm text-[var(--text-secondary)] mb-2">
              {t.contactForm.email}
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder={t.contactForm.emailPlaceholder}
              className="w-full px-4 py-3 bg-gray-100 border border-[var(--border)] text-[var(--foreground)] placeholder-gray-500 focus:border-white focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label htmlFor="subject" className="block text-sm text-[var(--text-secondary)] mb-2">
            {t.contactForm.subject}
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            required
            placeholder={t.contactForm.subjectPlaceholder}
            className="w-full px-4 py-3 bg-gray-100 border border-[var(--border)] text-[var(--foreground)] placeholder-gray-500 focus:border-white focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm text-[var(--text-secondary)] mb-2">
            {t.contactForm.message}
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows={6}
            placeholder={t.contactForm.messagePlaceholder}
            className="w-full px-4 py-3 bg-gray-100 border border-[var(--border)] text-[var(--foreground)] placeholder-gray-500 focus:border-white focus:outline-none transition-colors resize-none"
          />
        </div>

        {status === 'success' && (
          <p className="text-green-400 text-sm">{t.contactForm.success}</p>
        )}
        {status === 'error' && (
          <p className="text-red-400 text-sm">{t.contactForm.error}</p>
        )}

        <button
          type="submit"
          disabled={status === 'sending'}
          className="px-8 py-3 border border-white text-[var(--foreground)] text-sm tracking-wider hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'sending' ? t.contactForm.sending : t.contactForm.submit}
        </button>
      </form>
    </div>
  );
}
