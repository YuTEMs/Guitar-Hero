/**
 * This file mainly handles the state changes to the game as to
 * remain as pure as possible without affecting outside elements
 */



import {State, NoteType, backgroundNote, Body} from "./types"
import {RNG, not, except} from "./util"

export {Viewport, Constants, Note, reduceState,
        Tick,createMusic, keyPressingDown, createPlayableNotes}
export type {Action}


/** Constants */

const Viewport = {
    CANVAS_WIDTH: 200,
    CANVAS_HEIGHT: 400,
} as const;

const Constants = {
    TICK_RATE_MS: 5,
    SONG_NAME: "RockinRobin",
    NOTE_HITBOX_Y:350,
    NOTE_SPEED:1,
    DEFAULT_MULTIPLIER:1,
    COLUMN:20
} as const;

const Note = {
    RADIUS: 0.07 * Viewport.CANVAS_WIDTH,
    TAIL_WIDTH: 10,
};


/** Functions */
const randomBody = (s:State):Body=>
    {
        const instruments= [
            "bass-electric",
            "violin",
            "piano",
            "trumpet",
            "saxophone",
            "trombone",
            "flute",
        ] as const
        return{
            id:"",
            r:"",
            cx:"",
            cy:"",
            style:"",
            class:"",
            viewType:"head",
            instrument: instruments[Math.floor((RNG.scale(s.seed)+1)/2*(instruments.length-1))],
            midi: Math.floor((RNG.scale(s.seed)+1)*30/2+30),
            duration: (RNG.scale(s.seed)+1)/4+0.5,
            startTime: 0,
            velocity: Math.floor((RNG.scale(s.seed)+2)*2) //2 to 6
        }
    }

const bodyToBackground = (s:State)=>(perfect:boolean)=>
(body:Body):backgroundNote=>
    ({
        instrument: body.instrument,
        midi: body.midi,
        duration: perfect
                ? body.duration
                : (RNG.scale(s.seed)+1)/4,
        startTime: body.startTime,
        velocity: body.velocity
    })

//////////////// STATE UPDATES //////////////////////

// Action types that trigger game state transitions


/**
 * The tick class handles the game state and some
 * of it's roles includes cleaning up the
 * background music as to not clog the array in State
 */
class Tick implements Action{
    constructor(public readonly elapsed : number) {}

    apply(s: State): State {
        const 
            expired = (n:Body) => 
                Number(n.cy) > Viewport.CANVAS_HEIGHT,
            missed = (n:Body) => 
                Number(n.cy) > Constants.NOTE_HITBOX_Y + Note.RADIUS,
            expiredNotes :Body[] = s.notes.filter(expired),
            missedNotes: Body[] = s.notes.filter(missed),
            activeNotes: Body[] = s.notes.filter(not(expired))
        return {
            ...s,
            notes: activeNotes.map(Tick.moveNote),
            backgroundNotes: [],
            ComboCounter: missedNotes.length > 0 
                          ? 0 
                          : s.ComboCounter,
            multiplierCounter: missedNotes.length > 0 
                               ? Constants.DEFAULT_MULTIPLIER
                               : s.multiplierCounter,
            exit: expiredNotes,
            noteCount: s.noteCount + expiredNotes.length,
            gameEnd: s.musicCount === s.finalMusicCount 
                     && s.finalMusicCount !== 0
                     && s.noteCount === s.finalNoteCount 
                     ? true 
                     : false,
            imperfectComboSound: [],
            perfectComboSound: [],
            missedComboSound: [],
        }
    }

    static moveNote = (o:Body):Body => ({
        ...o,
        cy: String(Number(o.cy)+Constants.NOTE_SPEED)
    })   
}



class createPlayableNotes implements Action{
    constructor(public readonly note: NoteType){}
    apply = (s:State) => ({
        ...s,
        notes: [...s.notes, {...this.note,viewType:"head"} as Body]
    })
}



/**
 * This class is mainly used for keyboard inputs to update the keyboard
 * state as well as handling note hitting
 */
class keyPressingDown implements Action{
    constructor(public readonly keynum:number){}

    apply = (s:State) => {
        const
            sameLane = (note:Body) =>
                this.keynum+1 === Number(note.cx.slice(0,2))/Constants.COLUMN,
            noteHitted = (note:Body) => 
                Constants.NOTE_HITBOX_Y - Number(note.cy) < Number(note.r)*2,
            perfectlyAligned = (note:Body) => 
                Constants.NOTE_HITBOX_Y - Note.RADIUS === Number(note.cy),
            
            collidedNotes: Body[] = s.notes.filter(sameLane),
            imperfectNotes: Body[] = collidedNotes.filter(noteHitted),
  
            perfectNotes: Body[] = collidedNotes.filter(perfectlyAligned),
            
            // mainly to take into account overlapping notes
            noteScore = imperfectNotes.reduce((acc,curr)=>acc.length === 0 
            ? [...acc,curr]
            :acc.some((note)=>note.cy === curr.cy && note.cx === curr.cx) 
            ? acc 
            : [...acc,curr]
            ,[] as ReadonlyArray<Body>), 

            playImperfectNotes:backgroundNote[] = imperfectNotes.map((note)=>bodyToBackground(s)(false)(note)),

            playPerfectNotes:backgroundNote[] = perfectNotes.map((note)=>bodyToBackground(s)(true)(note)),

            playMissedNotes: backgroundNote[] = 
                playImperfectNotes.length === 0 
                ? [bodyToBackground(s)(true)(randomBody(s))]
                : [],

            cut = except(
                (a:Body) => (b:Body) => 
                    a.cx === b.cx 
                    && Number(a.cy) > 350-Note.RADIUS*2
            ),
            cutMusic = except(
                (a:backgroundNote) => (b:backgroundNote) => 
                    a.instrument === b.instrument 
                    && a.midi === b.midi 
                    && a.startTime === b.startTime 
                    && a.velocity === b.velocity
            )
            
        return {...s,
            notes: cut(s.notes)(imperfectNotes),
            exit: s.exit.concat(imperfectNotes),
            score: s.score + noteScore.length*s.multiplierCounter,
            multiplierCounter: playMissedNotes.length > 0
                               ? Constants.DEFAULT_MULTIPLIER
                               : s.ComboCounter % 10 === 0 
                               ? (s.multiplierCounter*10 + 2)/10
                               : s.multiplierCounter,
            imperfectComboSound: cutMusic(playImperfectNotes)(playPerfectNotes),
            perfectComboSound: playPerfectNotes,
            missedComboSound:  playMissedNotes,
            ComboCounter: playMissedNotes.length > 0 
                          ? 0 
                          : s.ComboCounter + noteScore.length,
            noteCount: s.noteCount + imperfectNotes.length,
            seed: playMissedNotes.length > 0 ? RNG.hash(s.seed) : s.seed
        }
    
    }

        
}

/**
 * This class will return back the original state and will only
 * play music
 */
class createMusic implements Action{
    constructor(public readonly bgnote: backgroundNote
        , public readonly finalMusicCount:number
        , public readonly finalNoteCount:number) {}

    apply = (s:State) => ({
        ...s,
        backgroundNotes: [this.bgnote],
        musicCount: s.musicCount + 1,
        finalMusicCount: this.finalMusicCount,
        finalNoteCount: this.finalNoteCount
    })
}


/**
     * state transducer
     * @param s input State
     * @param action type of action to apply to the State
     * @returns a new State 
     */
const reduceState = (s: State, action: Action) => action.apply(s);

interface Action{
    apply(s: State):State
}