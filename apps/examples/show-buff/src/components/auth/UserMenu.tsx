import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';

export function UserMenu() {
  const { user, signOut } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        data-testid="user-menu-trigger"
        className="flex items-center gap-2 rounded-full border border-gray-700 p-1 pr-3 hover:bg-gray-800"
      >
        <img
          src={user.picture}
          alt={user.name}
          referrerPolicy="no-referrer"
          className="h-8 w-8 rounded-full"
          data-testid="user-avatar"
        />
        <span className="text-sm text-gray-200" data-testid="user-display-name">
          {user.name}
        </span>
      </button>

      {open && (
        <div
          data-testid="user-menu-dropdown"
          className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-gray-700 bg-gray-900 py-1 shadow-xl"
        >
          <div className="border-b border-gray-700 px-4 py-2">
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
          <button
            onClick={() => { signOut(); setOpen(false); }}
            data-testid="user-menu-signout"
            className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-800"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
