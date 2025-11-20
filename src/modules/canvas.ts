/**
 * @module   canvas.ts
 * @desc     A wrapper for a canvas element
 * @category public
 *
 * A canvas 'wrapper' class.
 * The purpose is to offer a ready to use buffer (a "pixel" array
 * of {r, g, b, a, v} objects) of the same size of the ASCII context (or not)
 * which can be read or sampled.
 * Some convenience functions are provided.
 *
 * Resizes the canvas:
 * - resize(w, h)
 *
 * Five main functions are implemented to copy a source (canvas, video, image)
 * to the internal canvas:
 * - image(source)  // resizes the canvas to the source image and copies it
 * - copy(source, ...)
 * - cover(source, ...)
 * - fit(source, ...)
 * - center(source, ...)
 *
 * A call to these functions will also update the internal 'pixels' array through:
 * - loadPixels()
 *
 * A few extra functions are provided to manipulate the array directly:
 * - mirrorX()
 * - normalize() // only v values
 * - quantize()
 *
 * Finally the whole buffer can be copied to a destination through:
 * - writeTo()
 *
 * Or accessed with:
 * - get(x, y)
 * - sample(x, y)
 */

import { map, mix } from './num';

/**
 * Mode symbols for image positioning
 */
export const MODE_COVER = Symbol('cover');
export const MODE_FIT = Symbol('fit');
export const MODE_CENTER = Symbol('center');

/**
 * Image positioning mode type
 */
export type ImageMode = typeof MODE_COVER | typeof MODE_FIT | typeof MODE_CENTER;

/**
 * Pixel color data with RGBA and grayscale value
 */
export interface Pixel {
	r: number;
	g: number;
	b: number;
	a: number;
	v: number;
}

/**
 * Valid image source types for canvas operations
 */
export type ImageSource = HTMLCanvasElement | HTMLVideoElement | HTMLImageElement;

/**
 * Element size
 */
interface ElementSize {
	width: number;
	height: number;
}

const BLACK: Pixel = { r: 0, g: 0, b: 0, a: 1, v: 0 };
const WHITE: Pixel = { r: 255, g: 255, b: 255, a: 1, v: 1 };

/**
 * Canvas wrapper class for pixel manipulation and image processing
 */
export default class Canvas {
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	pixels: Pixel[];

	/**
	 * Creates a new Canvas wrapper
	 * @param sourceCanvas - Optional existing canvas element to wrap
	 */
	constructor(sourceCanvas?: HTMLCanvasElement) {
		this.canvas = sourceCanvas || document.createElement('canvas');

		// Initialize the canvas as a black 1x1 image so it can be used
		this.canvas.width = 1;
		this.canvas.height = 1;
		this.ctx = this.canvas.getContext('2d')!;
		this.ctx.putImageData(this.ctx.createImageData(1, 1), 0, 0);

		// A flat buffer to store image data
		// in the form of {r, g, b, a, v}
		this.pixels = [];
		this.loadPixels();
	}

	get width(): number {
		return this.canvas.width;
	}

	get height(): number {
		return this.canvas.height;
	}

	// -- Functions that act on the canvas -------------------------------------

	/**
	 * Resizes the canvas to the specified dimensions
	 */
	resize(dWidth: number, dHeight: number): this {
		this.canvas.width = dWidth;
		this.canvas.height = dHeight;
		this.pixels.length = 0;
		return this;
	}

