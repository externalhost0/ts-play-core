# ts-play-core

This is a typescript rewrite of ertfgcvb's awesome JavaScript project play.core, check out the original project here: [play.ertdfgcvb.xyz](https://play.ertdfgcvb.xyz)

---

**ts-play-core** allows users to write typescript code
that builds ASCII art & animations similar to writing a GLSL fragment shader.

## Installation & Usage

To install this package:

```shell
npm install ts-play-core
```

To import and run one of the examples:

```typescript
import { type Settings, run } from "ts-play-core";
// for JS scripts
// (right now all scripts in the program folder are JS)
import * as donut from "ts-play-core/programs/demos/donut";
// for TS scripts like in the example section
import donut from "/wherever/its/located";

const settings: Partial<Settings> = {
  element: document.querySelector("pre"),
};

run(donut, settings)
  .then(function (e) {
    console.log(e);
  })
  .catch(function (e) {
    console.warn(e.message);
    console.log(e.error);
  });
```
## Simple Example
This is the new and recommended way to write ts-play-core scripts.
```typescript
// Circle.ts

import type { Program } from "ts-play-core";
import { length } from "ts-play-core/modules/vec2";

export default {
    settings: {
        backgroundColor: "black",
    },
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
        return l < 0.7 ? 'X' : '.'
    }
} satisfies Program;

```
