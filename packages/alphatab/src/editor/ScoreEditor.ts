import type { AlphaTabApiBase } from '@coderline/alphatab/AlphaTabApiBase';
import { AlphaTabError, AlphaTabErrorType } from '@coderline/alphatab/AlphaTabError';
import {
    EventEmitter,
    EventEmitterOfT,
    type IEventEmitter,
    type IEventEmitterOfT
} from '@coderline/alphatab/EventEmitter';
import { NotationMode } from '@coderline/alphatab/NotationSettings';
import { CompositeEditCommand } from '@coderline/alphatab/editor/CompositeEditCommand';
import type { EditCommand } from '@coderline/alphatab/editor/EditCommand';
import { EditCommandHistory } from '@coderline/alphatab/editor/EditCommandHistory';
import { EditCursor } from '@coderline/alphatab/editor/EditCursor';
import { EditModelHelpers } from '@coderline/alphatab/editor/EditModelHelpers';
import { FretInputState } from '@coderline/alphatab/editor/FretInputState';
import { ScoreEditKind, ScoreEditedEventArgs } from '@coderline/alphatab/editor/ScoreEditedEventArgs';
import { StaffHitInfo } from '@coderline/alphatab/editor/StaffHitInfo';
import { AddBeatCommand } from '@coderline/alphatab/editor/commands/AddBeatCommand';
import { AddNoteCommand } from '@coderline/alphatab/editor/commands/AddNoteCommand';
import { ChangeBeatDurationCommand } from '@coderline/alphatab/editor/commands/ChangeBeatDurationCommand';
import { ChangeNoteFretCommand } from '@coderline/alphatab/editor/commands/ChangeNoteFretCommand';
import { ChangeNotePitchCommand } from '@coderline/alphatab/editor/commands/ChangeNotePitchCommand';
import { ClearBeatNotesCommand } from '@coderline/alphatab/editor/commands/ClearBeatNotesCommand';
import { RemoveBeatCommand } from '@coderline/alphatab/editor/commands/RemoveBeatCommand';
import { RemoveNoteCommand } from '@coderline/alphatab/editor/commands/RemoveNoteCommand';
import { ToggleBeatDotCommand } from '@coderline/alphatab/editor/commands/ToggleBeatDotCommand';
import { ToggleNoteTieCommand } from '@coderline/alphatab/editor/commands/ToggleNoteTieCommand';
import { Beat } from '@coderline/alphatab/model/Beat';
import { Clef } from '@coderline/alphatab/model/Clef';
import { Duration } from '@coderline/alphatab/model/Duration';
import { GraceType } from '@coderline/alphatab/model/GraceType';
import { InstrumentArticulation } from '@coderline/alphatab/model/InstrumentArticulation';
import { ModelUtils } from '@coderline/alphatab/model/ModelUtils';
import { Note } from '@coderline/alphatab/model/Note';
import type { Cursors } from '@coderline/alphatab/platform/Cursors';
import type { IContainer } from '@coderline/alphatab/platform/IContainer';
import type { IKeyboardEventArgs } from '@coderline/alphatab/platform/IKeyboardEventArgs';
import type { IMouseEventArgs } from '@coderline/alphatab/platform/IMouseEventArgs';
import type { RenderHints } from '@coderline/alphatab/rendering/IScoreRenderer';

/**
 * Provides interactive editing of the currently rendered score:
 * an edit cursor, keyboard/mouse note entry and undo/redo.
 * An instance is created by the {@link AlphaTabApiBase} when {@link EditorSettings.enabled} is set.
 * @public
 */
export class ScoreEditor<TSettings> {
    private readonly _api: AlphaTabApiBase<TSettings>;
    private readonly _history: EditCommandHistory;
    private readonly _cursor: EditCursor;
    private readonly _fretInput: FretInputState;
    private _cursors: Cursors | null = null;
    private _midiDirty: boolean = false;
    private _midiRefresh: () => void;
    private _subscriptions: (() => void)[] = [];

    public constructor(api: AlphaTabApiBase<TSettings>) {
        if (api.settings.notation.notationMode !== NotationMode.GuitarPro) {
            throw new AlphaTabError(
                AlphaTabErrorType.General,
                'The score editor requires the GuitarPro notation mode, editing in SongBook mode is not supported'
            );
        }

        this._api = api;
        this._history = new EditCommandHistory();
        this._history.maxSteps = api.settings.editor.maxUndoSteps;
        this._cursor = new EditCursor();
        this._fretInput = new FretInputState();
        this._midiRefresh = api.uiFacade.throttle(() => {
            if (this._midiDirty) {
                this._midiDirty = false;
                this._api.loadMidiForScore();
            }
        }, 300);

        this._setupKeyHandling();
        this._setupMouseHandling();

        this._subscriptions.push(
            api.postRenderFinished.on(() => {
                this._placeEditCursor();
            })
        );

        this._subscriptions.push(
            api.scoreLoaded.on(score => {
                // protect against id collisions for scores restored via JSON
                // (deserialization keeps ids without resetting the global counters).
                ModelUtils.syncIdCounters(score);
                this._history.clear();
                this._cursor.beat = null;
                this._ensureCursorBeat();
            })
        );
        if (api.score) {
            ModelUtils.syncIdCounters(api.score);
        }
    }

