import { notFound } from 'next/navigation';
import { getGenrePageData } from '@/lib/works-page';
import WorksGenreScreen from '@/components/works/WorksGenreScreen';

export const revalidate = 3600;

export default async function Page({ params }: { params: Promise<{ genre: string; group: string; sub: string }> }) {
  const { genre, group, sub } = await params;
  const data = await getGenrePageData(genre, group, sub);
  if (!data) notFound();
  return <WorksGenreScreen {...data} />;
}
