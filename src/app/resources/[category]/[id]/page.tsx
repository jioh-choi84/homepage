import { notFound } from 'next/navigation';
import { getResourceById } from '@/lib/data';
import { resourceCategoryFromSlug, type Resource } from '@/types/artwork';
import { ResourceDetail } from '@/components/resources/ResourcesView';

export const revalidate = 3600;

export default async function Page({ params }: { params: Promise<{ category: string; id: string }> }) {
  const { category, id } = await params;
  if (!resourceCategoryFromSlug(category)) notFound();
  const resource = (await getResourceById(id)) as Resource | undefined;
  if (!resource) notFound();
  return <ResourceDetail resource={resource} />;
}