	/**
	 * Copies the source canvas or video element to dest via drawImage
	 * Allows distortion, offsets, etc.
	 */
	copy(
		source: ImageSource,
		sx?: number,
		sy?: number,
		sWidth?: number,
		sHeight?: number,
		dx?: number,
		dy?: number,
		dWidth?: number,
		dHeight?: number
	): this {
		sx = sx ?? 0;
		sy = sy ?? 0;
		sWidth = sWidth ?? ('videoWidth' in source ? source.videoWidth : source.width);
		sHeight = sHeight ?? ('videoHeight' in source ? source.videoHeight : source.height);

		dx = dx ?? 0;
		dy = dy ?? 0;
		dWidth = dWidth ?? this.canvas.width;
		dHeight = dHeight ?? this.canvas.height;

		this.ctx.drawImage(source, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
		this.loadPixels();

		return this;
	}

	/**
	 * Resizes the canvas to the size of the source image
	 * and paints the image on it
	 */
	image(source: ImageSource): this {
		const w = 'videoWidth' in source ? source.videoWidth : source.width;
		const h = 'videoHeight' in source ? source.videoHeight : source.height;
		this.resize(w, h);
		this.copy(source, 0, 0, w, h, 0, 0, w, h);
		return this;
	}

	/**
	 * Covers the destination canvas with the source image
	 * without resizing the canvas.
	 * An optional aspect factor can be passed.
	 */
	cover(source: ImageSource, aspect: number = 1): this {
		centerImage(source, this.canvas, 1, aspect, MODE_COVER);
		this.loadPixels();
		return this;
	}

	/**
	 * Fits the source image on the destination canvas
	 * without resizing the canvas.
	 * An optional aspect factor can be passed.
	 */
	fit(source: ImageSource, aspect: number = 1): this {
		centerImage(source, this.canvas, 1, aspect, MODE_FIT);
		this.loadPixels();
		return this;
	}

	/**
	 * Centers the source image on the destination canvas
	 * without resizing the canvas.
	 * Optional scaling factors can be passed.
	 */
	center(source: ImageSource, scaleX: number = 1, scaleY: number = 1): this {
		centerImage(source, this.canvas, scaleX, scaleY, MODE_CENTER);
		this.loadPixels();
		return this;
	}

	// -- Functions that act directly on the pixel array -----------------------

	/**
	 * Mirrors the pixel array horizontally
	 */
	mirrorX(): this {
		const w = this.canvas.width;
		const h = this.canvas.height;
		const buf = this.pixels;
		const half = Math.floor(w / 2);
		for (let j = 0; j < h; j++) {
			for (let i = 0; i < half; i++) {
				const a = w * j + i;
				const b = w * (j + 1) - i - 1;
				const t = buf[b];
				buf[b] = buf[a];
				buf[a] = t;
			}
		}
		return this;
	}

	/**
	 * Normalizes the grayscale values in the pixel array (auto levels)
	 */
	normalize(): this {
		normalizeGray(this.pixels, this.pixels, 0.0, 1.0);
		return this;
	}

	/**
	 * Quantizes the pixel array to match a provided color palette
	 */
	quantize(palette: Pixel[]): this {
		paletteQuantize(this.pixels, this.pixels, palette);
		return this;
	}

	// -- Getters (pixel array) ------------------------------------------------

	/**
	 * Get color at coordinate
	 * Returns BLACK if coordinates are out of bounds
	 */
	get(x: number, y: number): Pixel {
		if (x < 0 || x >= this.canvas.width) return BLACK;
		if (y < 0 || y >= this.canvas.height) return BLACK;
		return this.pixels[x + y * this.canvas.width];
	}

	/**
	 * Sample value at normalized coordinate (0-1) with bilinear interpolation
	 * @param sx - Normalized x coordinate (0-1)
	 * @param sy - Normalized y coordinate (0-1)
	 * @param gray - If true, only returns grayscale interpolation (faster)
	 * @returns Interpolated pixel value or grayscale number
	 */
	sample(sx: number, sy: number, gray?: false): Pixel;
	sample(sx: number, sy: number, gray: true): number;
	sample(sx: number, sy: number, gray: boolean = false): Pixel | number {
		const w = this.canvas.width;
		const h = this.canvas.height;

		const x = sx * w - 0.5;
		const y = sy * h - 0.5;

		let l = Math.floor(x);
		let b = Math.floor(y);
		let r = l + 1;
		let t = b + 1;
		const lr = x - l;
		const bt = y - b;

		// Instead of clamping use safe "get()"
		// l = clamp(l, 0, w - 1) // left
		// r = clamp(r, 0, w - 1) // right
		// b = clamp(b, 0, h - 1) // bottom
		// t = clamp(t, 0, h - 1) // top

		// Avoid 9 extra interpolations if only gray is needed
		if (gray) {
			const p1 = mix(this.get(l, b).v, this.get(r, b).v, lr);
			const p2 = mix(this.get(l, t).v, this.get(r, t).v, lr);
			return mix(p1, p2, bt);
		} else {
			const p1 = mixColors(this.get(l, b), this.get(r, b), lr);
			const p2 = mixColors(this.get(l, t), this.get(r, t), lr);
			return mixColors(p1, p2, bt);
		}
	}

	/**
	 * Reads pixel data from canvas into the pixels array
	 */
	loadPixels(): this {
		// New data could be shorter,
		// empty without losing the ref.
		this.pixels.length = 0;
		const w = this.canvas.width;
		const h = this.canvas.height;
		const data = this.ctx.getImageData(0, 0, w, h).data;
		let idx = 0;
		for (let i = 0; i < data.length; i += 4) {
			const r = data[i];
			const g = data[i + 1];
			const b = data[i + 2];
			const a = data[i + 3] / 255.0; // CSS style
			this.pixels[idx++] = {
				r,
				g,
				b,
				a,
				v: toGray(r, g, b)
			};
		}
		return this;
	}

	// -- Helpers --------------------------------------------------------------

	/**
	 * Writes the pixel array to a target buffer
	 */
	writeTo(buf: Pixel[]): this {
		if (Array.isArray(buf)) {
			for (let i = 0; i < this.pixels.length; i++) buf[i] = this.pixels[i];
		}
		return this;
	}

	// Debug -------------------------------------------------------------------

	/**
	 * Attaches the canvas to a target element for debug purposes
	 */
	display(target?: HTMLElement, x: number = 0, y: number = 0): void {
		target = target || document.body;
		this.canvas.style.position = 'absolute';
		this.canvas.style.left = x + 'px';
		this.canvas.style.top = y + 'px';
		this.canvas.style.width = 'auto';
		this.canvas.style.height = 'auto';
		this.canvas.style.zIndex = '10';
		document.body.appendChild(this.canvas);
	}
}

// Helpers ---------------------------------------------------------------------

/**
 * Linearly interpolates between two colors
 */
function mixColors(a: Pixel, b: Pixel, amt: number): Pixel {
	return {
		r: mix(a.r, b.r, amt),
		g: mix(a.g, b.g, amt),
		b: mix(a.b, b.b, amt),
		a: mix(a.a, b.a, amt),
		v: mix(a.v, b.v, amt)
	};
}

/**
 * Gets the width and height of an image source element
 */
function getElementSize(source: ImageSource): ElementSize {
	const type = source.nodeName;
	const width = type === 'VIDEO' ? (source as HTMLVideoElement).videoWidth : source.width || 0;
	const height = type === 'VIDEO' ? (source as HTMLVideoElement).videoHeight : source.height || 0;
	return { width, height };
}

/**
 * Centers, covers, or fits an image source on a target canvas
 */
function centerImage(
	sourceCanvas: ImageSource,
	targetCanvas: HTMLCanvasElement,
	scaleX: number = 1,
	scaleY: number = 1,
	mode: ImageMode = MODE_CENTER
): void {
	// Source size
	const s = getElementSize(sourceCanvas);

	// Source aspect (scaled)
	const sa = (scaleX * s.width) / (s.height * scaleY);

	// Target size and aspect
	const tw = targetCanvas.width;
	const th = targetCanvas.height;
	const ta = tw / th;

	// Destination width and height (adjusted for cover / fit)
	let dw: number, dh: number;

	// Cover the entire dest canvas with image content
	if (mode === MODE_COVER) {
		if (sa > ta) {
			dw = th * sa;
			dh = th;
		} else {
			dw = tw;
			dh = tw / sa;
		}
	}
	// Fit the entire source image in dest canvas (with black bars)
	else if (mode === MODE_FIT) {
		if (sa > ta) {
			dw = tw;
			dh = tw / sa;
		} else {
			dw = th * sa;
			dh = th;
		}
	}
	// Center the image
	else {
		dw = s.width * scaleX;
		dh = s.height * scaleY;
	}

	// Update the targetCanvas with correct aspect ratios
	const ctx = targetCanvas.getContext('2d')!;

	// Fill the canvas in case of 'fit'
	ctx.fillStyle = 'black';
	ctx.fillRect(0, 0, tw, th);
	ctx.save();
	ctx.translate(tw / 2, th / 2);
	ctx.drawImage(sourceCanvas, -dw / 2, -dh / 2, dw, dh);
	ctx.restore();
}

/**
 * Converts RGB values to grayscale using standard luminance formula
 * @see https://en.wikipedia.org/wiki/Grayscale
 */
function toGray(r: number, g: number, b: number): number {
	return Math.round(r * 0.2126 + g * 0.7152 + b * 0.0722) / 255.0;
}

/**
 * Quantizes colors to the nearest color in a palette
 * Uses Redmean color difference algorithm
 */
function paletteQuantize(arrayIn: Pixel[], arrayOut: Pixel[], palette: Pixel[]): Pixel[] {
	arrayOut = arrayOut || [];

	// Euclidean:
	// const distFn = (a: Pixel, b: Pixel) => Math.pow(a.r - b.r, 2) + Math.pow(a.g - b.g, 2) + Math.pow(a.b - b.b, 2)

	// Redmean:
	// https://en.wikipedia.org/wiki/Color_difference
	const distFn = (a: Pixel, b: Pixel): number => {
		const r = (a.r + b.r) * 0.5;
		let s = 0;
		s += (2 + r / 256) * Math.pow(a.r - b.r, 2);
		s += 4 * Math.pow(a.g - b.g, 2);
		s += (2 + (255 - r) / 256) * Math.pow(a.b - b.b, 2);
		return Math.sqrt(s);
	};

	for (let i = 0; i < arrayIn.length; i++) {
		const a = arrayIn[i];
		let dist = Number.MAX_VALUE;
		let nearest: Pixel = BLACK;
		for (const b of palette) {
			const d = distFn(a, b);
			if (d < dist) {
				dist = d;
				nearest = b;
			}
		}
		arrayOut[i] = { ...nearest, v: arrayIn[i].v }; // Keep the original gray value intact
	}
	return arrayOut;
}

/**
 * Normalizes the gray component (auto levels)
 */
function normalizeGray(
	arrayIn: Pixel[],
	arrayOut: Pixel[],
	lower: number = 0.0,
	upper: number = 1.0
): Pixel[] {
	arrayOut = arrayOut || [];

	let min = Number.MAX_VALUE;
	let max = 0;
	for (let i = 0; i < arrayIn.length; i++) {
		min = Math.min(arrayIn[i].v, min);
		max = Math.max(arrayIn[i].v, max);
	}

	for (let i = 0; i < arrayIn.length; i++) {
		const v = min === max ? min : map(arrayIn[i].v, min, max, lower, upper);
		arrayOut[i] = { ...arrayOut[i], v };
	}
	return arrayOut;
}