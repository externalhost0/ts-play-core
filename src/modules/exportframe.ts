/**
 * @module   exportframe.ts
 * @desc     Exports a single frame (or a range) to an image
 * @category public
 * 
 * Exports a frame as image.
 * Expects the canvas renderer as the active renderer.
 * Tested on Safari, FF, Chrome
 */

import { saveBlobAsFile } from './filedownload.js';
import type { Context } from '../types.js';

/**
 * Exports the current frame as an image file
 * Requires canvas renderer to be active
 * 
 * @param context - Current rendering context
 * @param filename - Output filename with extension (e.g., 'frame.png')
 * @param from - Start frame number (inclusive)
 * @param to - End frame number (inclusive), defaults to `from`
 * 
 * @example
 * // Export single frame
 * exportFrame(context, 'screenshot.png');
 * 
 * @example
 * // Export frame range (frames 1-100)
 * exportFrame(context, 'animation.png', 1, 100);
 * // Creates files: animation_00001.png, animation_00002.png, etc.
 * 
 * @example
 * // Use in a sketch to auto-export
 * export const main: MainFunction = (coord, context) => {
 *   if (context.frame <= 120) {
 *     exportFrame(context, 'output.png', 1, 120);
 *   }
 *   return '█';
 * };
 */
export function exportFrame(
	context: Context,
	filename: string,
	from: number = 1,
	to: number = from
): void {
	// Error: renderer is not canvas.
	// A renderer instance could be imported here and the content of the buffer
	// rendered to a tmp canvas… maybe overkill: let's keep things simple for now.
	const canvas = context.settings.element;
	
	if (!canvas || canvas.nodeName !== 'CANVAS') {
		console.warn('exportframe.ts: Can\'t export, a canvas renderer is required.');
		return;
	}
	
	// Error: filename not provided.
	// The function doesn't provide a default name: this operation will probably
	// flood the "Downloads" folder with images…
	// It's probably better to require a user-provided filename at least.
	if (!filename) {
		console.warn('exportframe.ts: Filename not provided.');
		return;
	}
	
	// Filename chunks
	const match = filename.match(/(.+)\.([0-9a-z]+$)/i);
	
	if (!match) {
		console.warn('exportframe.ts: Invalid filename format. Expected format: "name.ext"');
		return;
	}
	
	const base = match[1];
	const ext = match[2];
	
	// Finally export the frame
	const f = context.frame;
	if (f >= from && f <= to) {
		const out = base + '_' + f.toString().padStart(5, '0') + '.' + ext;
		console.info('exportframe.ts: Exporting frame ' + out + '. Will stop at ' + to + '.');
		
		(canvas as HTMLCanvasElement).toBlob(blob => {
			if (blob) {
				saveBlobAsFile(blob, out);
			} else {
				console.error('exportframe.ts: Failed to create blob from canvas.');
			}
		});
	}
}

export default {
	exportFrame
};