    /**
     * This event is fired when the edit cursor position changed.
     */
    public readonly cursorChanged: IEventEmitterOfT<EditCursor> = new EventEmitterOfT<EditCursor>();

    /**
     * This event is fired when the beat range selection changed (including
     * when it is cleared).
     */
    public readonly selectionChanged: IEventEmitter = new EventEmitter();

    /**
     * This event is fired when an edit was applied to the score (command, undo or redo).
     */
    public readonly scoreEdited: IEventEmitterOfT<ScoreEditedEventArgs> = new EventEmitterOfT<ScoreEditedEventArgs>();

    /**
     * This event is fired when the undo/redo history changed.
     */
    public readonly historyChanged: IEventEmitter = new EventEmitter();

    /**
     * The logical editing position within the score.
     */
    public get cursor(): EditCursor {
        return this._cursor;
    }

    private _selectionAnchor: Beat | null = null;

    /**
     * The current beat range selection as [start, end] in playback order,
     * within the anchor's staff and voice. Null when nothing is selected.
     * Extended with Shift+Arrow keys / Shift+Click, cleared by plain
     * navigation, clicks, edits and Escape.
     */
    public get selectionRange(): Beat[] | null {
        const anchor = this._selectionAnchor;
        const cursorBeat = this._cursor.beat;
        if (!anchor || !cursorBeat || anchor === cursorBeat) {
            return null;
        }
        if (anchor.voice.bar.staff !== cursorBeat.voice.bar.staff || anchor.voice.index !== cursorBeat.voice.index) {
            return null;
        }
        const anchorFirst =
            anchor.voice.bar.index < cursorBeat.voice.bar.index ||
            (anchor.voice.bar.index === cursorBeat.voice.bar.index &&
                anchor.voice.beats.indexOf(anchor) <= cursorBeat.voice.beats.indexOf(cursorBeat));
        return anchorFirst ? [anchor, cursorBeat] : [cursorBeat, anchor];
    }

    /**
     * Clears the beat range selection.
     */
    public clearSelection(): void {
        if (this._selectionAnchor) {
            this._selectionAnchor = null;
            (this.selectionChanged as EventEmitter).trigger();
        }
    }

    private _extendSelection(move: () => boolean): void {
        const anchor = this._selectionAnchor ?? this._cursor.beat;
        if (move()) {
            // selecting across staves/voices is not supported: re-anchor.
            const cursorBeat = this._cursor.beat;
            this._selectionAnchor =
                anchor &&
                cursorBeat &&
                anchor.voice.bar.staff === cursorBeat.voice.bar.staff &&
                anchor.voice.index === cursorBeat.voice.index
                    ? anchor
                    : cursorBeat;
            this._fretInput.reset();
            (this.cursorChanged as EventEmitterOfT<EditCursor>).trigger(this._cursor);
            (this.selectionChanged as EventEmitter).trigger();
            this._placeEditCursor();
        }
    }

    /**
     * Whether there is a command which can be undone.
     */
    public get canUndo(): boolean {
        return this._history.canUndo;
    }

    /**
     * Whether there is an undone command which can be re-applied.
     */
    public get canRedo(): boolean {
        return this._history.canRedo;
    }

    /**
     * Executes the given command and registers it in the undo history.
     * This is also the extension point for custom host application commands.
     * @param command The command to execute.
     * @param mergeWithPrevious Whether to merge this command into the previous undo entry.
     */
    public executeCommand(command: EditCommand, mergeWithPrevious: boolean = false): void {
        this._history.execute(command, mergeWithPrevious);
        this._afterEdit(command, ScoreEditKind.Command, mergeWithPrevious);
    }

    /**
     * Undoes the most recent edit.
     */
    public undo(): void {
        const command = this._history.undo();
        if (command) {
            this._afterEdit(command, ScoreEditKind.Undo);
        }
    }

    /**
     * Re-applies the most recently undone edit.
     */
    public redo(): void {
        const command = this._history.redo();
        if (command) {
            this._afterEdit(command, ScoreEditKind.Redo);
        }
    }

    /**
     * Sets the fret of the note on the cursor string, creating the note if there is none.
     * @param fret The fret to set.
     * @param mergeWithPrevious Whether to merge this edit into the previous undo entry.
     */
    public setFretAtCursor(fret: number, mergeWithPrevious: boolean = false): void {
        const beat = this._cursor.beat;
        const staff = this._cursor.staff;
        if (!beat || !staff || !staff.isStringed) {
            return;
        }
        const existing = beat.getNoteOnString(this._cursor.string);
        if (existing) {
            this.executeCommand(new ChangeNoteFretCommand(existing, fret), mergeWithPrevious);
        } else {
            const note = new Note();
            note.string = this._cursor.string;
            note.fret = fret;
            this.executeCommand(new AddNoteCommand(beat, note), mergeWithPrevious);
        }
    }

