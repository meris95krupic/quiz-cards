import { create } from 'zustand';
import type { QuickPlayer } from '../types';
import { getQuickPlayers, saveQuickPlayers } from '../utils/localStorage';
import { generateId } from '../utils/uuid';

interface PlayersState {
  players: QuickPlayer[];
  selectedPlayerIds: string[];
  addPlayer: (name: string, avatarId: number) => QuickPlayer;
  removePlayer: (id: string) => void;
  toggleSelectPlayer: (id: string) => void;
  setSelectedPlayerIds: (ids: string[]) => void;
  clearSelection: () => void;
  loadFromStorage: () => void;
}

export const usePlayersStore = create<PlayersState>((set, get) => ({
  players: [],
  selectedPlayerIds: [],

  loadFromStorage: () => {
    const players = getQuickPlayers();
    set({ players });
  },

  addPlayer: (name, avatarId) => {
    const player: QuickPlayer = { id: generateId(), name, avatarId };
    const players = [...get().players, player];
    saveQuickPlayers(players);
    set({ players });
    return player;
  },

  removePlayer: (id) => {
    const players = get().players.filter((p) => p.id !== id);
    const selectedPlayerIds = get().selectedPlayerIds.filter((sid) => sid !== id);
    saveQuickPlayers(players);
    set({ players, selectedPlayerIds });
  },

  toggleSelectPlayer: (id) => {
    const selected = get().selectedPlayerIds;
    const next = selected.includes(id)
      ? selected.filter((sid) => sid !== id)
      : [...selected, id];
    set({ selectedPlayerIds: next });
  },

  setSelectedPlayerIds: (ids) => set({ selectedPlayerIds: ids }),

  clearSelection: () => set({ selectedPlayerIds: [] }),
}));
