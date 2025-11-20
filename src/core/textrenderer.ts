/**
@module   textrenderer.ts
@desc     renders to a text element
@category renderer
*/
import type { Context, Cell, Renderer } from '../run';

export default {
	preferredElementNodeName: 'PRE',
	render
} as Renderer;

const backBuffer: Cell[] = [];

let cols: number, rows: number;

function render(context: Context, buffer: Cell[]): void {
	const element = context.settings.element;
	if (!element || !(element instanceof HTMLElement)) {
		console.error('Text renderer requires an HTML element');
		return;
	}

	// Set the most used styles to the container
	// element.style.backgroundColor = context.settings.background
	// element.style.color = context.settings.color
	// element.style.fontWeight = context.settings.weight

	// Detect resize
	if (context.rows != rows || context.cols != cols) {
		cols = context.cols;
		rows = context.rows;
		backBuffer.length = 0;
	}

	// DOM rows update: expand lines if necessary
	// TODO: also benchmark a complete 'innerHTML' rewrite, could be faster?
	while (element.childElementCount < rows) {
		const span = document.createElement('span');
		span.style.display = 'block';
		element.appendChild(span);
	}

	// DOM rows update: shorten lines if necessary
	// https://jsperf.com/innerhtml-vs-removechild/15
	while (element.childElementCount > rows) {
		const lastChild = element.lastChild;
		if (lastChild) {
			element.removeChild(lastChild);
		}
	}

	// Counts the number of updated rows, useful for debug
	let updatedRowNum = 0;

	// A bit of a cumbersome render-loop…
	// A few notes: the fastest way I found to render the image
	// is by manually write the markup into the parent node via .innerHTML;
	// creating a node via .createElement and then populate it resulted
	// remarkably slower (even if more elegant for the CSS handling below).
	for (let j = 0; j < rows; j++) {

		const offs = j * cols;

		// This check is faster than to force update the DOM.
		// Buffer can be manually modified in pre, main and after
		// with semi-arbitrary values…
		// It is necessary to keep track of the previous state
		// and specifically check if a change in style
		// or char happened on the whole row.
		let rowNeedsUpdate = false;
		for (let i = 0; i < cols; i++) {
			const idx = i + offs;
			const newCell = buffer[idx];
			const oldCell = backBuffer[idx];
			if (!isSameCell(newCell, oldCell)) {
				if (rowNeedsUpdate == false) updatedRowNum++;
				rowNeedsUpdate = true;
				backBuffer[idx] = { ...newCell };
			}
		}

		// Skip row if update is not necessary
		if (rowNeedsUpdate == false) continue;

		let html = ''; // Accumulates the markup
		let prevCell: Partial<Cell> = {}; //defaultCell
		let tagIsOpen = false;
		for (let i = 0; i < cols; i++) {
			const currCell = buffer[i + offs]; //|| {...defaultCell, char : EMPTY_CELL}
			if (!currCell) continue;
			
			// Undocumented feature:
			// possible to inject some custom HTML (for example <a>) into the renderer.
			// It can be inserted before the char or after the char (beginHTML, endHTML)
			// and this is a very hack…
			if ((currCell as any).beginHTML) {
				if (tagIsOpen) {
					html += '</span>';
					prevCell = {}; //defaultCell
					tagIsOpen = false;
				}
				html += (currCell as any).beginHTML;
			}

			// If there is a change in style a new span has to be inserted
			if (!isSameCellStyle(currCell, prevCell)) {
				// Close the previous tag
				if (tagIsOpen) html += '</span>';

				const c = currCell.color === context.settings.color ? null : currCell.color;
				const b = currCell.backgroundColor === context.settings.backgroundColor ? null : currCell.backgroundColor;
				const w = currCell.fontWeight === context.settings.fontWeight ? null : currCell.fontWeight;

				// Accumulate the CSS inline attribute.
				let css = '';
				if (c) css += 'color:' + c + ';';
				if (b) css += 'background:' + b + ';';
				if (w) css += 'font-weight:' + w + ';';
				if (css) css = ' style="' + css + '"';
				html += '<span' + css + '>';
				tagIsOpen = true;
			}
			html += String(currCell.char);
			prevCell = currCell;

			// Add closing tag, in case
			if ((currCell as any).endHTML) {
				if (tagIsOpen) {
					html += '</span>';
					prevCell = {}; //defaultCell
					tagIsOpen = false;
				}
				html += (currCell as any).endHTML;
			}

		}
		if (tagIsOpen) html += '</span>';

		// Write the row
		const childNode = element.childNodes[j];
		if (childNode) {
			(childNode as HTMLElement).innerHTML = html;
		}
	}
}

// Compares two cells
function isSameCell(cellA: Cell | undefined, cellB: Cell | undefined): boolean {
	if (typeof cellA != 'object') return false;
	if (typeof cellB != 'object') return false;
	if (cellA.char !== cellB.char) return false;
	if (cellA.fontWeight !== cellB.fontWeight) return false;
	if (cellA.color !== cellB.color) return false;
	if (cellA.backgroundColor !== cellB.backgroundColor) return false;
	return true;
}

// Compares two cells for style only
function isSameCellStyle(cellA: Cell | Partial<Cell>, cellB: Cell | Partial<Cell>): boolean {
	if (cellA.fontWeight !== cellB.fontWeight) return false;
	if (cellA.color !== cellB.color) return false;
	if (cellA.backgroundColor !== cellB.backgroundColor) return false;
	return true;
}