    /**
     * Enters a note of the given pitch at the cursor position.
     * On stringed staves the pitch is translated to a string/fret combination,
     * on other staves the pitch is stored as octave/tone.
     * @param noteValue The WRITTEN midi value of the note to enter (what
     * appears on the staff — the staff's display transposition, e.g. a
     * piccolo's octave, is applied internally for storage).
     */
    public setPitchAtCursor(noteValue: number): void {
        const beat = this._cursor.beat;
        const staff = this._cursor.staff;
        // percussion staves have no pitch axis — use setPercussionAtCursor.
        if (!beat || !staff || staff.isPercussion) {
            return;
        }
        // notes are STORED at sounding pitch and DISPLAYED shifted by the
        // staff's display transposition — convert the written input value.
        const storedValue = noteValue + staff.displayTranspositionPitch;

        if (staff.isStringed) {
            const maxFret = this._api.settings.editor.maxFret;
            let noteString = this._cursor.string;
            let fret = EditModelHelpers.fretForValue(staff, noteString, storedValue, maxFret);
            if (fret === -1) {
                for (let s = 1; s <= staff.tuning.length; s++) {
                    fret = EditModelHelpers.fretForValue(staff, s, storedValue, maxFret);
                    if (fret !== -1) {
                        noteString = s;
                        break;
                    }
                }
            }
            if (fret === -1) {
                return;
            }
            this._cursor.string = noteString;
            const existing = beat.getNoteOnString(noteString);
            if (existing) {
                this.executeCommand(new ChangeNoteFretCommand(existing, fret));
            } else {
                const note = new Note();
                note.string = noteString;
                note.fret = fret;
                this.executeCommand(new AddNoteCommand(beat, note));
            }
        } else {
            const octave = Math.floor(storedValue / 12);
            const tone = storedValue - octave * 12;
            const existing = this._cursor.note;
            if (existing) {
                this.executeCommand(new ChangeNotePitchCommand(existing, octave, tone));
            } else {
                const note = new Note();
                note.octave = octave;
                note.tone = tone;
                this.executeCommand(new AddNoteCommand(beat, note));
            }
        }

        this._cursor.noteValue = noteValue;
    }

    /**
     * Enters a percussion note at the cursor position, associating it with
     * the instrument articulation for the given General MIDI number
     * (created on the track when missing).
     * @param midiNumber The General MIDI percussion number to enter (e.g. 38 = Acoustic Snare).
     * @param displayValue The staff display position as octave * 12 + tone
     * (MusicXML display-octave + 1, display-step).
     * @param noteheadName The MusicXML notehead name to notate the note with
     * (empty for the standard round heads).
     */
    public setPercussionAtCursor(midiNumber: number, displayValue: number, noteheadName: string = ''): void {
        const beat = this._cursor.beat;
        const staff = this._cursor.staff;
        if (!beat || !staff || staff.isStringed) {
            return;
        }
        for (const existing of beat.notes) {
            if (EditModelHelpers.percussionMidiOf(existing) === midiNumber) {
                return; // the element is already on the beat
            }
        }

        const track = staff.track;
        const [noteHeadDefault, noteHeadHalf, noteHeadWhole] = EditModelHelpers.noteheadSymbolsFor(noteheadName);
        let articulationIndex = track.percussionArticulations.findIndex(
            a => a.outputMidiNumber === midiNumber && a.noteHeadDefault === noteHeadDefault
        );
        if (articulationIndex === -1) {
            const articulation = new InstrumentArticulation(
                '',
                EditModelHelpers.percussionStaffLine(beat.voice.bar, displayValue),
                midiNumber,
                noteHeadDefault,
                noteHeadHalf,
                noteHeadWhole
            );
            articulationIndex = track.percussionArticulations.length;
            track.percussionArticulations.push(articulation);
        }

        const note = new Note();
        note.octave = (displayValue / 12) | 0;
        note.tone = displayValue - note.octave * 12;
        note.percussionArticulation = articulationIndex;
        const command = new AddNoteCommand(beat, note);
        command.percussionNotehead = noteheadName;
        this.executeCommand(command);
    }

    /**
     * Removes the percussion note of the cursor beat playing the given
     * General MIDI number, if any.
     * @param midiNumber The General MIDI percussion number to remove.
     */
    public removePercussionAtCursor(midiNumber: number): void {
        const beat = this._cursor.beat;
        if (!beat) {
            return;
        }
        for (const note of beat.notes) {
            if (EditModelHelpers.percussionMidiOf(note) === midiNumber) {
                this.executeCommand(new RemoveNoteCommand(note));
                return;
            }
        }
    }

    /**
     * Removes the note at the cursor position.
     */
    public removeNoteAtCursor(): void {
        const note = this._cursor.note;
        if (note) {
            this.executeCommand(new RemoveNoteCommand(note));
        }
    }

