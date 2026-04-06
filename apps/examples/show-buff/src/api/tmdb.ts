import type { Show, CastMember, ShowImage } from '../types/movie';
import { getMockShowsByYear, getMockShowDetail, getMockShowCast, getMockShowImages } from './mockData';

const BASE_URL = 'https://api.tvmaze.com';
const FORCE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';

/** Strip HTML tags from TVMaze summary strings */
export function stripHtml(html: string | null): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

async function tvmazeFetch<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`);
  if (!res.ok) throw new Error(`TVMaze API error: ${res.status} ${res.statusText}`);
  return res.json();
}

// Popular show names by year — search seeds to get real shows with images.
// For years not listed here, a generic search is used as fallback.
const POPULAR_SHOWS: Record<number, string[]> = {
  2022: [
    'The Bear', 'House of the Dragon', 'Wednesday', 'Andor',
    'The White Lotus', 'Severance', 'Pachinko', 'Bad Sisters',
    'The Rings of Power', 'She-Hulk', 'Dahmer', 'Abbott Elementary',
  ],
  2023: [
    'The Last of Us', 'Beef', 'Succession', 'Silo',
    'Lessons in Chemistry', 'The Fall of the House of Usher', 'Loki',
    'Fargo', 'One Piece', 'Gen V', 'Ahsoka', 'Bodies',
  ],
  2024: [
    'Shogun', 'The Penguin', 'Fallout', 'Baby Reindeer',
    'Ripley', 'True Detective Night Country', '3 Body Problem',
    'The Gentlemen', 'Nobody Wants This', 'Disclaimer',
    'The Day of the Jackal', 'Agatha All Along',
  ],
  2025: [
    'Severance', 'The Studio', 'Adolescence',
    'White Lotus', 'Daredevil Born Again',
    'Reacher', 'Alien Earth', 'Andor',
    'The Last of Us', 'Your Friends and Neighbors',
  ],
  2026: [
    'Stranger Things', 'The Witcher', 'Squid Game',
    'Avatar', 'Superman', 'Marvel', 'Star Wars',
    'Game of Thrones', 'Breaking Bad', 'The Office',
  ],
};

// Generic search terms for years without curated lists
const GENERIC_SEARCHES = [
  'best new show', 'popular series', 'top rated drama',
  'new comedy series', 'thriller series', 'sci-fi show',
  'action series', 'mystery show', 'fantasy series', 'crime show',
];

// Cache: year → Show[]
const yearCache = new Map<number, Show[]>();

async function fetchShowsForYear(year: number): Promise<Show[]> {
  if (yearCache.has(year)) return yearCache.get(year)!;

  const queries = POPULAR_SHOWS[year] ?? GENERIC_SEARCHES;

  // Fetch all searches in parallel
  const results = await Promise.all(
    queries.map(async (q) => {
      try {
        const data = await tvmazeFetch<Array<{ score: number; show: Show }>>(
          `/search/shows?q=${encodeURIComponent(q)}`
        );
        // Return the best match (first result usually best)
        return data[0]?.show ?? null;
      } catch {
        return null;
      }
    })
  );

  // Deduplicate by ID and filter nulls
  const seen = new Set<number>();
  const shows: Show[] = [];
  for (const show of results) {
    if (show && !seen.has(show.id)) {
      seen.add(show.id);
      shows.push(show);
    }
  }

  // Sort by rating descending
  shows.sort((a, b) => (b.rating.average ?? 0) - (a.rating.average ?? 0));

  yearCache.set(year, shows);
  return shows;
}

export interface ShowsResponse {
  page: number;
  results: Show[];
  total_pages: number;
  total_results: number;
}

export async function discoverShowsByYear(
  year: number,
  page = 1
): Promise<ShowsResponse> {
  if (FORCE_MOCK) return getMockShowsByYear(year, page);

  const allShows = await fetchShowsForYear(year);
  const perPage = 10;
  const start = (page - 1) * perPage;
  const paged = allShows.slice(start, start + perPage);

  return {
    page,
    results: paged,
    total_pages: Math.ceil(allShows.length / perPage) || 1,
    total_results: allShows.length,
  };
}

export async function getShowDetail(id: number): Promise<Show> {
  if (FORCE_MOCK) {
    const mock = getMockShowDetail(id);
    if (!mock) throw new Error(`Show not found: ${id}`);
    return mock;
  }
  return tvmazeFetch<Show>(`/shows/${id}`);
}

export async function getShowCast(id: number): Promise<CastMember[]> {
  if (FORCE_MOCK) return getMockShowCast(id);
  return tvmazeFetch<CastMember[]>(`/shows/${id}/cast`);
}

export async function getShowImages(id: number): Promise<ShowImage[]> {
  if (FORCE_MOCK) return getMockShowImages(id);
  return tvmazeFetch<ShowImage[]>(`/shows/${id}/images`);
}
