/**
 * @module   sort.ts
 * @desc     Sorts a set of characters by brightness
 * @category public
 * 
 * Paints chars on a temporary canvas and counts the pixels.
 * This could be done once and then stored / hardcoded.
 * The fontFamily parameter needs to be set because it's used by the canvas element
 * to draw the correct font.
 */

/**
 * Character brightness data
 */
interface CharBrightness {
	/** Pixel brightness count */
	count: number;
	/** The character */
	char: string;
	/** Original index in the charset */
	index: number;
}

/**
 * Sorts a character set by brightness using canvas rendering
 * 
 * @param charSet - String of characters to sort
 * @param fontFamily - Font family name to use for rendering
 * @param ascending - If true, sort from darkest to brightest; if false, brightest to darkest
 * @returns Sorted string of characters
 * 
 * @example
 * // Sort ASCII characters by brightness
 * const chars = ' .:-=+*#%@';
 * const sorted = sort(chars, 'monospace', false);
 * console.log(sorted); // Characters sorted from brightest to darkest
 * 
 * @example
 * // Sort in ascending order (darkest to brightest)
 * const sorted = sort(' ░▒▓█', 'monospace', true);
 */
export function sort(charSet: string, fontFamily: string, ascending: boolean = false): string {
	const size = 30;
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	
	if (!ctx) {
		console.warn("Canvas context not available. Can't sort chars for brightness.");
		return charSet;
	}
	
	ctx.canvas.width = size * 2;
	ctx.canvas.height = size * 2;
	ctx.canvas.style.right = '0';
	ctx.canvas.style.top = '0';
	ctx.canvas.style.position = 'absolute';
	
	// NOTE: needs to be attached to the DOM for getImageData to work in some browsers
	document.body.appendChild(ctx.canvas);
	
	// Check if getImageData is supported
	if (ctx.getImageData(0, 0, 1, 1).data.length === 0) {
		console.warn("getImageData() is not supported on this browser.\nCan't sort chars for brightness.");
		document.body.removeChild(ctx.canvas);
		return charSet;
	}
	
	const out: CharBrightness[] = [];
	
	for (let i = 0; i < charSet.length; i++) {
		// Clear canvas with black
		ctx.fillStyle = 'black';
		ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		
		// Draw character in white
		ctx.fillStyle = 'rgb(255,255,255)';
		ctx.font = size + 'px ' + fontFamily; // NOTE: font family inherit doesn't work
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(charSet[i], ctx.canvas.width / 2, ctx.canvas.height / 2);
		
		out[i] = {
			count: 0,
			char: charSet[i],
			index: i,
		};
		
		// Count white pixels
		const data = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height).data;
		for (let y = 0; y < ctx.canvas.height; y++) {
			const oy = y * ctx.canvas.width;
			for (let x = 0; x < ctx.canvas.width; x++) {
				const r = data[4 * (x + oy)];
				out[i].count += r;
			}
		}
		// console.log(out[i].char, out[i].count)
	}
	
	// Cleanup
	document.body.removeChild(ctx.canvas);
	
	// Sort and return
	if (ascending) {
		return out.sort((a, b) => a.count - b.count).map(x => x.char).join('');
	} else {
		return out.sort((a, b) => b.count - a.count).map(x => x.char).join('');
	}
}