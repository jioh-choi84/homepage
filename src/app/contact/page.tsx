import ContactContent from '@/components/contact/ContactContent';
import { getAbout } from '@/lib/data';

export const revalidate = 3600;

export default async function ContactPage() {
  const contactInfo = await getAbout();

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="pt-24 pb-16 px-6">
        <div className="max-w-2xl mx-auto">
          <ContactContent contactInfo={contactInfo} />
        </div>
      </div>
    </main>
  );
}
