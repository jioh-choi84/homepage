import { getPublicPortfolio, getWorkFolders } from '@/lib/data';
import { genreFromSlug, DEFAULT_GENRE, type Artwork, type ArtworkGenre, type WorkFolder } from '@/types/artwork';
import { buildGenreTree, artworksForGroup, defaultGroupSlug, type WorksGroupNav } from '@/lib/works';

export interface GenrePageData {
  genreSlug: string;
  genre: ArtworkGenre;
  groups: WorksGroupNav[];
  currentSlug: string | null;
  currentSub: string | null;
  artworks: Artwork[];
}

export async function getGenrePageData(
  genreSlug: string,
  groupSlug?: string,
  subSlug?: string,
): Promise<GenrePageData | null> {
  const genre = genreFromSlug(genreSlug);
  if (!genre) return null;

  const all = (await getPublicPortfolio()) as Artwork[];
  const genreArtworks = all.filter((a) => (a.genre || DEFAULT_GENRE) === genre);
  const folders = (await getWorkFolders()) as WorkFolder[];

  const groups = buildGenreTree(genreArtworks, folders, genre);
  const currentSlug = groupSlug ?? defaultGroupSlug(groups);
  const currentSub = subSlug ?? null;
  const artworks = currentSlug ? artworksForGroup(genreArtworks, folders, genre, currentSlug, currentSub) : [];

  return { genreSlug, genre, groups, currentSlug, currentSub, artworks };
}