    /**
     * Repeats the previous beat onto the cursor beat: notes, duration and
     * dots are copied as one undoable step (MuseScore's "repeat" — a fast way
     * to enter riffs).
     */
    public repeatPreviousBeatAtCursor(): void {
        const beat = this._cursor.beat;
        if (!beat) {
            return;
        }
        let source = beat.previousBeat;
        while (source && source.graceType !== GraceType.None) {
            source = source.previousBeat;
        }
        if (!source || source.isEmpty || source.notes.length === 0) {
            return;
        }

        const commands: EditCommand[] = [];
        if (beat.notes.length > 0) {
            commands.push(new ClearBeatNotesCommand(beat));
        }
        if (beat.duration !== source.duration) {
            commands.push(new ChangeBeatDurationCommand(beat, source.duration));
        }
        if (beat.dots !== source.dots) {
            commands.push(new ToggleBeatDotCommand(beat, source.dots));
        }
        for (const sourceNote of source.notes) {
            const note = new Note();
            if (sourceNote.isStringed) {
                note.string = sourceNote.string;
                note.fret = sourceNote.fret;
            } else {
                note.octave = sourceNote.octave;
                note.tone = sourceNote.tone;
                note.percussionArticulation = sourceNote.percussionArticulation;
            }
            commands.push(new AddNoteCommand(beat, note));
        }
        this.executeCommand(new CompositeEditCommand('Repeat beat', commands));
    }

    /**
     * Removes the note of the cursor beat matching the given midi value
     * (without transposition/harmonics applied) — for host input surfaces
     * where clicking an existing note deletes it.
     * @param noteValue The midi value of the note to remove.
     */
    public removeNoteWithValue(noteValue: number): void {
        const beat = this._cursor.beat;
        if (!beat) {
            return;
        }
        for (const note of beat.notes) {
            if (EditModelHelpers.writtenValueOf(note) === noteValue) {
                this.executeCommand(new RemoveNoteCommand(note));
                return;
            }
        }
    }

    /**
     * Removes the beat at the cursor position. The last beat of a voice
     * is converted to a rest instead of being removed.
     */
    public removeBeatAtCursor(): void {
        const beat = this._cursor.beat;
        if (!beat) {
            return;
        }
        if (beat.voice.beats.length <= 1) {
            if (beat.notes.length > 0) {
                this.executeCommand(new ClearBeatNotesCommand(beat));
            }
            return;
        }
        const neighbor = beat.nextBeat ?? beat.previousBeat;
        this.executeCommand(new RemoveBeatCommand(beat));
        if (neighbor && this._cursor.beat === beat) {
            this._cursor.moveToBeat(neighbor);
            (this.cursorChanged as EventEmitterOfT<EditCursor>).trigger(this._cursor);
            this._placeEditCursor();
        }
    }

    /**
     * Inserts a new rest beat after the cursor position (same duration as the cursor beat)
     * and moves the cursor onto it.
     */
    public insertBeatAtCursor(): void {
        const beat = this._cursor.beat;
        if (!beat) {
            return;
        }
        const voice = beat.voice;
        const newBeat = new Beat();
        newBeat.duration = beat.duration;
        const insertIndex = voice.beats.indexOf(beat) + 1;
        this.executeCommand(new AddBeatCommand(voice, newBeat, insertIndex));
        this._cursor.moveToBeat(newBeat);
        (this.cursorChanged as EventEmitterOfT<EditCursor>).trigger(this._cursor);
        this._placeEditCursor();
    }

    /**
     * Sets the duration of the beat at the cursor position.
     */
    public setDurationAtCursor(duration: Duration): void {
        const beat = this._cursor.beat;
        if (beat && beat.duration !== duration) {
            this.executeCommand(new ChangeBeatDurationCommand(beat, duration));
        }
    }

    /**
     * Makes the beat at the cursor position one duration step shorter.
     */
    public shortenDurationAtCursor(): void {
        const beat = this._cursor.beat;
        if (beat) {
            this.setDurationAtCursor(EditModelHelpers.nextShorterDuration(beat.duration));
        }
    }

    /**
     * Makes the beat at the cursor position one duration step longer.
     */
    public lengthenDurationAtCursor(): void {
        const beat = this._cursor.beat;
        if (beat) {
            this.setDurationAtCursor(EditModelHelpers.nextLongerDuration(beat.duration));
        }
    }

    /**
     * Toggles the dots on the beat at the cursor position.
     * @param doubleDot Whether to toggle a double dot instead of a single dot.
     */
    public toggleDotAtCursor(doubleDot: boolean = false): void {
        const beat = this._cursor.beat;
        if (!beat) {
            return;
        }
        let newDots = 0;
        if (doubleDot) {
            newDots = beat.dots === 2 ? 0 : 2;
        } else {
            newDots = beat.dots === 1 ? 0 : 1;
        }
        this.executeCommand(new ToggleBeatDotCommand(beat, newDots));
    }

    /**
     * Toggles whether the note at the cursor position is tied to its predecessor.
     */
    public toggleTieAtCursor(): void {
        const note = this._cursor.note;
        if (note) {
            this.executeCommand(new ToggleNoteTieCommand(note, !note.isTieDestination));
        }
    }

    /**
     * Converts the beat at the cursor position to a rest by removing all its notes.
     */
    public makeRestAtCursor(): void {
        const beat = this._cursor.beat;
        if (beat && beat.notes.length > 0) {
            this.executeCommand(new ClearBeatNotesCommand(beat));
        }
    }

