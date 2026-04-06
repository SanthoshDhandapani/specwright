import { useMovieStore } from '../store/movieStore';
import { CreateListForm } from '../components/lists/CreateListForm';
import { ListCard } from '../components/lists/ListCard';

export function ListsPage() {
  const { customLists } = useMovieStore();

  return (
    <div data-testid="page-lists" className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-6 text-3xl font-bold text-white">My Lists</h1>
        <CreateListForm />
      </div>

      {customLists.length === 0 ? (
        <div data-testid="lists-empty-state" className="py-20 text-center">
          <p className="text-lg text-gray-500">No custom lists yet.</p>
          <p className="mt-2 text-sm text-gray-600">Create your first list above to start organizing shows.</p>
        </div>
      ) : (
        <div data-testid="lists-grid" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {customLists.map((list) => (
            <ListCard key={list.id} list={list} />
          ))}
        </div>
      )}
    </div>
  );
}
