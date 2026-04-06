import { Link } from 'react-router-dom';
import type { WatchList } from '../../types/movie';

interface ListCardProps {
  list: WatchList;
}

export function ListCard({ list }: ListCardProps) {
  return (
    <Link
      to={`/lists/${list.id}`}
      data-testid={`list-card-${list.id}`}
      className="group block rounded-xl border border-gray-800 bg-gray-900 p-5 transition-colors hover:border-brand-600/50 hover:bg-gray-800"
    >
      <h3
        data-testid={`list-card-name-${list.id}`}
        className="mb-2 text-lg font-semibold text-white group-hover:text-brand-400"
      >
        {list.name}
      </h3>
      <div className="flex items-center justify-between text-sm text-gray-400">
        <span data-testid={`list-card-count-${list.id}`}>
          {list.showIds.length} {list.showIds.length === 1 ? 'show' : 'shows'}
        </span>
        <span>{new Date(list.createdAt).toLocaleDateString()}</span>
      </div>
    </Link>
  );
}
