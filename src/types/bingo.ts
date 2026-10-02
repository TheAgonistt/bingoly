/** Valid grid dimensions for the bingo board. */
export type GridDimension = 3 | 4 | 5 | 6 | 7;

/** A single cell on the bingo board. */
export interface BingoCell {
  /** Unique identifier (nanoid-style). */
  id: string;
  /** Display text inside the cell. */
  text: string;
  /** Optional image — Base64 data-URL or blob URL. */
  imageUrl: string | null;
  /** How the image fits inside the cell. */
  imageFit: 'contain' | 'cover';
  /** When true the cell keeps its position during shuffle. */
  isLocked: boolean;
  /** Whether this cell is the centre free-space. */
  isFreeSpace: boolean;
  /** Per-cell font size in px. null = auto-fit based on text length. */
  fontSize: number | null;
  /** Dauber mark state in play mode. */
  marked: boolean;
  /** Whether words can break mid-word. Default: true. */
  wordBreak?: boolean;
}

/** Runtime theme applied via CSS custom properties. */
export interface CardTheme {
  primaryColor: string;
  cardBackground: string;
  cellBackground: string;
  cellBorderColor: string;
  textColor: string;
  fontFamily: string;
  borderRadius: string;
}

/** Top-level configuration for the bingo card. */
export interface BingoConfig {
  title: string;
  subtitle: string;
  subtitleFontSize: number;   // px
  subtitleColor: string;      // CSS colour string
  gridSize: GridDimension;
  hasHeader: boolean;
  headerLetters: string[];
  theme: CardTheme;
  freeSpaceText: string;
  showFreeSpace: boolean;
  /** Default word-break behavior for cells. Default: true. */
  wordBreak?: boolean;
  /** Pool of extra words/phrases available when generating randomized export cards. */
  wordBank: string[];
  /** Calling mode for the bingo caller: classic coordinates, current board cells, or custom word list. */
  callerMode?: CallerMode;
  /** Numbers per column in classic bingo mode (default: 15 for 75-ball: 1-15, 16-30, ...). */
  callerNumbersPerCol?: number;
  /** Custom list of words/phrases for caller in 'custom' mode. */
  callerCustomList?: string[];
  /** In custom caller mode, allow items to be drawn multiple times indefinitely. */
  callerAllowDuplicates?: boolean;
}

/** Supported modes for the Bingo Caller. */
export type CallerMode = 'classic' | 'board' | 'custom';

/** The two application modes. */
export type AppMode = 'design' | 'play';

/** Payload emitted when a cell is partially updated. */
export type CellUpdate = Partial<Omit<BingoCell, 'id'>>;

/** Supported image-export formats. */
export type ImageFormat = 'png' | 'jpeg';
