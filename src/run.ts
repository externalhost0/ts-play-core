/**
Runner - TypeScript Version
*/

// Both available renderers are imported
import textRenderer from './core/textrenderer'
import canvasRenderer from './core/canvasrenderer'
import storage from './core/storage'

import FPS from './core/fps'
import RUNNER_VERSION from './core/version'
export { RUNNER_VERSION };

// import types for internal use
import type { Coordinate, Context, Cursor, Settings, Cell, Metrics } from './types';
// re-export types for users
export type {
    Coordinate,
    Context,
    Cursor,
    Buffer,
    Cell,
    Settings,
    Metrics
} from './types';


interface State {
    time: number;
    frame: number;
    cycle: number;
}

export interface Program<TVariables = any> {
    settings?: Partial<Settings>;
    userVariables?: TVariables,
    boot?(context: Context, buffer: Cell[], userVars: TVariables): void;
    pre?(context: Context, cursor: Cursor, buffer: Cell[], userVars: TVariables): void;
    main?(
        coord: Coordinate,
        context: Context,
        cursor: Cursor,
        buffer: Cell[],
        userVars: TVariables
    ): string | number | Partial<Cell> | null | undefined;
    post?(context: Context, cursor: Cursor, buffer: Cell[], userVars: TVariables): void;
    pointerMove?(context: Context, cursor: Cursor, buffer: Cell[]): void;
    pointerDown?(context: Context, cursor: Cursor, buffer: Cell[]): void;
    pointerUp?(context: Context, cursor: Cursor, buffer: Cell[]): void;
    // [key: string]: any;
}

export interface Renderer {
    preferredElementNodeName: string;
    render(context: Context, buffer: Cell[], settings: Settings): void;
}

const renderers: { [K in 'canvas' | 'text']: Renderer } = {
    'canvas': canvasRenderer,
    'text': textRenderer
};

const defaultSettings: Settings = {
    element: null,    // target element for output
    cols: 0,       // number of columns, 0 is equivalent to 'auto'
    rows: 0,       // number of columns, 0 is equivalent to 'auto'
    once: false,   // if set to true the renderer will run only once
    fps: 30,      // fps capping
    rendererType: 'text',  // can be 'canvas', anything else falls back to 'text'
    allowSelect: false,   // allows selection of the rendered element
    restoreState: false,   // will store the "state" object in local storage
    // ^ this is handy for live-coding situations
}

// CSS styles which can be passed to the container element via settings
const CSSStyles: (keyof CSSStyleDeclaration)[] = [
    'backgroundColor',
    'color',
    'fontFamily',
    'fontSize',
    'fontWeight',
    'letterSpacing',
    'lineHeight',
    'textAlign'
]

