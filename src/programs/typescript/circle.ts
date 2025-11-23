/**
@author externalhost0
@title  circle
@desc   super simple circle example
*/

import { type Program } from "../../run";
import { length } from "../../modules/vec2";

export const circleState = {
    radius: 0.7
};

export default {
    main(coord, context, cursor) {
        const aspectRatio = cursor.pressed ? 1 : context.metrics.aspect

        // Transform coordinate space to (-1, 1)
        // width corrected screen aspect (m) and cell aspect (aspectRatio)
        const m = Math.min(context.cols * aspectRatio, context.rows)
        const st = {
            x: 2.0 * (coord.x - context.cols / 2) / m * aspectRatio, // apply aspect
            y: 2.0 * (coord.y - context.rows / 2) / m
        }

        // Distance of each cell from the center (0, 0)
        const l = length(st)

        // 0.7 is the radius of the circle
        return l < circleState.radius ? 'C' : '.'
    }
} satisfies Program;
