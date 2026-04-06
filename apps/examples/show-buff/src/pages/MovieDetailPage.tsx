import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getShowDetail, getShowCast, getShowImages, stripHtml } from '../api/tmdb';
import { MovieCast } from '../components/movie/MovieCast';
import { MovieImages } from '../components/movie/MovieImages';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { useAuthStore } from '../store/authStore';
import { useMovieStore } from '../store/movieStore';
import { AddToListDropdown } from '../components/lists/AddToListDropdown';
import type { Show, CastMember, ShowImage } from '../types/movie';

export function MovieDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { isFavorite, addFavorite, removeFavorite, isInWatchlist, addToWatchlist, removeFromWatchlist } = useMovieStore();

  const [show, setShow] = useState<Show | null>(null);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [images, setImages] = useState<ShowImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const showId = Number(id);
  const fav = isFavorite(showId);
  const watch = isInWatchlist(showId);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      getShowDetail(Number(id)),
      getShowCast(Number(id)),
      getShowImages(Number(id)),
    ])
      .then(([showData, castData, imageData]) => {
        if (!cancelled) {
          setShow(showData);
          setCast(castData);
          setImages(imageData);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load show');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!show) return null;

  return (
    <div data-testid="page-show-detail">
      {/* Banner image */}
      {show.image?.original && (
        <div className="relative h-72 overflow-hidden md:h-96">
          <img src={show.image.original} alt="" data-testid="show-backdrop" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent" />
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          data-testid="back-button"
          className="mb-6 rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
        >
          ← Back
        </button>

        {/* Show info */}
        <div className="flex gap-8">
          {show.image?.medium && (
            <img
              src={show.image.medium}
              alt={show.name}
              data-testid="show-poster"
              className="hidden w-64 rounded-xl shadow-2xl md:block"
            />
          )}

          <div className="flex-1">
            <h1 data-testid="show-title" className="mb-2 text-3xl font-bold text-white">
              {show.name}
            </h1>

            <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-gray-400">
              <span data-testid="show-rating" className="text-yellow-400">★ {show.rating.average?.toFixed(1) ?? 'N/A'}</span>
              <span data-testid="show-premiered">{show.premiered ?? 'TBA'}</span>
              {show.runtime && <span data-testid="show-runtime">{show.runtime} min</span>}
              <span data-testid="show-status" className="rounded-full bg-gray-800 px-2 py-0.5 text-xs">{show.status}</span>
            </div>

            <div data-testid="show-genres" className="mb-4 flex flex-wrap gap-2">
              {show.genres.map((g) => (
                <span key={g} className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-300">
                  {g}
                </span>
              ))}
            </div>

            <p data-testid="show-synopsis" className="mb-6 leading-relaxed text-gray-300">
              {stripHtml(show.summary)}
            </p>

            {/* Action buttons (only for authenticated users) */}
            {isAuthenticated && (
              <div className="flex gap-3">
                {fav ? (
                  <button
                    onClick={() => removeFavorite(showId)}
                    data-testid="btn-remove-favorite"
                    className="rounded-lg bg-red-900/50 px-4 py-2 text-sm text-red-300 hover:bg-red-900"
                  >
                    ♥ Remove from Favorites
                  </button>
                ) : (
                  <button
                    onClick={() => addFavorite(showId)}
                    data-testid="btn-add-favorite"
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
                  >
                    ♡ Add to Favorites
                  </button>
                )}

                {watch ? (
                  <button
                    onClick={() => removeFromWatchlist(showId)}
                    data-testid="btn-remove-watchlist"
                    className="rounded-lg bg-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-600"
                  >
                    ✓ In Watchlist
                  </button>
                ) : (
                  <button
                    onClick={() => addToWatchlist(showId)}
                    data-testid="btn-add-watchlist"
                    className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
                  >
                    + Add to Watchlist
                  </button>
                )}

                <AddToListDropdown showId={showId} />
              </div>
            )}
          </div>
        </div>

        {/* Cast */}
        {cast.length > 0 && (
          <div className="mt-10">
            <MovieCast cast={cast} />
          </div>
        )}

        {/* Image Gallery */}
        {images.length > 0 && (
          <div className="mt-10">
            <MovieImages images={images} />
          </div>
        )}
      </div>
    </div>
  );
}
