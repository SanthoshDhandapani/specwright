import { useState } from 'react';
import { useMovieStore } from '../../store/movieStore';

export function CreateListForm() {
  const { customLists, createList } = useMovieStore();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();

    if (!trimmed) {
      setError('List name cannot be empty.');
      return;
    }

    if (customLists.some((l) => l.name.toLowerCase() === trimmed.toLowerCase())) {
      setError('A list with that name already exists.');
      return;
    }

    createList(trimmed);
    setName('');
    setError(null);
  };

  return (
    <form data-testid="create-list-form" onSubmit={handleSubmit} className="flex items-start gap-3">
      <div className="flex-1">
        <input
          data-testid="create-list-input"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          placeholder="New list name..."
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
        />
        {error && (
          <p data-testid="create-list-error" className="mt-1 text-sm text-red-400">
            {error}
          </p>
        )}
      </div>
      <button
        data-testid="create-list-submit"
        type="submit"
        className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Create
      </button>
    </form>
  );
}
