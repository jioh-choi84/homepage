import { notFound } from 'next/navigation';
import { getExhibitions } from '@/lib/data';
import { getSpecial, getByStatus } from '@/lib/exhibition';
import type { Exhibition } from '@/types/artwork';
import ExhibitionFeatured from '@/components/exhibition/ExhibitionFeatured';
import ExhibitionList from '@/components/exhibition/ExhibitionList';

export const revalidate = 3600;

export default async function Page({ params }: { params: Promise<{ status: string }> }) {
  const { status } = await params;
  const all = (await getExhibitions()) as Exhibition[];
  if (status === 'special') return <ExhibitionFeatured items={getSpecial(all)} />;
  if (status === 'current') return <ExhibitionList status="current" items={getByStatus(all, 'current')} />;
  if (status === 'past') return <ExhibitionList status="past" items={getByStatus(all, 'past')} />;
  notFound();
}
