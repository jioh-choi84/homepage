import CvContent from '@/components/cv/CvContent';
import { getAbout, getCv, getExhibitions } from '@/lib/data';
import { AboutInfo, CvInfo, Exhibition } from '@/types/artwork';

export const revalidate = 3600;

export default async function CvPage() {
  const [aboutInfo, cvInfo, exhibitionsRaw] = await Promise.all([
    getAbout().catch(() => null) as Promise<AboutInfo | null>,
    getCv().catch(() => null) as Promise<CvInfo | null>,
    getExhibitions().catch(() => []) as Promise<Exhibition[]>,
  ]);

  const exhibitions = exhibitionsRaw.filter((e) => !e.hidden).sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return (a.display_order ?? 0) - (b.display_order ?? 0);
  });

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        <CvContent
          cvInfo={cvInfo}
          artistName={aboutInfo?.artist_name ?? null}
          artistNameEn={aboutInfo?.artist_name_en ?? null}
          exhibitions={exhibitions}
        />
      </div>
    </main>
  );
}
