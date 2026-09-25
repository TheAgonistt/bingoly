import { ref, computed, watch } from 'vue';
import type {
  BingoCell,
  BingoConfig,
  GridDimension,
  AppMode,
  CellUpdate,
} from '@/types/bingo';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

let counter = 0;

function uid(): string {
  counter += 1;
  return `cell-${Date.now().toString(36)}-${counter.toString(36)}`;
}

function createCell(overrides: Partial<BingoCell> = {}): BingoCell {
  return {
    id: uid(),
    text: '',
    imageUrl: null,
    imageFit: 'cover',
    isLocked: false,
    isFreeSpace: false,
    fontSize: null,
    marked: false,
    wordBreak: true,
    ...overrides,
  };
}

function defaultHeaderLetters(size: GridDimension): string[] {
  const letters = 'BINGO'.split('');
  if (size <= 5) return letters.slice(0, size);
  // For 6 & 7 pad with extra characters
  const extras = ['!', '★'];
  return [...letters, ...extras].slice(0, size);
}

function centerIndex(size: GridDimension): number | null {
  return size % 2 === 1 ? Math.floor((size * size) / 2) : null;
}

function defaultConfig(): BingoConfig {
  return {
    title: 'BINGO',
    subtitle: '',
    subtitleFontSize: 14,
    subtitleColor: '#475569',
    gridSize: 5,
    hasHeader: true,
    headerLetters: defaultHeaderLetters(5),
    showFreeSpace: true,
    freeSpaceText: '★',
    wordBreak: true,
    theme: {
      primaryColor: '#6c5ce7',
      cardBackground: '#ffffff',
      cellBackground: '#f8f9fa',
      cellBorderColor: '#dee2e6',
      textColor: '#1a1a2e',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      borderRadius: '8px',
    },
  };
}

function buildCells(size: GridDimension, freeSpaceText: string, showFreeSpace: boolean): BingoCell[] {
  const total = size * size;
  const center = showFreeSpace ? centerIndex(size) : null;
  const cells: BingoCell[] = [];
  for (let i = 0; i < total; i++) {
    if (center !== null && i === center) {
      cells.push(
        createCell({ text: freeSpaceText, isFreeSpace: true, isLocked: true }),
      );
    } else {
      cells.push(createCell());
    }
  }
  return cells;
}

/* ------------------------------------------------------------------ */
/*  Persistence                                                        */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'bingo-card-state-v1';

interface PersistedState {
  config: BingoConfig;
  cells: BingoCell[];
}

function loadState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed.cells || !parsed.config) return null;
    // Merge defaults for any fields added after initial save (backwards compat)
    parsed.config = { ...defaultConfig(), ...parsed.config };
    return parsed;
  } catch {
    return null;
  }
}

function saveState(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

/**
 * Fisher-Yates shuffle (in-place) on a shallow copy of the provided array.
 * Returns the new shuffled array.
 */
function fisherYatesShuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = result[i]!;
    result[i] = result[j]!;
    result[j] = tmp;
  }
  return result;
}

/* ------------------------------------------------------------------ */
/*  Composable                                                         */
/* ------------------------------------------------------------------ */

