import { MovieCard } from './MovieCard';
import type { Show } from '../../types/movie';

interface Props {
  shows: Show[];
}

export function MovieGrid({ shows }: Props) {
  if (shows.length === 0) {
    return (
      <div className="py-20 text-center text-gray-500" data-testid="show-grid-empty">
        No shows found for this year.
      </div>
    );
  }

  return (
    <div
      data-testid="show-grid"
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
    >
      {shows.map((show) => (
        <MovieCard key={show.id} show={show} />
      ))}
    </div>
  );
}
