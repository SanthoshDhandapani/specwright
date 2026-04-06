import { create } from 'zustand';
import type { WatchList } from '../types/movie';

const STORAGE_KEY = 'specwright-show-data';

interface ShowState {
  favorites: number[];
  watchlist: number[];
  customLists: WatchList[];
  addFavorite: (id: number) => void;
  removeFavorite: (id: number) => void;
  isFavorite: (id: number) => boolean;
  addToWatchlist: (id: number) => void;
  removeFromWatchlist: (id: number) => void;
  isInWatchlist: (id: number) => boolean;
  createList: (name: string) => WatchList;
  renameList: (id: string, name: string) => void;
  deleteList: (id: string) => void;
  addShowToList: (listId: string, showId: number) => void;
  removeShowFromList: (listId: string, showId: number) => void;
  getListsForShow: (showId: number) => WatchList[];
  hydrate: () => void;
}

function persist(favorites: number[], watchlist: number[], customLists: WatchList[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ favorites, watchlist, customLists }));
}

export const useMovieStore = create<ShowState>((set, get) => ({
  favorites: [],
  watchlist: [],
  customLists: [],

  addFavorite: (id) => {
    set((s) => {
      const favorites = [...s.favorites, id];
      persist(favorites, s.watchlist, s.customLists);
      return { favorites };
    });
  },

  removeFavorite: (id) => {
    set((s) => {
      const favorites = s.favorites.filter((fid) => fid !== id);
      persist(favorites, s.watchlist, s.customLists);
      return { favorites };
    });
  },

  isFavorite: (id) => get().favorites.includes(id),

  addToWatchlist: (id) => {
    set((s) => {
      const watchlist = [...s.watchlist, id];
      persist(s.favorites, watchlist, s.customLists);
      return { watchlist };
    });
  },

  removeFromWatchlist: (id) => {
    set((s) => {
      const watchlist = s.watchlist.filter((wid) => wid !== id);
      persist(s.favorites, watchlist, s.customLists);
      return { watchlist };
    });
  },

  isInWatchlist: (id) => get().watchlist.includes(id),

  createList: (name) => {
    const newList: WatchList = {
      id: crypto.randomUUID(),
      name,
      showIds: [],
      createdAt: Date.now(),
    };
    set((s) => {
      const customLists = [...s.customLists, newList];
      persist(s.favorites, s.watchlist, customLists);
      return { customLists };
    });
    return newList;
  },

  renameList: (id, name) => {
    set((s) => {
      const customLists = s.customLists.map((l) => (l.id === id ? { ...l, name } : l));
      persist(s.favorites, s.watchlist, customLists);
      return { customLists };
    });
  },

  deleteList: (id) => {
    set((s) => {
      const customLists = s.customLists.filter((l) => l.id !== id);
      persist(s.favorites, s.watchlist, customLists);
      return { customLists };
    });
  },

  addShowToList: (listId, showId) => {
    set((s) => {
      const customLists = s.customLists.map((l) =>
        l.id === listId && !l.showIds.includes(showId)
          ? { ...l, showIds: [...l.showIds, showId] }
          : l,
      );
      persist(s.favorites, s.watchlist, customLists);
      return { customLists };
    });
  },

  removeShowFromList: (listId, showId) => {
    set((s) => {
      const customLists = s.customLists.map((l) =>
        l.id === listId ? { ...l, showIds: l.showIds.filter((sid) => sid !== showId) } : l,
      );
      persist(s.favorites, s.watchlist, customLists);
      return { customLists };
    });
  },

  getListsForShow: (showId) => get().customLists.filter((l) => l.showIds.includes(showId)),

  hydrate: () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored) as { favorites: number[]; watchlist: number[]; customLists?: WatchList[] };
        set({
          favorites: data.favorites || [],
          watchlist: data.watchlist || [],
          customLists: data.customLists || [],
        });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  },
}));
