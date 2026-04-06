import { useState, useRef, useEffect } from 'react';
import { useMovieStore } from '../../store/movieStore';

interface AddToListDropdownProps {
  showId: number;
}

export function AddToListDropdown({ showId }: AddToListDropdownProps) {
  const { customLists, addShowToList, removeShowFromList } = useMovieStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (listId: string, inList: boolean) => {
    if (inList) {
      removeShowFromList(listId, showId);
    } else {
      addShowToList(listId, showId);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        data-testid="add-to-list-trigger"
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
      >
        + Add to List
      </button>

      {open && (
        <div
          data-testid="add-to-list-menu"
          className="absolute left-0 top-full z-40 mt-2 w-64 rounded-xl border border-gray-700 bg-gray-900 py-1 shadow-xl"
        >
          {customLists.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500">No custom lists yet. Create one from My Lists.</p>
          ) : (
            customLists.map((list) => {
              const inList = list.showIds.includes(showId);
              return (
                <button
                  key={list.id}
                  data-testid={`add-to-list-option-${list.id}`}
                  onClick={() => toggle(list.id, inList)}
                  className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800"
                >
                  <span>{list.name}</span>
                  {inList && <span className="text-brand-400">&#10003;</span>}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
