import { useState } from 'react';
import { useMovieStore } from '../../store/movieStore';

interface RenameListInputProps {
  listId: string;
  currentName: string;
}

export function RenameListInput({ listId, currentName }: RenameListInputProps) {
  const { renameList } = useMovieStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName);

  const save = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== currentName) {
      renameList(listId, trimmed);
    } else {
      setName(currentName);
    }
    setEditing(false);
  };

  const cancel = () => {
    setName(currentName);
    setEditing(false);
  };

  if (!editing) {
    return (
      <h1
        data-testid="rename-list-display"
        onClick={() => setEditing(true)}
        className="cursor-pointer text-3xl font-bold text-white hover:text-brand-400"
        title="Click to rename"
      >
        {currentName}
      </h1>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <input
        data-testid="rename-list-input"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') cancel();
        }}
        autoFocus
        className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-2xl font-bold text-white focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
      />
      <button
        data-testid="rename-list-save"
        onClick={save}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
      >
        Save
      </button>
      <button
        data-testid="rename-list-cancel"
        onClick={cancel}
        className="rounded-lg bg-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-600"
      >
        Cancel
      </button>
    </div>
  );
}