// Program runner.
// Takes a program object (usually an imported module),
// and some optional settings (see above) as arguments.
// Finally, an optional userData object can be passed which will be available
// as last parameter in all the module functions.
// The program object should export at least a main(), pre() or post() function.
export function run<TVariables = any>(program: Program<TVariables>, runSettings: Partial<Settings> = {}): Promise<Context<TVariables>> {
    const variables = program.userVariables || {} as TVariables;
    // Everything is wrapped inside a promise;
    // in case of errors in 'program' it will reject without reaching the bottom.
    // If the program reaches the bottom of the first frame the promise is resolved.
    return new Promise(function (resolve) {
        // Merge of user- and default settings
        const settings: Settings = { ...defaultSettings, ...runSettings, ...program.settings }
        

        // State is stored in local storage and will loaded on program launch
        // if settings.restoreState == true.
        // The purpose of this is to live edit the code without resetting
        // time and the frame counter.
        const state: State = {
            time: 0, // The time in ms
            frame: 0, // The frame number (int)
            cycle: 0  // An cycle count for debugging purposes
        }

        // Name of local storage key
        const LOCAL_STORAGE_KEY_STATE = 'currentState';

        if (settings.restoreState) {
            storage.restore(LOCAL_STORAGE_KEY_STATE, state);
            state.cycle++; // Keep track of the cycle count for debugging purposes
        }

        // If element is not provided create a default element based
        // on the renderer settings.
        // Then choose the renderer:
        // If the parent element is a canvas the canvas renderer is selected,
        // for any other type a text node (PRE or any othe text node)
        // is expected and the text renderer is used.
        // TODO: better / more generic renderer init
        let renderer: Renderer;
        if (!settings.element) {
            renderer = renderers[settings.rendererType] || renderers['text'];
            settings.element = document.createElement(renderer.preferredElementNodeName) as HTMLElement;
            document.body.appendChild(settings.element);
        } else {
            if (settings.rendererType == 'canvas') {
                if (settings.element.nodeName == 'CANVAS') {
                    renderer = renderers[settings.rendererType];
                } else {
                    console.warn("This renderer expects a canvas target element.");
                }
            } else {
                if (settings.element.nodeName != 'CANVAS') {
                    renderer = renderers[settings.rendererType];
                } else {
                    console.warn("This renderer expects a text target element.");
                }
            }
        }

        // FIXME
        // Apply CSS settings to element
        // for (const s of CSSStyles) {
        //     const key = s as keyof Settings;
        //     if (settings[key] != null) {
        //         settings.element.style[s as key] = settings[key];
        //     }
        // }

        // Eventqueue
        // Stores events and pops them at the end of the renderloop
        // TODO: needed?
        const eventQueue: string[] = [];

        // Input pointer updated by DOM events
        const pointer = {
            x: 0,
            y: 0,
            pressed: false,
            px: 0,
            py: 0,
            ppressed: false,
        };

        settings.element.addEventListener('pointermove', (e: Event) => {
            if (!settings.element) return;
            const pointerEvent = e as PointerEvent;
            const rect = settings.element.getBoundingClientRect()
            pointer.x = pointerEvent.clientX - rect.left;
            pointer.y = pointerEvent.clientY - rect.top;
            eventQueue.push('pointerMove');
        });

        settings.element.addEventListener('pointerdown', (e: Event) => {
            pointer.pressed = true;
            eventQueue.push('pointerDown');
        });

        settings.element.addEventListener('pointerup', (e: Event) => {
            pointer.pressed = false;
            eventQueue.push('pointerUp');
        });

        const touchHandler = (e: Event) => {
            if (!settings.element) return;
            const touchEvent = e as TouchEvent;
            const touch = touchEvent.touches[0];
            if (!touch) return;
            const rect = settings.element.getBoundingClientRect();
            pointer.x = touch.clientX - rect.left;
            pointer.y = touch.clientY - rect.top;
            eventQueue.push('pointerMove');
        }

        settings.element.addEventListener('touchmove', touchHandler);
        settings.element.addEventListener('touchstart', touchHandler);
        settings.element.addEventListener('touchend', touchHandler);


        // CSS fix
        (settings.element.style as any).fontStrech = 'normal';

        // Text selection may be annoing in case of interactive programs
        if (!settings.allowSelect) disableSelect(settings.element);

        // Method to load a font via the FontFace object.
        // The load promise works 100% of the times.
        // But a definition of the font via CSS is preferable and more flexible.
        /*
        const CSSInfo = getCSSInfo(settings.element)
        var font = new FontFace('Simple Console', 'url(/css/fonts/simple/SimpleConsole-Light.woff)', { style: 'normal', weight: 400 })
        font.load().then(function(f) {
            ...
        })
        */

        // Metrics needs to be calculated before boot
        // Even with the "fonts.ready" the font may STILL not be loaded yet
        // on Safari 13.x and also 14.0.
        // A (shitty) workaround is to wait 3! rAF.
        // Submitted: https://bugs.webkit.org/show_bug.cgi?id=217047
        document.fonts.ready.then((e) => {
            // Run this three times...
            let count: number = 3;
                ; (function __run_thrice__() {
                    if (--count > 0) {
                        requestAnimationFrame(__run_thrice__);
                    } else {
                        // settings.element.style.lineHeight = Math.ceil(metrics.lineHeightf) + 'px'
                        // console.log(`Using font faimily: ${ci.fontFamily} @ ${ci.fontSize}/${ci.lineHeight}`)
                        // console.log(`Metrics: cellWidth: ${metrics.cellWidth}, lineHeightf: ${metrics.lineHeightf}`)
                        // Finally Boot!
                        boot();
                    }
                })()
            // Ideal mode:
            // metrics = calcMetrics(settings.element)
            // etc.
            // requestAnimationFrame(loop)
        });

        // FPS object (keeps some state for precise FPS measure)
        const fps = new FPS();

        // A cell with no value at all is just a space
        const EMPTY_CELL = ' ';

        // Default cell style inserted in case of undefined / null
        const DEFAULT_CELL_STYLE: Readonly<Partial<Cell>> = Object.freeze({
            char: EMPTY_CELL,
            color: settings.color,
            backgroundColor: settings.backgroundColor,
            fontWeight: settings.fontWeight
        });

        // Buffer needed for the final DOM rendering,
        // each array entry represents a cell.
        const buffer: Cell[] = [];

        // Metrics object, calc once (below)
        let metrics: Metrics;

        function boot() {
            if (!settings.element) return;
            metrics = calcMetrics(settings.element);
            const context = getContext<TVariables>(state, settings, metrics, fps, variables);
            if (typeof program.boot == 'function') {
                program.boot(context, buffer, variables);
            }
            requestAnimationFrame(loop);
        }

        // Time sample to calculate precise offset
        let timeSample: number = 0;
        // Previous time step to increment state.time (with state.time initial offset)
        let ptime = 0;
        const interval = 1000 / settings.fps;
        const timeOffset = state.time;

        // Used to track window resize
        let cols: number, rows: number;

        // Main program loop
        function loop(t: number) {

            // Timing
            const delta = t - timeSample;
            if (delta < interval) {
                // Skip the frame
                if (!settings.once) requestAnimationFrame(loop)
                return
            }

            // Snapshot of context data
            const context = getContext<TVariables>(state, settings, metrics, fps, variables)

            // FPS update
            fps.update(t)

            // Timing update
            timeSample = t - delta % interval // adjust timeSample
            state.time = t + timeOffset       // increment time + initial offs
            state.frame++                     // increment frame counter
            storage.store(LOCAL_STORAGE_KEY_STATE, state) // store state

            // Cursor update
            const cursor: Cursor = {
                // The canvas might be slightly larger than the number
                // of cols/rows, min is required!
                x: Math.min(context.cols - 1, pointer.x / metrics.cellWidth),
                y: Math.min(context.rows - 1, pointer.y / metrics.lineHeight),
                pressed: pointer.pressed,
                p: { // state of previous frame
                    x: pointer.px / metrics.cellWidth,
                    y: pointer.py / metrics.lineHeight,
                    pressed: pointer.ppressed,
                }
            }

            // Pointer: store previous state
            pointer.px = pointer.x
            pointer.py = pointer.y
            pointer.ppressed = pointer.pressed

            // 1. --------------------------------------------------------------
            // In case of resize / init normalize the buffer
            if (cols != context.cols || rows != context.rows) {
                cols = context.cols
                rows = context.rows
                buffer.length = context.cols * context.rows
                for (let i = 0; i < buffer.length; i++) {
                    buffer[i] = { ...DEFAULT_CELL_STYLE, char: EMPTY_CELL }
                }
            }

            // 2. --------------------------------------------------------------
            // Call pre(), if defined
            if (typeof program.pre == 'function') {
                program.pre(context, cursor, buffer, variables)
            }

            // 3. --------------------------------------------------------------
            // Call main(), if defined
            if (typeof program.main == 'function') {
                for (let j = 0; j < context.rows; j++) {
                    const offs = j * context.cols
                    for (let i = 0; i < context.cols; i++) {
                        const idx = i + offs
                        // Override content:
                        // buffer[idx] = program.main({x:i, y:j, index:idx}, context, cursor, buffer, userData)
                        const out = program.main({ x: i, y: j, index: idx }, context, cursor, buffer, variables)
                        if (typeof out == 'object' && out !== null) {
                            buffer[idx] = { ...buffer[idx], ...out }
                        } else {
                            buffer[idx] = { ...buffer[idx], char: out as string | number }
                        }
                        // Fix undefined / null / etc.
                        if (!Boolean(buffer[idx].char) && buffer[idx].char !== 0) {
                            buffer[idx].char = EMPTY_CELL
                        }
                    }
                }
            }

            // 4. --------------------------------------------------------------
            // Call post(), if defined
            if (typeof program.post == 'function') {
                program.post(context, cursor, buffer, variables)
            }

            // 5. --------------------------------------------------------------
            renderer.render(context, buffer, settings)

            // 6. --------------------------------------------------------------
            // Queued events
            // FIXME
            // while (eventQueue.length > 0) {
            //     const type = eventQueue.shift()
            //     if (type && typeof program[type] == 'function') {
            //         program[type](context, cursor, buffer)
            //     }
            // }

            // 7. --------------------------------------------------------------
            // Loop (eventually)
            if (!settings.once) requestAnimationFrame(loop)

            // The end of the first frame is reached without errors
            // the promise can be resolved.
            resolve(context)
        }
    })
}

