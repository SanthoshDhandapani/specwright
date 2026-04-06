import { useState, useEffect } from 'react';
import { getShowDetail } from '../api/tmdb';
import { useMovieStore } from '../store/movieStore';
import { MovieGrid } from '../components/movie/MovieGrid';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import type { Show } from '../types/movie';

export function FavoritesPage() {
  const { favorites } = useMovieStore();
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (favorites.length === 0) {
      setShows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all(favorites.map((id) => getShowDetail(id)))
      .then((details) => {
        setShows(details);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [favorites]);

  return (
    <div data-testid="page-favorites" className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex items-center gap-3">
        <h1 className="text-3xl font-bold text-white">Favorites</h1>
        <span data-testid="favorites-count" className="rounded-full bg-brand-600 px-3 py-1 text-sm text-white">
          {favorites.length}
        </span>
      </div>

      {loading && <LoadingSpinner />}

      {!loading && favorites.length === 0 && (
        <div data-testid="favorites-empty-state" className="py-20 text-center">
          <p className="text-lg text-gray-500">No favorites yet.</p>
          <p className="mt-2 text-sm text-gray-600">Browse shows and click ♡ to add them here.</p>
        </div>
      )}

      {!loading && shows.length > 0 && (
        <div data-testid="favorites-grid">
          <MovieGrid shows={shows} />
        </div>
      )}
    </div>
  );
}
