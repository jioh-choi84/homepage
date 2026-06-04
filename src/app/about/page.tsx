import AboutContent from '@/components/about/AboutContent';
import { getAbout } from '@/lib/data';
import { AboutInfo } from '@/types/artwork';

export const revalidate = 3600;

export default async function AboutPage() {
  const aboutInfo = (await getAbout().catch(() => null)) as AboutInfo | null;

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        <AboutContent aboutInfo={aboutInfo} />
      </div>
    </main>
  );
}