export function useBingoGrid() {
  // Restore from localStorage if available, otherwise use defaults
  const saved = loadState();

  const config = ref<BingoConfig>(saved?.config ?? defaultConfig());
  const cells = ref<BingoCell[]>(
    saved?.cells ?? buildCells(config.value.gridSize, config.value.freeSpaceText, config.value.showFreeSpace),
  );
  const mode = ref<AppMode>('design'); // never persist mode — always start in design

  // Auto-save whenever cells or config change (debounced to avoid write-on-every-keystroke)
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveState({ config: config.value, cells: cells.value });
    }, 500);
  }

  watch([cells, config], scheduleSave, { deep: true });

  /* ---------- derived ---------- */

  const totalCells = computed(() => config.value.gridSize * config.value.gridSize);

  const unlockedIndices = computed(() =>
    cells.value
      .map((c, i) => (c.isLocked ? -1 : i))
      .filter((i) => i !== -1),
  );

  /* ---------- grid size ---------- */

  function setGridSize(size: GridDimension): void {
    config.value.gridSize = size;
    config.value.headerLetters = defaultHeaderLetters(size);
    cells.value = buildCells(size, config.value.freeSpaceText, config.value.showFreeSpace);
  }

  /* ---------- cell CRUD ---------- */

  function findIndex(id: string): number {
    return cells.value.findIndex((c) => c.id === id);
  }

  function updateCell(id: string, payload: CellUpdate): void {
    const idx = findIndex(id);
    if (idx === -1) return;
    const cell = cells.value[idx]!;
    cells.value[idx] = { ...cell, ...payload };
  }

  function toggleLock(id: string): void {
    const idx = findIndex(id);
    if (idx === -1) return;
    const cell = cells.value[idx]!;
    cells.value[idx] = { ...cell, isLocked: !cell.isLocked };
  }

  function toggleMark(id: string): void {
    const idx = findIndex(id);
    if (idx === -1) return;
    const cell = cells.value[idx]!;
    cells.value[idx] = { ...cell, marked: !cell.marked };
  }

  function swapCells(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex) return;
    const a = cells.value[fromIndex];
    const b = cells.value[toIndex];
    if (!a || !b) return;
    cells.value[fromIndex] = b;
    cells.value[toIndex] = a;
  }

  /* ---------- shuffle ---------- */

  function shuffleGrid(): void {
    const current = [...cells.value];
    // Extract unlocked cells
    const unlocked: BingoCell[] = [];
    const lockedMap = new Map<number, BingoCell>();

    current.forEach((cell, i) => {
      if (cell.isLocked || cell.isFreeSpace) {
        lockedMap.set(i, cell);
      } else {
        unlocked.push(cell);
      }
    });

    const shuffled = fisherYatesShuffle(unlocked);
    let shuffleIdx = 0;
    const result: BingoCell[] = [];

    for (let i = 0; i < current.length; i++) {
      const locked = lockedMap.get(i);
      if (locked) {
        result.push(locked);
      } else {
        result.push(shuffled[shuffleIdx]!);
        shuffleIdx++;
      }
    }

    cells.value = result;
  }

  /* ---------- bulk / auto-populate ---------- */

  function autoPopulate(items: string[]): void {
    const shuffledItems = fisherYatesShuffle(items);
    let itemIdx = 0;

    cells.value = cells.value.map((cell) => {
      if (cell.isLocked || cell.isFreeSpace) return cell;
      const text = shuffledItems[itemIdx] ?? '';
      itemIdx++;
      return { ...cell, text };
    });
  }

  function generateBatchCards(count: number): BingoCell[][] {
    const batch: BingoCell[][] = [];
    for (let n = 0; n < count; n++) {
      const current = [...cells.value];
      const unlocked: BingoCell[] = [];
      const lockedMap = new Map<number, BingoCell>();

      current.forEach((cell, i) => {
        if (cell.isLocked || cell.isFreeSpace) {
          lockedMap.set(i, cell);
        } else {
          unlocked.push(cell);
        }
      });

      const shuffled = fisherYatesShuffle(unlocked);
      let shuffleIdx = 0;
      const result: BingoCell[] = [];

      for (let i = 0; i < current.length; i++) {
        const locked = lockedMap.get(i);
        if (locked) {
          result.push({ ...locked, id: uid() });
        } else {
          result.push({ ...shuffled[shuffleIdx]!, id: uid() });
          shuffleIdx++;
        }
      }

      batch.push(result);
    }
    return batch;
  }

  /* ---------- free space ---------- */

  function updateFreeSpace(): void {
    const size = config.value.gridSize;
    const center = config.value.showFreeSpace ? centerIndex(size) : null;

    cells.value = cells.value.map((cell, i) => {
      if (center !== null && i === center) {
        return {
          ...cell,
          isFreeSpace: true,
          isLocked: true,
          text: config.value.freeSpaceText,
        };
      }
      if (cell.isFreeSpace) {
        return { ...cell, isFreeSpace: false, isLocked: false };
      }
      return cell;
    });
  }

  /* ---------- mode ---------- */

  function toggleMode(): void {
    mode.value = mode.value === 'design' ? 'play' : 'design';
    // Reset marks when switching to design
    if (mode.value === 'design') {
      cells.value = cells.value.map((c) => ({ ...c, marked: false }));
    }
  }

  /* ---------- fill with custom words ---------- */

  function fillWithWords(words: string[]): void {
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    let wordIdx = 0;
    cells.value = cells.value.map((cell) => {
      if (cell.isFreeSpace || cell.isLocked) return cell;
      const text = wordIdx < shuffled.length ? (shuffled[wordIdx++] ?? '') : '';
      return { ...cell, text };
    });
  }

  /* ---------- clear ---------- */

  function clearAll(): void {
    cells.value = buildCells(
      config.value.gridSize,
      config.value.freeSpaceText,
      config.value.showFreeSpace,
    );
  }

  function resetToDefault(): void {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    config.value = defaultConfig();
    cells.value = buildCells(
      config.value.gridSize,
      config.value.freeSpaceText,
      config.value.showFreeSpace,
    );
  }

  return {
    // state
    config,
    cells,
    mode,
    // derived
    totalCells,
    unlockedIndices,
    // methods
    setGridSize,
    updateCell,
    toggleLock,
    toggleMark,
    swapCells,
    shuffleGrid,
    autoPopulate,
    fillWithWords,
    generateBatchCards,
    updateFreeSpace,
    toggleMode,
    clearAll,
    resetToDefault,
  };
}
