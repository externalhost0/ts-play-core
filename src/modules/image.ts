/**
 * @module image.ts
 * @desc Image loader and helper
 * @category public
 */

import Canvas from './canvas';
import * as Load from './load';

export function load(path: string): Canvas {
    const source = document.createElement('canvas');
    source.width = 1;
    source.height = 1;

    const can = new Canvas(source);

    Load.image(path)
        .then((img) => {
            if (!img) {
                console.warn(`There was an error loading image ${path}.`);
                return;
            }

            console.log(
                `Image ${path} loaded. Size: ${img.width}×${img.height}`
            );

            can.resize(img.width, img.height);
            can.copy(img);
        })
        .catch((err: unknown) => {
            console.warn(`Unexpected error loading image ${path}.`, err);
        });

    return can;
}
export default load;