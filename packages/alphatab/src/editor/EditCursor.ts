import type { Beat } from '@coderline/alphatab/model/Beat';
import { GraceType } from '@coderline/alphatab/model/GraceType';
import type { Note } from '@coderline/alphatab/model/Note';
import type { Staff } from '@coderline/alphatab/model/Staff';
import type { Voice } from '@coderline/alphatab/model/Voice';

/**
 * The logical editing position within the score.
 * Pure state and navigation, visual placement is handled by the editor.
 * @public
 */
export class EditCursor {
    /**
     * The beat the cursor is currently placed on.
     */
    public beat: Beat | null = null;

    /**
     * The current string for tablature editing.
     * 1 is the lowest string (bottom tab line), matching {@link Note.string} semantics.
     */
    public string: number = 1;

    /**
     * The insertion pitch (midi value) used for note entry on non-stringed staves.
     */
    public noteValue: number = 60;

    /**
     * The staff the cursor is currently in.
     */
    public get staff(): Staff | null {
        return this.beat ? this.beat.voice.bar.staff : null;
    }

    /**
     * The voice the cursor is currently in.
     */
    public get voice(): Voice | null {
        return this.beat ? this.beat.voice : null;
    }

    /**
     * The note currently under the cursor:
     * on stringed staves the note on the cursor string, otherwise the first note of the beat.
     */
    public get note(): Note | null {
        const beat = this.beat;
        if (!beat) {
            return null;
        }
        if (beat.voice.bar.staff.isStringed) {
            return beat.getNoteOnString(this.string);
        }
        return beat.notes.length > 0 ? beat.notes[0] : null;
    }

    /**
     * Places the cursor on the given beat.
     */
    public moveToBeat(beat: Beat): void {
        this.beat = beat;
    }

    /**
     * Moves to the next non-grace beat (crossing bar boundaries).
     * @returns true if the cursor moved.
     */
    public moveNextBeat(): boolean {
        let candidate = this.beat ? this.beat.nextBeat : null;
        while (candidate && candidate.graceType !== GraceType.None) {
            candidate = candidate.nextBeat;
        }
        if (candidate) {
            this.beat = candidate;
            return true;
        }
        return false;
    }

    /**
     * Moves to the previous non-grace beat (crossing bar boundaries).
     * @returns true if the cursor moved.
     */
    public movePreviousBeat(): boolean {
        let candidate = this.beat ? this.beat.previousBeat : null;
        while (candidate && candidate.graceType !== GraceType.None) {
            candidate = candidate.previousBeat;
        }
        if (candidate) {
            this.beat = candidate;
            return true;
        }
        return false;
    }

    /**
     * Moves to the first beat of the next bar (same voice index).
     * @returns true if the cursor moved.
     */
    public moveNextBar(): boolean {
        const beat = this.beat;
        if (!beat) {
            return false;
        }
        const nextBar = beat.voice.bar.nextBar;
        if (!nextBar) {
            return false;
        }
        const voice = nextBar.voices[beat.voice.index];
        if (voice.beats.length === 0) {
            return false;
        }
        this.beat = voice.beats[0];
        return true;
    }

    /**
     * Moves to the first beat of the previous bar (same voice index).
     * @returns true if the cursor moved.
     */
    public movePreviousBar(): boolean {
        const beat = this.beat;
        if (!beat) {
            return false;
        }
        const previousBar = beat.voice.bar.previousBar;
        if (!previousBar) {
            return false;
        }
        const voice = previousBar.voices[beat.voice.index];
        if (voice.beats.length === 0) {
            return false;
        }
        this.beat = voice.beats[0];
        return true;
    }

    /**
     * Moves the cursor one string up (towards higher string numbers).
     * @returns true if the cursor moved.
     */
    public moveStringUp(): boolean {
        const staff = this.staff;
        if (!staff || !staff.isStringed) {
            return false;
        }
        if (this.string < staff.tuning.length) {
            this.string++;
            return true;
        }
        return false;
    }

    /**
     * Moves the cursor one string down (towards string 1).
     * @returns true if the cursor moved.
     */
    public moveStringDown(): boolean {
        const staff = this.staff;
        if (!staff || !staff.isStringed) {
            return false;
        }
        if (this.string > 1) {
            this.string--;
            return true;
        }
        return false;
    }
}
