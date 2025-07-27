import "./style.css";

import { fromEvent, interval, merge, Observable, of, Subscription, timer } from "rxjs";
import { map, filter, scan, mergeMap, delay } from "rxjs/operators";
import * as Tone from "tone";
import { SampleLibrary } from "./tonejs-instruments";

import {Constants, Note, reduceState, Tick, Action, createMusic,
        keyPressingDown, createPlayableNotes} from "./state"

import {initialState, Key, Event, State, backgroundNote, NoteType} from "./types"

import {updateView} from "./view"




function showKeys(){
    function showKey(k: Key) {
        const arrowKey = document.getElementById(k)
        // getElement might be null, in this case return without doing anything
        if (!arrowKey) return
        const o = (e: Event) => fromEvent<KeyboardEvent>(document, e).pipe(
          filter(({ code }) => code === k))
        o('keydown').subscribe(_ => arrowKey.classList.add("highlight"))
        o('keyup').subscribe(_ => arrowKey.classList.remove("highlight"))
      }
    showKey("KeyQ")
    showKey("KeyW")
    showKey("KeyO")
    showKey("KeyP")
}


/**
 * This is the function called on page load.
 */
export function main(csvContents: string, samples: { [key: string]: Tone.Sampler }) {
    // first process the csv
    const csvLines = csvContents.split('\n').slice(1)
    const csvValues = csvLines.map((line)=>line.split(','))
    const userPlayedFalse = csvValues.filter((array)=>array[0]=="False")
    const userPlayedTrue = csvValues.filter((array)=>array[0]=="True")

    const backgroundNoteList:Observable<backgroundNote> = of(...userPlayedFalse).pipe(map((array)=>({
        instrument: array[1],
        midi: Number(array[3]),
        duration:Number(array[5])-Number(array[4]),
        startTime: Number(array[4]),
        velocity: Number(array[2]) /300
    } as backgroundNote)))

    const finalMusicCount = userPlayedFalse.length
    const finalNoteCount = userPlayedTrue.length

    const playableNotes:Observable<NoteType> = of(...userPlayedTrue).pipe(
        map((array, index)=>({
            id: `${index}`,
            r:`${Note.RADIUS}`,
            cx: Number(array[3]) % 4 + 1 > 4 
                ? "80%" 
                : `${(Number(array[3]) % 4 +1)*20}%`,
            cy: "0",
            style: Number(array[3]) % 4 + 1 === 1 
                   ? "fill: green" 
                   : Number(array[3]) % 4 + 1 === 2 
                   ? "fill: red" 
                   : Number(array[3]) % 4 + 1 === 3 
                   ? "fill: blue" 
                   : "fill: yellow",
            class: "shadow",
            instrument: array[1],
            midi: Number(array[3]),
            duration:Number(array[5])-Number(array[4]),
            startTime: Number(array[4]),
            velocity: Number(array[2])/120
            }
        ))
    )
    

    // ACTION OBSERVABLES

    const backgroundMusic$:Observable<Action> = backgroundNoteList.pipe(
        mergeMap(
        (bgnote)=> timer(bgnote.startTime*1000)
            .pipe(
                delay(Constants.TICK_RATE_MS*Constants.NOTE_HITBOX_Y),
                map((_)=>new createMusic(bgnote, finalMusicCount, finalNoteCount))
            )
        )
    )

    const playableNotes$:Observable<Action> = playableNotes.pipe(
        mergeMap(
            (note)=> of(note)
            .pipe(
                delay(note.startTime*1000),
                map(_=>new createPlayableNotes(note))
                )
            )
        ) 

    /** User input */

    const key$ = fromEvent<KeyboardEvent>(document, "keypress");

    const fromKey = (keyCode: Key) =>
        key$.pipe(
            filter(({ code }) => code === keyCode)
        )
    
    const keyQ$ = fromKey("KeyQ").pipe(map(_=>new keyPressingDown(0)))
    const keyW$ = fromKey("KeyW").pipe(map(_=>new keyPressingDown(1)))
    const keyO$ = fromKey("KeyO").pipe(map(_=>new keyPressingDown(2)))
    const keyP$ = fromKey("KeyP").pipe(map(_=>new keyPressingDown(3)))

    /** Determines the rate of time steps */
    const tick$ = interval(Constants.TICK_RATE_MS).pipe(map((elapsed:number)=>new Tick(elapsed)))


    const action$:Observable<Action> = merge(tick$, backgroundMusic$, keyQ$, keyW$, keyO$, keyP$,playableNotes$)
    const state$:Observable<State> = action$.pipe(scan(reduceState,initialState))
    const subscription: Subscription = state$.subscribe(updateView(()=>subscription.unsubscribe(),samples))
}


if (typeof window !== "undefined") {
    // Load in the instruments
    const samples = SampleLibrary.load({
        instruments: [
            "bass-electric",
            "violin",
            "piano",
            "trumpet",
            "saxophone",
            "trombone",
            "flute",
        ], // SampleLibrary.list,
        baseUrl: "samples/",
    });

    const startGame = (contents: string) => {
        document.body.addEventListener(
            "mousedown",
            function () {
                main(contents, samples);
                showKeys();
            },
            { once: true },
        );
    };

    const { protocol, hostname, port } = new URL(import.meta.url);
    const baseUrl = `${protocol}//${hostname}${port ? `:${port}` : ""}`;

    Tone.ToneAudioBuffer.loaded().then(() => {
        for (const instrument in samples) {
            samples[instrument].toDestination();
            samples[instrument].release = 0.5;
        }

        fetch(`${baseUrl}/assets/${Constants.SONG_NAME}.csv`)
            .then((response) => response.text())
            .then((text) => startGame(text))
            .catch((error) =>
                console.error("Error fetching the CSV file:", error),
            );
        
    });
}
