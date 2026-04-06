import { Link } from 'react-router-dom';
import type { Show } from '../../types/movie';

interface Props {
  show: Show;
}

export function MovieCard({ show }: Props) {
  return (
    <Link
      to={`/show/${show.id}`}
      data-testid={`show-card-${show.id}`}
      className="group overflow-hidden rounded-xl border border-gray-800 bg-gray-900 transition-transform hover:scale-105 hover:border-brand-600"
    >
      <div className="aspect-[2/3] overflow-hidden bg-gray-800">
        {show.image?.medium ? (
        <img
          src={show.image.medium}
          alt={show.name}
          loading="lazy"
          data-testid={`show-card-poster-${show.id}`}
          className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
        />
        ) : (
          <div
            data-testid={`show-card-poster-${show.id}`}
            className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800 text-4xl"
          >
            📺
          </div>
        )}
      </div>
      <div className="p-3">
        <h3
          data-testid={`show-card-title-${show.id}`}
          className="truncate text-sm font-semibold text-white"
        >
          {show.name}
        </h3>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {show.premiered ? new Date(show.premiered).getFullYear() : '—'}
          </span>
          <span
            data-testid={`show-card-rating-${show.id}`}
            className="flex items-center gap-1 text-xs text-yellow-400"
          >
            ★ {show.rating.average?.toFixed(1) ?? 'N/A'}
          </span>
        </div>
      </div>
    </Link>
  );
}
