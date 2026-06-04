import { notFound } from 'next/navigation';
import { getPress } from '@/lib/data';
import { pressCategoryFromSlug, type Press } from '@/types/artwork';
import { PressList } from '@/components/press/PressView';

export const revalidate = 3600;

export default async function Page({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const cat = pressCategoryFromSlug(category);
  if (!cat) notFound();
  const all = (await getPress()) as Press[];
  const items = all
    .filter((p) => (p.category || 'article') === cat)
    .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''));
  return <PressList category={cat} items={items} />;
}
