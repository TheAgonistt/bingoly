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
  /** Dauber mark state in play mode. */
  marked: boolean;
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
  gridSize: GridDimension;
  hasHeader: boolean;
  headerLetters: string[];
  theme: CardTheme;
  freeSpaceText: string;
  showFreeSpace: boolean;
}

/** The two application modes. */
export type AppMode = 'design' | 'play';

/** Payload emitted when a cell is partially updated. */
export type CellUpdate = Partial<Omit<BingoCell, 'id'>>;

/** Supported image-export formats. */
export type ImageFormat = 'png' | 'jpeg';
