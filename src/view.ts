export {updateView}
import {State, backgroundNote, Body, NoteType} from "./types"

import {attr, isNotNullOrUndefined} from "./util"

import {Viewport, Note} from "./state"

import * as Tone from "tone";

/** Rendering (side effects) */



/**
 * Creates an SVG element with the given properties.
 *
 *
 * @param namespace Namespace of the SVG element
 * @param name SVGElement name
 * @param props Properties to set on the SVG element
 * @returns SVG element
 */
const createSvgElement = (
    namespace: string | null,
    name: string,
    props: Record<string, string> = {},
) => {
    const elem = document.createElementNS(namespace, name) as SVGElement;
    Object.entries(props).forEach(([k, v]) => elem.setAttribute(k, v));
    return elem;
};



function updateView (onFinish: ()=> void, samples: { [key: string]: Tone.Sampler }){
    return function (s: State):void {
    
        // Canvas elements
        const svg = document.querySelector("#svgCanvas") as SVGGraphicsElement &
            HTMLElement;
        const preview = document.querySelector(
            "#svgPreview",
        ) as SVGGraphicsElement & HTMLElement;
        const gameover = document.querySelector("#gameOver") as SVGGraphicsElement &
            HTMLElement;
        // Text fields
        const multiplier = document.querySelector("#multiplierText") as HTMLElement;
        const highScoreText = document.querySelector(
            "#highScoreText",
        ) as HTMLElement;
        const container = document.querySelector("#main") as HTMLElement;
        const scoreText = document.querySelector("#scoreText") as HTMLElement;
        const comboText = document.querySelector("#comboText") as HTMLElement;

        svg.setAttribute("height", `${Viewport.CANVAS_HEIGHT}`);
        svg.setAttribute("width", `${Viewport.CANVAS_WIDTH}`);
        
        
        // Display
        scoreText.innerHTML = String(Math.floor(s.score))
        comboText.innerHTML = String(s.ComboCounter)
        multiplier.innerHTML = String(s.multiplierCounter)

        

        /**
         * This function will play music and takes an array of strings
         * @param array this should contain the csv lines from RockinRobin
         */
        const playMusicNotes = (bgnote:backgroundNote) => {
            samples[bgnote.instrument].triggerAttackRelease(
                Tone.Frequency(bgnote.midi, "midi").toNote(),
                bgnote.duration,
                Tone.now(),
                bgnote.velocity  // set to this value as to not hurt the instructor's ears
            )
        }

        /**
         * Displays a SVG element on the canvas. Brings to foreground.
         * @param elem SVG element to display
         */
        const show = (elem: SVGGraphicsElement) => {
            elem.setAttribute("visibility", "visible");
            elem.parentNode!.appendChild(elem);
        };

        /**
         * Hides a SVG element on the canvas.
         * @param elem SVG element to hide
         */
        const hide = (elem: SVGGraphicsElement) =>{
            elem.setAttribute("visibility", "hidden");
            }


        const updateBodyView = (rootSVG: HTMLElement) => (b: Body) => {
        function createBodyView() {
            const v = createSvgElement(rootSVG.namespaceURI, "circle", {
                r:`${Note.RADIUS}`,
                id: b.id,
                cx: b.cx,
                cy: b.cy,
                style: b.style,
                class: "shadow"
            })
            v.classList.add(b.viewType)
            rootSVG.appendChild(v)
            return v;
        }
        const v = document.getElementById(b.id) || createBodyView();
        attr(v, {cx:b.cx, cy: b.cy, style:b.style, class:b.class});
        };


        s.notes.forEach(updateBodyView(svg))

        const trashCompiler = (value:readonly NoteType[]) => {
            value.map(o => document.getElementById(o.id))
            .filter(isNotNullOrUndefined)
            .forEach(v => {
                try {
                    svg.removeChild(v)
                } catch (e) {
                    // rarely it can happen that a bullet can be in exit
                    // for both expiring and colliding in the same tick,
                    // which will cause this exception
                    console.log("Already removed: " + v.id)
                }
            })
        }
        trashCompiler(s.exit)
            
        
        s.backgroundNotes.forEach(playMusicNotes)
        s.imperfectComboSound.forEach(playMusicNotes)
        s.perfectComboSound.forEach(playMusicNotes)
        s.missedComboSound.forEach(playMusicNotes)

        if (s.gameEnd) {
            show(gameover)
            onFinish();
        } else {
            hide(gameover);
        }
    
}
        
}
