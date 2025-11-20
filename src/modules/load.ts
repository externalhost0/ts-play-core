/**
 * @module   load.ts
 * @desc     Various file type loader, returns Promises
 * @category internal
 * 
 * @example
 * import Load from './load';
 * 
 * // Usage: load different file types with one callback
 * Promise.all([
 *   Load.text('assets/1/text.txt'),
 *   Load.image('assets/1/blocks.png'),
 *   Load.image('assets/1/colors.png'),
 *   Load.json('data.json'),
 * ]).then(function(res) {
 *   console.log('Everything has loaded!');
 *   console.log(res);
 * }).catch(function() {
 *   console.log('Error');
 * });
 * 
 * // Usage: load a single resource
 * Load.image('assets/1/colors.png').then(img => {
 *   console.log(`Image has loaded, size is: ${img.width}x${img.height}`);
 * });
 */

/**
 * Loads an image from a URL
 * Returns null if loading fails
 * 
 * @param url - URL of the image to load
 * @returns Promise that resolves with the loaded image or null on error
 * 
 * @example
 * const img = await image('path/to/image.png');
 * if (img) {
 *   console.log(`Loaded: ${img.width}x${img.height}`);
 * }
 */
export function image(url: string): Promise<HTMLImageElement | null> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => {
			console.log('Loader: error loading image ' + url);
			resolve(null);
		};
		img.src = url;
	});
}

/**
 * Loads text content from a URL
 * Returns empty string if loading fails
 * 
 * @param url - URL of the text file to load
 * @returns Promise that resolves with the text content or empty string on error
 * 
 * @example
 * const content = await text('path/to/file.txt');
 * console.log(content);
 */
export function text(url: string): Promise<string> {
	return fetch(url)
		.then(response => {
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			return response.text();
		})
		.catch(err => {
			console.log('Loader: error loading text ' + url);
			return '';
		});
}

/**
 * Loads and parses JSON from a URL
 * Returns empty object if loading or parsing fails
 * 
 * @param url - URL of the JSON file to load
 * @returns Promise that resolves with the parsed JSON or empty object on error
 * 
 * @example
 * const data = await json<MyDataType>('path/to/data.json');
 * console.log(data);
 */
export function json<T = any>(url: string): Promise<T> {
	return fetch(url)
		.then(response => {
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			return response.json();
		})
		.catch(err => {
			console.log('Loader: error loading json ' + url);
			return {} as T;
		});
}

/**
 * Default export with all loader functions
 */
export default {
	json,
	image,
	text
};