// -- Helpers ------------------------------------------------------------------

// Build / update the 'context' object (immutable)
// A bit of spaghetti... but the context object needs to be ready for
// the boot function and also to be updated at each frame.
function getContext<TVariables = any>(state: State, settings: Settings, metrics: Metrics, fps: FPS, variables: TVariables): Context<TVariables> {
    if (!settings.element) {
        throw new Error('Element is not defined');
    }
    const rect = settings.element.getBoundingClientRect()
    const cols = settings.cols || Math.floor(rect.width / metrics.cellWidth)
    const rows = settings.rows || Math.floor(rect.height / metrics.lineHeight)
    return Object.freeze({
        frame: state.frame,
        time: state.time,
        cols,
        rows,
        metrics,
        width: rect.width,
        height: rect.height,
        settings,
        // Runtime & debug data
        runtime: Object.freeze({
            cycle: state.cycle,
            fps: fps.fps
            // updatedRowNum
        }),
        variables
    }) as Context<TVariables>;
}

// Disables selection for an HTML element
function disableSelect(el: HTMLElement): void {
    el.style.userSelect = 'none';
    (el.style as any).webkitUserSelect = 'none'; // for Safari on mac and iOS
    (el.style as any).mozUserSelect = 'none';    // for mobile FF
    el.dataset.selectionEnabled = 'false';
}

