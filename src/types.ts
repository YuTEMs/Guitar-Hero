export {initialState}
export type {Key, Event, State, NoteType, backgroundNote, viewType, Body}




/** User input */

type Key = "KeyQ" | "KeyW" | "KeyO" | "KeyP";

type Event = "keydown" | "keyup" | "keypress";


/** State processing */

type State = Readonly<{
    gameEnd: boolean;
    notes: ReadonlyArray<Body>,
    exit: ReadonlyArray<NoteType>,
    backgroundNotes: ReadonlyArray<backgroundNote>,
    imperfectComboSound: ReadonlyArray<backgroundNote>,
    perfectComboSound: ReadonlyArray<backgroundNote>,
    missedComboSound: ReadonlyArray<backgroundNote>,
    ComboCounter: number,
    multiplierCounter: number,
    score: number,
    musicCount: number,
    finalMusicCount: number,
    noteCount: number,
    finalNoteCount: number,
    seed: number
}>;



type viewType = 'head' | 'tail'

type ObjectId = Readonly<{ id: string}>

interface IBody extends NoteType, ObjectId{
    viewType: viewType
}

type Body = Readonly<IBody>

type backgroundNote = Readonly<{
    instrument: string,
    midi: number,
    duration: number,
    startTime: number,
    velocity: number
}>

interface NoteType extends ObjectId, backgroundNote {
    r: string,
    cx: string,
    cy: string,
    style: string,
    class: string,
}

const initialState: State = {
    gameEnd: false,
    notes: [],
    exit:[],
    backgroundNotes: Array(1),
    imperfectComboSound: [],
    perfectComboSound: [],
    missedComboSound: [],
    ComboCounter: 0,
    multiplierCounter: 1,
    score: 0,
    musicCount:0,
    finalMusicCount:0,
    noteCount: 0,
    finalNoteCount: 0,
    seed:0
} as const;