    /**
     * Moves the edit cursor to the next beat (crossing bar boundaries),
     * clearing any pending fret input — the programmatic equivalent of the
     * ArrowRight key, for host-side input surfaces (virtual fretboards…).
     */
    public moveCursorNextBeat(): void {
        this._moveCursor(() => this._cursor.moveNextBeat());
    }

    /**
     * Places the edit cursor at the given index-based location, clamping every
     * index to the current score shape. Intended for host applications
     * re-anchoring the cursor after replacing the score (e.g. an external
     * model reload).
     */
    public moveCursorToLocation(
        trackIndex: number,
        staffIndex: number,
        barIndex: number,
        voiceIndex: number,
        beatIndex: number,
        noteString: number = 0
    ): void {
        const score = this._api.score;
        if (!score || score.tracks.length === 0) {
            return;
        }
        const clamp = (value: number, max: number) => Math.max(0, Math.min(value, max - 1));
        const track = score.tracks[clamp(trackIndex, score.tracks.length)];
        const staff = track.staves[clamp(staffIndex, track.staves.length)];
        if (staff.bars.length === 0) {
            return;
        }
        const bar = staff.bars[clamp(barIndex, staff.bars.length)];
        if (bar.voices.length === 0) {
            return;
        }
        const voice = bar.voices[clamp(voiceIndex, bar.voices.length)];
        if (voice.beats.length === 0) {
            return;
        }
        this._cursor.moveToBeat(voice.beats[clamp(beatIndex, voice.beats.length)]);
        if (noteString > 0 && staff.isStringed) {
            this._cursor.string = Math.max(1, Math.min(noteString, staff.tuning.length));
        }
        this._fretInput.reset();
        (this.cursorChanged as EventEmitterOfT<EditCursor>).trigger(this._cursor);
        this._placeEditCursor();
    }

    /**
     * Resolves what a position on the rendered score points at, for host
     * note-input surfaces (ghost note preview, click-to-enter): the beat under
     * the position plus — on standard staves — the diatonic pitch the vertical
     * position corresponds to (natural, based on the bar's clef) and the
     * snapped coordinates of that staff step.
     * @param relX X-position relative to the rendered canvas element.
     * @param relY Y-position relative to the rendered canvas element.
     * @returns The hit information, or null when no beat is at the position.
     */
    public getStaffPositionAt(relX: number, relY: number): StaffHitInfo | null {
        const boundsLookup = this._api.renderer.boundsLookup;
        if (!boundsLookup) {
            return null;
        }
        // getBeatAtPos ignores which STAFF the y-position is in (player
        // semantics) — resolve the per-staff bar ourselves, then the beat.
        const anyBeat = boundsLookup.getBeatAtPos(relX, relY);
        if (!anyBeat) {
            return null;
        }
        const anyBounds = boundsLookup.findBeat(anyBeat);
        if (!anyBounds) {
            return null;
        }
        let staffBar = anyBounds.barBounds;
        for (const candidate of anyBounds.barBounds.masterBarBounds.bars) {
            if (relY >= candidate.realBounds.y && relY <= candidate.realBounds.y + candidate.realBounds.h) {
                staffBar = candidate;
                break;
            }
        }
        const staffBeatBounds = staffBar.findBeatAtPos(relX);
        let beat = staffBeatBounds ? staffBeatBounds.beat : anyBeat;
        if (beat.isEmpty) {
            // gap placeholder voices have no notation counterpart: retarget
            // the closest real beat of the bar's other voices.
            let best: Beat | null = null;
            let bestDistance = 0;
            for (const voice of beat.voice.bar.voices) {
                for (const candidate of voice.beats) {
                    if (candidate.isEmpty) {
                        continue;
                    }
                    const candidateBounds = boundsLookup.findBeat(candidate);
                    if (!candidateBounds) {
                        continue;
                    }
                    const distance = Math.abs(candidateBounds.visualBounds.x - relX);
                    if (!best || distance < bestDistance) {
                        best = candidate;
                        bestDistance = distance;
                    }
                }
            }
            if (!best) {
                return null;
            }
            beat = best;
        }
        const beatBounds = boundsLookup.findBeat(beat);
        if (!beatBounds) {
            return null;
        }

        const staff = beat.voice.bar.staff;
        const bounds = beatBounds.barBounds;
        // the content-independent staff line box; visual bounds as fallback.
        const lineTop = bounds.firstLineY >= 0 ? bounds.firstLineY : bounds.visualBounds.y;
        const lineBottom = bounds.lastLineY >= 0 ? bounds.lastLineY : bounds.visualBounds.y + bounds.visualBounds.h;
        const hit = new StaffHitInfo();
        hit.beat = beat;
        hit.isStringed = staff.isStringed;
        hit.snapX = beatBounds.visualBounds.x;

        if (staff.isStringed) {
            const stringCount = staff.tuning.length;
            const lineHeight = (lineBottom - lineTop) / (stringCount - 1);
            const lineIndex = Math.max(0, Math.min(stringCount - 1, Math.round((relY - lineTop) / lineHeight)));
            hit.string = stringCount - lineIndex;
            hit.snapY = lineTop + lineIndex * lineHeight;
            return hit;
        }

        // the top staff line's diatonic reference note per clef.
        let topStep: number; // 0 = C, 1 = D … 6 = B
        let topOctave: number;
        switch (beat.voice.bar.clef) {
            case Clef.G2:
                topStep = 3; // F5
                topOctave = 5;
                break;
            case Clef.F4:
                topStep = 5; // A3
                topOctave = 3;
                break;
            case Clef.C3:
                topStep = 4; // G4
                topOctave = 4;
                break;
            case Clef.C4:
                topStep = 2; // E4
                topOctave = 4;
                break;
            default:
                return null; // neutral/percussion: no pitch axis
        }

        const halfStep = (lineBottom - lineTop) / ((staff.standardNotationLineCount - 1) * 2);
        const stepsFromTop = Math.round((relY - lineTop) / halfStep);
        // walk the diatonic scale downwards from the top line.
        const diatonicIndex = topStep + topOctave * 7 - stepsFromTop;
        const octave = Math.floor(diatonicIndex / 7);
        const step = ((diatonicIndex % 7) + 7) % 7;
        const semitones: number[] = [0, 2, 4, 5, 7, 9, 11];
        hit.midi = (octave + 1) * 12 + semitones[step];
        hit.snapY = lineTop + stepsFromTop * halfStep;
        return hit;
    }