// Enables selection for an HTML element
function enableSelect(el: HTMLElement): void {
    el.style.userSelect = 'auto';
    (el.style as any).webkitUserSelect = 'auto';
    (el.style as any).mozUserSelect = 'auto';
    el.dataset.selectionEnabled = 'true';
}

// Copies the content of an element to the clipboard
export function copyContent(el: HTMLElement): void {
    // Store selection default
    const selectionEnabled = el.dataset.selectionEnabled !== 'false'

    // Enable selection if necessary
    if (!selectionEnabled) enableSelect(el)

    // Copy the text block
    const range = document.createRange()
    range.selectNode(el)
    const sel = window.getSelection()
    if (sel) {
        sel.removeAllRanges()
        sel.addRange(range)
        document.execCommand('copy')
        sel.removeAllRanges()
    }

    // Restore default, if necessary
    if (!selectionEnabled) disableSelect(el)
}

// Calcs width (fract), height, aspect of a monospaced char
// assuming that the CSS font-family is a monospaced font.
// Returns a mutable object.
export function calcMetrics(el: HTMLElement): Metrics {

    const style = getComputedStyle(el)

    // Extract info from the style: in case of a canvas element
    // the style and font family should be set anyways.
    const fontFamily = style.getPropertyValue('font-family')
    const fontSize = parseFloat(style.getPropertyValue('font-size'))
    // Can't rely on computed lineHeight since Safari 14.1
    // See:  https://bugs.webkit.org/show_bug.cgi?id=225695
    const lineHeight = parseFloat(style.getPropertyValue('line-height'))
    let cellWidth: number

    // If the output element is a canvas 'measureText()' is used
    // else cellWidth is computed 'by hand' (should be the same, in any case)
    if (el.nodeName == 'CANVAS') {
        const canvas = el as HTMLCanvasElement
        const ctx = canvas.getContext('2d')
        if (ctx) {
            ctx.font = fontSize + 'px ' + fontFamily
            cellWidth = ctx.measureText(''.padEnd(50, 'X')).width / 50
        } else {
            throw new Error('Could not get canvas context')
        }
    } else {
        const span = document.createElement('span')
        el.appendChild(span)
        span.innerHTML = ''.padEnd(50, 'X')
        cellWidth = span.getBoundingClientRect().width / 50
        el.removeChild(span)
    }

    const metrics: Metrics = {
        aspect: cellWidth / lineHeight,
        cellWidth,
        lineHeight,
        fontFamily,
        fontSize,
        // Semi-hackish way to allow an update of the metrics object.
        // This may be useful in some situations, for example
        // responsive layouts with baseline or font change.
        // NOTE: It's not an immutable object anymore
        _update: function () {
            const tmp = calcMetrics(el)
            for (var k in tmp) {
                // NOTE: Object.assign won't work
                if (typeof tmp[k as keyof Metrics] == 'number' || typeof tmp[k as keyof Metrics] == 'string') {
                    (metrics as any)[k] = tmp[k as keyof Metrics]
                }
            }
        }
    }

    return metrics
}