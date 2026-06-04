import { getResources } from '@/lib/data';
import { RESOURCE_CATEGORIES, type Resource, type ResourceCategory } from '@/types/artwork';
import { ResourcesOverview } from '@/components/resources/ResourcesView';

export const revalidate = 3600;

export default async function Page() {
  const all = (await getResources()) as Resource[];
  const covers: Partial<Record<ResourceCategory, string>> = {};
  for (const c of RESOURCE_CATEGORIES) {
    const first = all.find((r) => r.category === c.value && r.thumbnail_url);
    if (first?.thumbnail_url) covers[c.value] = first.thumbnail_url;
  }
  return <ResourcesOverview covers={covers} />;
}
