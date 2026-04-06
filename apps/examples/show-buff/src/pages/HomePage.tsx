import { useState, useEffect } from 'react';
import { discoverShowsByYear } from '../api/tmdb';
import { MovieGrid } from '../components/movie/MovieGrid';
import { YearPagination } from '../components/movie/YearPagination';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import type { Show } from '../types/movie';

const DEFAULT_YEAR = new Date().getFullYear();

export function HomePage() {
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [page, setPage] = useState(1);
  const [shows, setShows] = useState<Show[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    discoverShowsByYear(year, page)
      .then((data) => {
        if (!cancelled) {
          setShows(data.results);
          setTotalPages(data.total_pages);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load shows');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [year, page]);

  const handleYearChange = (newYear: number) => {
    setYear(newYear);
    setPage(1);
  };

  return (
    <div data-testid="page-home" className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-white">Top TV Shows</h1>
        <p className="text-gray-400">Popular shows by premiere year</p>
      </div>

      <div className="mb-8">
        <YearPagination
          selectedYear={year}
          onYearChange={handleYearChange}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} onRetry={() => setPage(page)} />}
      {!loading && !error && <MovieGrid shows={shows} />}
    </div>
  );
}