    /**
     * Connects the editor to the created cursor UI elements.
     * @internal
     */
    public onCursorsCreated(cursors: Cursors): void {
        this._cursors = cursors;
        this._ensureCursorBeat();
        this._placeEditCursor();
    }

    /**
     * Disconnects the editor from the cursor UI elements.
     * @internal
     */
    public onCursorsDestroyed(): void {
        this._cursors = null;
    }

    /**
     * Destroys this editor and unregisters all event listeners.
     */
    public destroy(): void {
        for (const unsubscribe of this._subscriptions) {
            unsubscribe();
        }
        this._subscriptions = [];
        this._cursors = null;
    }

    private _setupKeyHandling(): void {
        this._subscriptions.push(
            this._api.container.keyDown.on(args => {
                this._onKeyDown(args);
            })
        );
    }

    private _setupMouseHandling(): void {
        this._subscriptions.push(
            this._api.canvasElement.mouseDown.on(args => {
                this._onMouseDown(args);
            })
        );
    }

    private _onMouseDown(args: IMouseEventArgs): void {
        if (!args.isLeftMouseButton) {
            return;
        }
        const boundsLookup = this._api.renderer.boundsLookup;
        if (!boundsLookup) {
            return;
        }
        const relX = args.getX(this._api.canvasElement);
        const relY = args.getY(this._api.canvasElement);
        const beat = boundsLookup.getBeatAtPos(relX, relY);
        if (!beat) {
            return;
        }
        if (args.shiftKey) {
            // extend the selection from the current beat/anchor to the clicked one.
            this._extendSelection(() => {
                this._cursor.moveToBeat(beat);
                return true;
            });
            return;
        }
        this.clearSelection();
        this._cursor.moveToBeat(beat);
        if (this._api.settings.core.includeNoteBounds) {
            const note = boundsLookup.getNoteAtPos(beat, relX, relY);
            if (note && note.isStringed) {
                this._cursor.string = note.string;
            }
        }
        this._fretInput.reset();
        (this.cursorChanged as EventEmitterOfT<EditCursor>).trigger(this._cursor);
        this._placeEditCursor();
    }

