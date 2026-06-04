import { notFound } from 'next/navigation';
import { getPressById } from '@/lib/data';
import { pressCategoryFromSlug, type Press } from '@/types/artwork';
import { PressDetail } from '@/components/press/PressView';

export const revalidate = 3600;

export default async function Page({ params }: { params: Promise<{ category: string; id: string }> }) {
  const { category, id } = await params;
  if (!pressCategoryFromSlug(category)) notFound();
  const press = (await getPressById(id)) as Press | undefined;
  if (!press) notFound();
  return <PressDetail press={press} />;
}
