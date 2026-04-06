import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getShowDetail } from '../api/tmdb';
import { useMovieStore } from '../store/movieStore';
import { RenameListInput } from '../components/lists/RenameListInput';
import { DeleteListDialog } from '../components/lists/DeleteListDialog';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import type { Show } from '../types/movie';

export function ListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { customLists, deleteList, removeShowFromList } = useMovieStore();

  const list = customLists.find((l) => l.id === id);

  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (!list || list.showIds.length === 0) {
      setShows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all(list.showIds.map((sid) => getShowDetail(sid)))
      .then((details) => {
        setShows(details);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [list?.showIds.length]);

  if (!list) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <p className="text-lg text-gray-500">List not found.</p>
      </div>
    );
  }

  const handleDelete = () => {
    deleteList(list.id);
    navigate('/lists');
  };

  const handleRemoveShow = (showId: number) => {
    removeShowFromList(list.id, showId);
    setShows((prev) => prev.filter((s) => s.id !== showId));
  };

  return (
    <div data-testid="page-list-detail" className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <RenameListInput listId={list.id} currentName={list.name} />
          <span className="rounded-full bg-brand-600 px-3 py-1 text-sm text-white">
            {list.showIds.length} {list.showIds.length === 1 ? 'show' : 'shows'}
          </span>
        </div>
        <button
          data-testid="btn-delete-list"
          onClick={() => setShowDeleteDialog(true)}
          className="rounded-lg bg-red-900/50 px-4 py-2 text-sm text-red-300 hover:bg-red-900"
        >
          Delete List
        </button>
      </div>

      {loading && <LoadingSpinner />}

      {!loading && list.showIds.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-lg text-gray-500">This list is empty.</p>
          <p className="mt-2 text-sm text-gray-600">Browse shows and add them to this list.</p>
        </div>
      )}

      {!loading && shows.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {shows.map((show) => (
            <div key={show.id} className="group relative">
              <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
                {show.image?.medium ? (
                  <img src={show.image.medium} alt={show.name} className="h-64 w-full object-cover" />
                ) : (
                  <div className="flex h-64 items-center justify-center bg-gray-800 text-gray-500">No Image</div>
                )}
                <div className="p-3">
                  <h3 className="truncate text-sm font-medium text-white">{show.name}</h3>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-yellow-400">
                      {show.rating.average ? `★ ${show.rating.average.toFixed(1)}` : 'N/A'}
                    </span>
                    <button
                      data-testid={`remove-show-${show.id}`}
                      onClick={() => handleRemoveShow(show.id)}
                      className="rounded bg-red-900/50 px-2 py-1 text-xs text-red-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-900"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDeleteDialog && (
        <DeleteListDialog
          listName={list.name}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteDialog(false)}
        />
      )}
    </div>
  );
}
