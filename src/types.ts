/**
 * Coordinate information for the current cell
 */
export interface Coord {
  x: number;
  y: number;
  index: number;
}

/**
 * Cell rendering properties for styling individual characters
 */
export interface Cell {
    char?: string | number;
    color?: string;
    backgroundColor?: string;
    fontWeight?: string | number;
}

/**
 * Font and layout metrics for the rendering canvas
 */
export interface Metrics {
    aspect: number;
    cellWidth: number;
    lineHeight: number;
    fontFamily: string;
    fontSize: number;
    _update: () => void;
}

/**
 * Canvas dimensions in pixels
 */
export interface CanvasSize {
    width: number;
    height: number;
}

/**
 * Canvas positioning offset (can be auto-centered)
 */
export interface CanvasOffset {
    x: number | 'auto';
    y: number | 'auto';
}

/**
 * Configuration settings for the play.core renderer
 */
export interface Settings {
    /** Target HTML element or canvas for rendering */
    element: HTMLElement | HTMLCanvasElement | null;
    /** Number of columns in the grid */
    cols: number;
    /** Number of rows in the grid */
    rows: number;
    /** Run only once instead of looping */
    once: boolean;
    /** Target frames per second */
    fps: number;
    /** Rendering engine to use */
    rendererType: 'canvas' | 'text';
    /** Allow text selection in the output */
    allowSelect: boolean;
    /** Restore previous state on init */
    restoreState: boolean;
    /** Default background color */
    backgroundColor?: string;
    /** Default text color */
    color?: string;
    /** Font family for rendering */
    fontFamily?: string;
    /** Font size for rendering */
    fontSize?: string;
    /** Font weight for rendering */
    fontWeight?: string | number;
    /** Letter spacing for text */
    letterSpacing?: string;
    /** Line height for text */
    lineHeight?: string;
    /** Text alignment */
    textAlign?: string;
    /** Canvas size override */
    canvasSize?: CanvasSize;
    /** Canvas position offset */
    canvasOffset?: CanvasOffset;
    /** Additional custom settings */
    [key: string]: any;
}

/**
 * Context information about the current frame/state
 */
export interface Context {
    /** Current frame number */
    frame: number;
    /** Elapsed time in milliseconds */
    time: number;
    /** Number of columns in the grid */
    cols: number;
    /** Number of rows in the grid */
    rows: number;
    /** Font and layout metrics */
    metrics: Metrics;
    /** Canvas width in pixels */
    width: number;
    /** Canvas height in pixels */
    height: number;
    /** Current settings configuration */
    settings: Settings;
    /** Runtime performance information */
    runtime: {
        /** Current animation cycle */
        cycle: number;
        /** Actual frames per second */
        fps: number;
    };
}

/**
 * Cursor position and interaction state
 */
export interface Cursor {
    /** Current cursor X position */
    x: number;
    /** Current cursor Y position */
    y: number;
    /** Whether mouse/touch is currently pressed */
    pressed: boolean;
    /** Previous cursor state */
    p: {
        x: number;
        y: number;
        pressed: boolean;
    };
}

/**
 * Buffer for reading previous frame data
 */
export interface Buffer {
    /** Get character at specific coordinate from previous frame */
    get: (x: number, y: number) => string;
}

/**
 * Main function signature that user scripts must implement
 * @returns A character or Cell to render at the current coordinate
 */
export type MainFunction = (
  coord: Coord,
  context: Context,
  cursor: Cursor,
  buffer: Buffer
) => string | Cell;

/**
 * Optional pre-render hook called before each frame
 */
export type PreFunction = (
  context: Context,
  cursor: Cursor,
  buffer: Buffer
) => void;

/**
 * Optional post-render hook called after each frame
 */
export type PostFunction = (
  context: Context,
  cursor: Cursor,
  buffer: Buffer
) => void;