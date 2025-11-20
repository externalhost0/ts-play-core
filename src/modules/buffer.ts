/**
 * @module   buffer.ts
 * @desc     Safe buffer helpers, mostly for internal use
 * @category internal
 * 
 * Safe set() and get() functions, rect() and text() 'drawing' helpers.
 * Buffers are 1D arrays for 2D data, a 'width' and a 'height' parameter
 * have to be known (and passed to the functions) to correctly / safely access
 * the array.
 * 
 * Example: const v = get(10, 10, buffer, cols, rows)
 */

import type { Cell } from '../types';

/**
 * Cell value type - can be a string character or a Cell object
 */
export type CellValue = string | Cell;

/**
 * Buffer array type
 */
export type Buffer = CellValue[];

/**
 * Information about wrapped text lines
 */
export interface WrapInfo {
	first: CellValue;
	last: CellValue;
}

/**
 * Result of merging text into buffer
 */
export interface MergeTextResult {
	offset: {
		col: number;
		row: number;
	};
	wrapInfo: WrapInfo[];
}

/**
 * Text object with styling properties
 */
export interface TextObject extends Partial<Cell> {
	text: string;
}

/**
 * Safe get function to read from a buffer
 * Returns empty object if coordinates are out of bounds
 */
export function get(
	x: number,
	y: number,
	target: Buffer,
	targetCols: number,
	targetRows: number
): CellValue {
	if (x < 0 || x >= targetCols) return {};
	if (y < 0 || y >= targetRows) return {};
	const i = x + y * targetCols;
	return target[i];
}

/**
 * Safe set function to write a value to the buffer
 * Does nothing if coordinates are out of bounds
 */
export function set(
	val: CellValue,
	x: number,
	y: number,
	target: Buffer,
	targetCols: number,
	targetRows: number
): void {
	if (x < 0 || x >= targetCols) return;
	if (y < 0 || y >= targetRows) return;
	const i = x + y * targetCols;
	target[i] = val;
}

/**
 * Merge a value into the buffer, combining with existing cell properties
 * Does nothing if coordinates are out of bounds
 */
export function merge(
	val: CellValue,
	x: number,
	y: number,
	target: Buffer,
	targetCols: number,
	targetRows: number
): void {
	if (x < 0 || x >= targetCols) return;
	if (y < 0 || y >= targetRows) return;
	const i = x + y * targetCols;
	
	// Flatten: convert string to Cell object if needed
	const cell = typeof target[i] === 'object' 
		? target[i] as Cell
		: { char: target[i] as string };
	
	target[i] = { ...cell, ...(val as Cell) };
}

/**
 * Set a rectangular region in the buffer with the same value
 */
export function setRect(
	val: CellValue,
	x: number,
	y: number,
	w: number,
	h: number,
	target: Buffer,
	targetCols: number,
	targetRows: number
): void {
	for (let j = y; j < y + h; j++) {
		for (let i = x; i < x + w; i++) {
			set(val, i, j, target, targetCols, targetRows);
		}
	}
}

/**
 * Merge properties into a rectangular region in the buffer
 */
export function mergeRect(
	val: CellValue,
	x: number,
	y: number,
	w: number,
	h: number,
	target: Buffer,
	targetCols: number,
	targetRows: number
): void {
	for (let j = y; j < y + h; j++) {
		for (let i = x; i < x + w; i++) {
			merge(val, i, j, target, targetCols, targetRows);
		}
	}
}

/**
 * Merges a text object or string into the target buffer
 * 
 * @param textObj - Either a TextObject with styling properties or a plain string
 * @param x - Starting X coordinate
 * @param y - Starting Y coordinate
 * @param target - Target buffer array
 * @param targetCols - Number of columns in the buffer
 * @param targetRows - Number of rows in the buffer
 * @returns Information about the merged text including offset and wrap info
 * 
 * @example
 * // With styling
 * mergeText({
 *   text: 'Hello\nWorld',
 *   color: 'red',
 *   backgroundColor: 'black'
 * }, 0, 0, buffer, cols, rows);
 * 
 * // Plain string
 * mergeText('Hello\nWorld', 0, 0, buffer, cols, rows);
 */
export function mergeText(
	textObj: TextObject | string,
	x: number,
	y: number,
	target: Buffer,
	targetCols: number,
	targetRows: number
): MergeTextResult {
	let text: string;
	let mergeObj: Partial<Cell> | undefined;

	// An object has been passed as argument, expect a 'text' field
	if (typeof textObj === "object") {
		text = textObj.text;
		// Extract all the fields to be merged...
		mergeObj = { ...textObj };
		// ...but remove text field
		delete (mergeObj as any).text;
	}
	// A string has been passed as argument
	else {
		text = textObj;
	}

	let col = x;
	let row = y;

	// Hackish and inefficient way to retain info of the first and last
	// character of each line merged into the matrix.
	// Can be useful to wrap with markup.
	const wrapInfo: WrapInfo[] = [];

	text.split('\n').forEach((line, lineNum) => {
		line.split('').forEach((char, charNum) => {
			col = x + charNum;
			merge({ char, ...mergeObj }, col, row, target, targetCols, targetRows);
		});

		const first = get(x, row, target, targetCols, targetRows);
		const last = get(x + line.length - 1, row, target, targetCols, targetRows);
		wrapInfo.push({ first, last });
		row++;
	});

	// Adjust for last ++
	row = Math.max(y, row - 1);

	// Returns some info about the inserted text:
	// - the coordinates (offset) of the last inserted character
	// - the first and last chars of each line (wrapInfo)
	return {
		offset: { col, row },
		wrapInfo
	};
}