    private _onKeyDown(args: IKeyboardEventArgs): void {
        if (!this._ensureCursorBeat()) {
            return;
        }

        const ctrl = args.ctrlKey || args.metaKey;
        const key = args.key;

        if (ctrl) {
            switch (key) {
                case 'z':
                case 'Z':
                    if (args.shiftKey) {
                        this.redo();
                    } else {
                        this.undo();
                    }
                    args.preventDefault();
                    return;
                case 'y':
                case 'Y':
                    this.redo();
                    args.preventDefault();
                    return;
                case 'ArrowRight':
                    this._moveCursor(() => this._cursor.moveNextBar());
                    args.preventDefault();
                    return;
                case 'ArrowLeft':
                    this._moveCursor(() => this._cursor.movePreviousBar());
                    args.preventDefault();
                    return;
            }
            return;
        }

        if (args.altKey) {
            switch (key) {
                case '1':
                    this.setDurationAtCursor(Duration.Whole);
                    args.preventDefault();
                    return;
                case '2':
                    this.setDurationAtCursor(Duration.Half);
                    args.preventDefault();
                    return;
                case '3':
                    this.setDurationAtCursor(Duration.Quarter);
                    args.preventDefault();
                    return;
                case '4':
                    this.setDurationAtCursor(Duration.Eighth);
                    args.preventDefault();
                    return;
                case '5':
                    this.setDurationAtCursor(Duration.Sixteenth);
                    args.preventDefault();
                    return;
                case '6':
                    this.setDurationAtCursor(Duration.ThirtySecond);
                    args.preventDefault();
                    return;
                case '7':
                    this.setDurationAtCursor(Duration.SixtyFourth);
                    args.preventDefault();
                    return;
            }
            return;
        }

        switch (key) {
            case 'ArrowRight':
                if (args.shiftKey) {
                    this._extendSelection(() => this._cursor.moveNextBeat());
                } else {
                    this._moveCursor(() => this._cursor.moveNextBeat());
                }
                args.preventDefault();
                return;
            case 'ArrowLeft':
                if (args.shiftKey) {
                    this._extendSelection(() => this._cursor.movePreviousBeat());
                } else {
                    this._moveCursor(() => this._cursor.movePreviousBeat());
                }
                args.preventDefault();
                return;
            case 'ArrowUp':
                if (this._cursor.staff!.isStringed) {
                    this._moveCursor(() => this._cursor.moveStringUp());
                } else {
                    this._repitchCursorNote(1);
                }
                args.preventDefault();
                return;
            case 'ArrowDown':
                if (this._cursor.staff!.isStringed) {
                    this._moveCursor(() => this._cursor.moveStringDown());
                } else {
                    this._repitchCursorNote(-1);
                }
                args.preventDefault();
                return;
            case 'Home': {
                const beat = this._cursor.beat!;
                const moveHome = () => {
                    this._cursor.moveToBeat(beat.voice.beats[0]);
                    return true;
                };
                if (args.shiftKey) {
                    this._extendSelection(moveHome);
                } else {
                    this._moveCursor(moveHome);
                }
                args.preventDefault();
                return;
            }
            case 'End': {
                const beat = this._cursor.beat!;
                const moveEnd = () => {
                    this._cursor.moveToBeat(beat.voice.beats[beat.voice.beats.length - 1]);
                    return true;
                };
                if (args.shiftKey) {
                    this._extendSelection(moveEnd);
                } else {
                    this._moveCursor(moveEnd);
                }
                args.preventDefault();
                return;
            }
            case 'Delete':
                if (this._cursor.note) {
                    this.removeNoteAtCursor();
                } else {
                    this.removeBeatAtCursor();
                }
                args.preventDefault();
                return;
            case 'Backspace':
                if (this._cursor.note) {
                    this.removeNoteAtCursor();
                } else {
                    this.removeBeatAtCursor();
                }
                this._moveCursor(() => this._cursor.movePreviousBeat());
                args.preventDefault();
                return;
            case 'Insert':
                this.insertBeatAtCursor();
                args.preventDefault();
                return;
            case 'Escape':
                this._fretInput.reset();
                this.clearSelection();
                args.preventDefault();
                return;
            case '+':
                this.lengthenDurationAtCursor();
                args.preventDefault();
                return;
            case '-':
                this.shortenDurationAtCursor();
                args.preventDefault();
                return;
            case '.':
            case ':':
                this.toggleDotAtCursor(args.shiftKey);
                args.preventDefault();
                return;
            case 'r':
                this.makeRestAtCursor();
                args.preventDefault();
                return;
            case 'R':
                this.repeatPreviousBeatAtCursor();
                args.preventDefault();
                return;
            case 't':
            case 'T':
                this.toggleTieAtCursor();
                args.preventDefault();
                return;
        }

        if (key.length === 1 && key >= '0' && key <= '9') {
            const staff = this._cursor.staff!;
            if (staff.isStringed) {
                const digit = key.charCodeAt(0) - 48;
                const result = this._fretInput.append(
                    digit,
                    this._cursor.beat!,
                    this._cursor.string,
                    Date.now(),
                    this._api.settings.editor.fretInputWindow,
                    this._api.settings.editor.maxFret
                );
                this.setFretAtCursor(result.fret, result.mergeWithPrevious);
            }
            args.preventDefault();
            return;
        }

        const tone = ScoreEditor._toneForNoteKey(key);
        if (tone !== -1) {
            const reference = this._cursor.noteValue;
            const noteValue = Math.round((reference - tone) / 12) * 12 + tone;
            this.setPitchAtCursor(noteValue);
            args.preventDefault();
        }
    }

    private static _toneForNoteKey(key: string): number {
        switch (key) {
            case 'c':
            case 'C':
                return 0;
            case 'd':
            case 'D':
                return 2;
            case 'e':
            case 'E':
                return 4;
            case 'f':
            case 'F':
                return 5;
            case 'g':
            case 'G':
                return 7;
            case 'a':
            case 'A':
                return 9;
            case 'b':
            case 'B':
                return 11;
            default:
                return -1;
        }
    }

    /**
     * On standard staves the arrow keys repitch the note under the cursor by
     * the given semitones (MuseScore behavior); without a note they adjust
     * the insertion pitch instead.
     */
    private _repitchCursorNote(semitones: number): void {
        const note = this._cursor.note;
        if (note) {
            const stored = note.calculateRealValue(false, false) + semitones;
            this.executeCommand(new ChangeNotePitchCommand(note, Math.floor(stored / 12), ((stored % 12) + 12) % 12));
            // the insertion reference stays in the written domain.
            this._cursor.noteValue = stored - note.beat.voice.bar.staff.displayTranspositionPitch;
        } else {
            this._cursor.noteValue = this._cursor.noteValue + semitones;
        }
        (this.cursorChanged as EventEmitterOfT<EditCursor>).trigger(this._cursor);
    }

