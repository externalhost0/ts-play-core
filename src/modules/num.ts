/**
 * @module   num.ts
 * @desc     GLSL math functions ported to JS for scalar values
 * @category public
 * 
 * For vector operations, use vec2.ts or vec3.ts modules
 */

/**
 * Maps a value v from range 'in' to range 'out'
 */
export function map(
	v: number,
	inA: number,
	inB: number,
	outA: number,
	outB: number
): number {
	return outA + (outB - outA) * ((v - inA) / (inB - inA));
}

/**
 * Returns the fractional part of a float
 * GLSL fract function
 */
export function fract(v: number): number {
	return v - Math.floor(v);
}

/**
 * Clamps a value between min and max
 * GLSL clamp function
 */
export function clamp(v: number, min: number, max: number): number {
	if (v < min) return min;
	if (v > max) return max;
	return v;
}

/**
 * Returns -1 for negative numbers, +1 for positive numbers, 0 for zero
 * GLSL sign function
 */
export function sign(n: number): number {
	if (n > 0) return 1;
	if (n < 0) return -1;
	return 0;
}

/**
 * GLSL mix (linear interpolation)
 * Interpolates between v1 and v2 using parameter a
 */
export function mix(v1: number, v2: number, a: number): number {
	return v1 * (1 - a) + v2 * a;
}

/**
 * GLSL step function
 * Returns 0 if x < edge, otherwise 1
 */
export function step(edge: number, x: number): number {
	return x < edge ? 0 : 1;
}

/**
 * GLSL smoothstep function
 * Performs smooth Hermite interpolation between 0 and 1
 * @see https://en.wikipedia.org/wiki/Smoothstep
 */
export function smoothstep(edge0: number, edge1: number, t: number): number {
	const x = clamp((t - edge0) / (edge1 - edge0), 0, 1);
	return x * x * (3 - 2 * x);
}

/**
 * GLSL smootherstep function (Ken Perlin's improved version)
 * Performs smoother Hermite interpolation with zero 1st and 2nd order derivatives at edges
 */
export function smootherstep(edge0: number, edge1: number, t: number): number {
	const x = clamp((t - edge0) / (edge1 - edge0), 0, 1);
	return x * x * x * (x * (x * 6 - 15) + 10);
}

/**
 * GLSL modulo function
 */
export function mod(a: number, b: number): number {
	return a % b;
}

/**
 * Default export with all functions
 */
export default {
	map,
	fract,
	clamp,
	sign,
	mix,
	step,
	smoothstep,
	smootherstep,
	mod
};