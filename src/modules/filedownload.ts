/**
 * @module   filedownload.ts
 * @desc     Exports a file via Blob
 * @category internal
 * 
 * Downloads a Blob as file using this "hack":
 * creates an anchor with a "download" attribute
 * and then emits a click event.
 * @see https://github.com/eligrey/FileSaver.js
 */

/**
 * MIME type mapping for common file extensions
 */
const mimeTypes: Record<string, string> = {
	'js': 'text/javascript',
	'txt': 'text/plain',
	'png': 'image/png',
	'jpg': 'image/jpeg',
	'jpeg': 'image/jpeg',
	'webp': 'image/webp',
	'gif': 'image/gif',
	'svg': 'image/svg+xml',
	'json': 'application/json',
	'csv': 'text/csv',
	'html': 'text/html',
	'css': 'text/css',
	'xml': 'application/xml',
};

/**
 * Saves text or source code as a downloadable file
 * For text elements and source code
 * 
 * @param src - Source text/code to save
 * @param filename - Desired filename with extension
 * 
 * @example
 * saveSourceAsFile('console.log("Hello");', 'script.js');
 * 
 * @example
 * const csvData = 'name,age\nAlice,30\nBob,25';
 * saveSourceAsFile(csvData, 'data.csv');
 */
export function saveSourceAsFile(src: string, filename: string): void {
	const ext = getFileExt(filename);
	const type = mimeTypes[ext];
	const blob = type ? new Blob([src], { type }) : new Blob([src]);
	saveBlobAsFile(blob, filename);
}

/**
 * Gets the file extension from a filename
 * 
 * @param filename - Filename to extract extension from
 * @returns File extension without the dot
 * 
 * @example
 * getFileExt('image.png'); // 'png'
 * getFileExt('archive.tar.gz'); // 'gz'
 */
function getFileExt(filename: string): string {
	return filename.split('.').pop() || '';
}

/**
 * Saves a Blob as a downloadable file
 * For canvas elements and binary data
 * 
 * @param blob - Blob data to save
 * @param filename - Desired filename with extension
 * 
 * @example
 * // Save canvas as image
 * canvas.toBlob(blob => {
 *   if (blob) saveBlobAsFile(blob, 'screenshot.png');
 * });
 * 
 * @example
 * // Save JSON data
 * const data = { name: 'John', age: 30 };
 * const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
 * saveBlobAsFile(blob, 'data.json');
 */
export function saveBlobAsFile(blob: Blob, filename: string): void {
	const a = document.createElement('a');
	a.download = filename;
	a.rel = 'noopener';
	a.href = URL.createObjectURL(blob);
	
	// Revoke object URL after a delay to avoid memory leaks
	setTimeout(() => {
		URL.revokeObjectURL(a.href);
	}, 10000);
	
	// Trigger download
	setTimeout(() => {
		click(a);
	}, 0);
}

/**
 * Triggers a click event on a DOM node
 * Uses modern MouseEvent API with fallback for older browsers
 * 
 * @param node - DOM element to click
 */
function click(node: HTMLElement): void {
	try {
		node.dispatchEvent(new MouseEvent('click'));
	} catch (err) {
		// Fallback for older browsers
		const e = document.createEvent('MouseEvents');
		e.initMouseEvent(
			'click',
			true,      // bubbles
			true,      // cancelable
			window,    // view
			0,         // detail
			0, 0, 0, 0, // screen/client coords
			false, false, false, false, // modifier keys
			0,         // button
			null       // relatedTarget
		);
		node.dispatchEvent(e);
	}
}

/**
 * Default export with file download functions
 */
export default {
	saveSourceAsFile,
	saveBlobAsFile
};