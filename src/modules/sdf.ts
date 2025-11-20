/**
 * @module   sdf.ts
 * @desc     Signed distance functions
 * @category public
 * 
 * SDF functions ported from the almighty Inigo Quilezles:
 * @see https://iquilezles.org/articles/distfunctions2d/
 */

import { clamp, mix } from './num.js';
import { length, sub, dot, mulN } from './vec2.js';
import type { Vec2 } from './vec2.js';

/**
 * Signed distance function for a circle
 * Returns negative values inside the circle, positive outside
 * 
 * @param p - Point to test (2D vector)
 * @param radius - Radius of the circle
 * @returns Signed distance from point to circle edge
 * 
 * @example
 * const distance = sdCircle({ x: 5, y: 5 }, 3);
 * if (distance < 0) {
 *   console.log('Point is inside the circle');
 * }
 */
export function sdCircle(p: Vec2, radius: number): number {
	return length(p) - radius;
}

/**
 * Signed distance function for an axis-aligned box (rectangle)
 * Returns negative values inside the box, positive outside
 * 
 * @param p - Point to test (2D vector)
 * @param size - Half-size of the box in each dimension
 * @returns Signed distance from point to box edge
 * 
 * @example
 * const distance = sdBox({ x: 10, y: 10 }, { x: 5, y: 3 });
 * // Box extends from -5 to 5 in x, -3 to 3 in y
 */
export function sdBox(p: Vec2, size: Vec2): number {
	const d: Vec2 = {
		x: Math.abs(p.x) - size.x,
		y: Math.abs(p.y) - size.y,
	};
	d.x = Math.max(d.x, 0);
	d.y = Math.max(d.y, 0);
	return length(d) + Math.min(Math.max(d.x, d.y), 0.0);
}

/**
 * Signed distance function for a line segment with thickness
 * Returns negative values inside the segment capsule, positive outside
 * 
 * @param p - Point to test (2D vector)
 * @param a - Start point of the segment
 * @param b - End point of the segment
 * @param thickness - Thickness/radius of the segment
 * @returns Signed distance from point to segment
 * 
 * @example
 * const distance = sdSegment(
 *   { x: 5, y: 5 },
 *   { x: 0, y: 0 },
 *   { x: 10, y: 10 },
 *   1.0
 * );
 */
export function sdSegment(p: Vec2, a: Vec2, b: Vec2, thickness: number): number {
	const pa = sub(p, a);
	const ba = sub(b, a);
	const h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
	return length(sub(pa, mulN(ba, h))) - thickness;
}

/**
 * Smooth union operation for two distance fields
 * Blends two shapes together with a smooth transition
 * 
 * @param d1 - Distance from first shape
 * @param d2 - Distance from second shape
 * @param k - Smoothing factor (larger = smoother blend)
 * @returns Combined smooth distance
 * 
 * @example
 * const circle1 = sdCircle(p, 5);
 * const circle2 = sdCircle(p, 5);
 * const combined = opSmoothUnion(circle1, circle2, 2.0);
 */
export function opSmoothUnion(d1: number, d2: number, k: number): number {
	const h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
	return mix(d2, d1, h) - k * h * (1.0 - h);
}

/**
 * Smooth subtraction operation for two distance fields
 * Subtracts the second shape from the first with a smooth transition
 * 
 * @param d1 - Distance from first shape (to be subtracted from)
 * @param d2 - Distance from second shape (to subtract)
 * @param k - Smoothing factor (larger = smoother blend)
 * @returns Combined smooth distance
 * 
 * @example
 * const box = sdBox(p, { x: 10, y: 10 });
 * const circle = sdCircle(p, 5);
 * const cutout = opSmoothSubtraction(circle, box, 1.0);
 * // Box with a smooth circular cutout
 */
export function opSmoothSubtraction(d1: number, d2: number, k: number): number {
	const h = clamp(0.5 - 0.5 * (d2 + d1) / k, 0.0, 1.0);
	return mix(d2, -d1, h) + k * h * (1.0 - h);
}

/**
 * Smooth intersection operation for two distance fields
 * Creates the overlapping region of two shapes with a smooth transition
 * 
 * @param d1 - Distance from first shape
 * @param d2 - Distance from second shape
 * @param k - Smoothing factor (larger = smoother blend)
 * @returns Combined smooth distance
 * 
 * @example
 * const circle = sdCircle(p, 8);
 * const box = sdBox(p, { x: 6, y: 6 });
 * const intersection = opSmoothIntersection(circle, box, 2.0);
 * // Rounded rectangle shape
 */
export function opSmoothIntersection(d1: number, d2: number, k: number): number {
	const h = clamp(0.5 - 0.5 * (d2 - d1) / k, 0.0, 1.0);
	return mix(d2, d1, h) + k * h * (1.0 - h);
}

/**
 * Default export with all SDF functions
 */
export default {
	sdCircle,
	sdBox,
	sdSegment,
	opSmoothUnion,
	opSmoothSubtraction,
	opSmoothIntersection
};