    private _moveCursor(move: () => boolean): void {
        if (move()) {
            this._fretInput.reset();
            this.clearSelection();
            (this.cursorChanged as EventEmitterOfT<EditCursor>).trigger(this._cursor);
            this._placeEditCursor();
        }
    }

    private _ensureCursorBeat(): boolean {
        if (this._cursor.beat) {
            return true;
        }
        const score = this._api.score;
        const tracks = this._api.tracks;
        if (!score || tracks.length === 0) {
            return false;
        }
        const staff = tracks[0].staves[0];
        if (
            staff.bars.length === 0 ||
            staff.bars[0].voices.length === 0 ||
            staff.bars[0].voices[0].beats.length === 0
        ) {
            return false;
        }
        this._cursor.moveToBeat(staff.bars[0].voices[0].beats[0]);
        return true;
    }

    private _afterEdit(command: EditCommand, kind: ScoreEditKind, mergeWithPrevious: boolean = false): void {
        const api = this._api;
        const score = api.score;
        if (!score) {
            return;
        }

        // 1. recompute all derived state (chains, ticks, lookups, effect resolution).
        score.finish(api.settings);

        // 2. keep the cursor on a valid beat.
        this._validateCursor();

        // 3. audible feedback.
        if (api.settings.editor.audioFeedback && kind !== ScoreEditKind.Undo && api.isReadyForPlayback) {
            const feedbackBeat = command.audioFeedbackBeat;
            if (feedbackBeat) {
                api.playBeat(feedbackBeat);
            }
        }

        // 4. incremental re-render, no re-finish/midi reload happens as the score instance is unchanged.
        const hints: RenderHints = {
            reuseViewport: true,
            firstChangedMasterBar: command.firstAffectedMasterBarIndex
        };
        api.renderTracks(api.tracks, hints);

        // 5. deferred midi/tick cache refresh.
        this._midiDirty = true;
        this._midiRefresh();

        // 6. notify.
        (this.scoreEdited as EventEmitterOfT<ScoreEditedEventArgs>).trigger(
            new ScoreEditedEventArgs(command, kind, mergeWithPrevious)
        );
        (this.historyChanged as EventEmitter).trigger();

        // 7. the edit cursor is re-placed via postRenderFinished once the render completes.
    }

    private _validateCursor(): void {
        const beat = this._cursor.beat;
        if (!beat) {
            return;
        }
        if (beat.voice.beats.indexOf(beat) !== -1) {
            return;
        }
        // the beat was removed from its voice (e.g. undo of an insertion),
        // its old chain pointers still reference live beats.
        let candidate = beat.nextBeat;
        if (!candidate || candidate.voice.beats.indexOf(candidate) === -1) {
            candidate = beat.previousBeat;
        }
        if (candidate && candidate.voice.beats.indexOf(candidate) !== -1) {
            this._cursor.moveToBeat(candidate);
        } else {
            this._cursor.beat = null;
            this._ensureCursorBeat();
        }
        (this.cursorChanged as EventEmitterOfT<EditCursor>).trigger(this._cursor);
    }

    private _placeEditCursor(): void {
        const cursors = this._cursors;
        if (!cursors || !cursors.editCursor) {
            return;
        }
        const editCursor: IContainer = cursors.editCursor;
        const beat = this._cursor.beat;
        const boundsLookup = this._api.renderer.boundsLookup;
        if (!beat || !boundsLookup) {
            editCursor.setBounds(-100, -100, 0, 0);
            return;
        }
        const beatBounds = boundsLookup.findBeat(beat);
        if (!beatBounds) {
            editCursor.setBounds(-100, -100, 0, 0);
            return;
        }

        const staff = beat.voice.bar.staff;
        const barVisualBounds = beatBounds.barBounds.visualBounds;
        if (staff.isStringed) {
            const note = beat.getNoteOnString(this._cursor.string);
            if (note && beatBounds.notes) {
                for (const noteBounds of beatBounds.notes) {
                    if (noteBounds.note === note) {
                        editCursor.setBounds(
                            noteBounds.noteHeadBounds.x - 2,
                            noteBounds.noteHeadBounds.y - 2,
                            noteBounds.noteHeadBounds.w + 4,
                            noteBounds.noteHeadBounds.h + 4
                        );
                        return;
                    }
                }
            }
            // approximate the string line position within the bar bounds.
            const stringCount = staff.tuning.length;
            const lineHeight = barVisualBounds.h / stringCount;
            const lineIndex = stringCount - this._cursor.string;
            editCursor.setBounds(
                beatBounds.visualBounds.x - 2,
                barVisualBounds.y + lineIndex * lineHeight,
                beatBounds.visualBounds.w + 4,
                lineHeight
            );
        } else {
            editCursor.setBounds(
                beatBounds.visualBounds.x - 2,
                barVisualBounds.y,
                beatBounds.visualBounds.w + 4,
                barVisualBounds.h
            );
        }
    }
}
