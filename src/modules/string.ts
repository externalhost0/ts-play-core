/**
 * @module   string.ts
 * @desc     String helpers
 * @category internal
 * 
 * Wraps a string to a specific width.
 * Doesn't break words and keeps trailing line breaks.
 * Counts lines and maxWidth (can be greater than width).
 * If no width is passed the function just measures the 'box' of the text.
 */

/**
 * Result of string wrapping or measuring operations
 */
export interface StringMetrics {
	/** The processed text (wrapped or original) */
	text: string;
	/** Number of lines in the text */
	numLines: number;
	/** Maximum width of any line */
	maxWidth: number;
}

/**
 * Wraps a string to a specific width without breaking words
 * Keeps trailing line breaks and measures the text dimensions
 * 
 * @param string - The text to wrap
 * @param width - Maximum width per line (0 = no wrapping, just measure)
 * @returns Metrics about the wrapped text including dimensions
 * 
 * @example
 * const result = wrap('Hello world this is a long string', 10);
 * console.log(result.text);     // 'Hello\nworld this\nis a long\nstring'
 * console.log(result.numLines); // 4
 * console.log(result.maxWidth); // 10
 * 
 * @example
 * // Just measure without wrapping
 * const metrics = wrap('Hello\nWorld', 0);
 * console.log(metrics.numLines); // 2
 * console.log(metrics.maxWidth); // 5
 */
export function wrap(string: string, width: number = 0): StringMetrics {
	if (width === 0) return measure(string);
	
	const paragraphs = string.split('\n');
	let out = '';
	let maxWidth = 0;
	let numLines = 0;
	
	for (const p of paragraphs) {
		const chunks = p.split(' ');
		let len = 0;
		
		for (const word of chunks) {
			// First word
			if (len === 0) {
				out += word;
				len = word.length;
				maxWidth = Math.max(maxWidth, len);
			}
			// Subsequent words
			else {
				if (len + 1 + word.length <= width) {
					out += ' ' + word;
					len += word.length + 1;
					maxWidth = Math.max(maxWidth, len);
				} else {
					// Start new line with word
					out += '\n' + word;
					len = word.length;
					numLines++;
					maxWidth = Math.max(maxWidth, len);
				}
			}
		}
		out += '\n';
		numLines++;
	}
	
	// Remove last \n
	out = out.slice(0, -1);
	
	// Adjust line count in case of last trailing \n
	if (out.charAt(out.length - 1) === '\n') numLines--;
	
	return {
		text: out,
		numLines,
		maxWidth
	};
}

/**
 * Measures the dimensions of a text string
 * Counts the number of lines and finds the maximum line width
 * 
 * @param string - The text to measure
 * @returns Metrics about the text including line count and max width
 * 
 * @example
 * const metrics = measure('Hello\nWorld!\nTest');
 * console.log(metrics.numLines); // 3
 * console.log(metrics.maxWidth); // 6 (from 'World!')
 * 
 * @example
 * const metrics = measure('Single line');
 * console.log(metrics.numLines); // 1
 * console.log(metrics.maxWidth); // 11
 */
export function measure(string: string): StringMetrics {
	let numLines = 0;
	let maxWidth = 0;
	let len = 0;
	
	for (let i = 0; i < string.length; i++) {
		const char = string[i];
		if (char === '\n') {
			len = 0;
			numLines++;
		} else {
			len++;
			maxWidth = Math.max(maxWidth, len);
		}
	}
	
	// If there's any content and no newlines, we have at least 1 line
	if (string.length > 0 && numLines === 0) {
		numLines = 1;
	}
	
	return {
		text: string,
		numLines,
		maxWidth
	};
}