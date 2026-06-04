import { notFound } from 'next/navigation';
import { getResources } from '@/lib/data';
import { resourceCategoryFromSlug, type Resource } from '@/types/artwork';
import { ResourceList } from '@/components/resources/ResourcesView';

export const revalidate = 3600;

export default async function Page({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const cat = resourceCategoryFromSlug(category);
  if (!cat) notFound();
  const all = (await getResources()) as Resource[];
  const items = all.filter((r) => r.category === cat)
    .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''));
  return <ResourceList category={cat} items={items} />;
}
