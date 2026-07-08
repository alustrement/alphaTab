import type { Beat } from '@coderline/alphatab/model/Beat';
import { Duration } from '@coderline/alphatab/model/Duration';
import { Note } from '@coderline/alphatab/model/Note';
import type { Staff } from '@coderline/alphatab/model/Staff';
import type { Voice } from '@coderline/alphatab/model/Voice';

/**
 * Small structural model helpers used by the edit commands.
 * Derived state (beat chaining, tick positions, lookups) is intentionally
 * not maintained here, it is recomputed via {@link Score.finish} after each edit.
 * @internal
 */
export class EditModelHelpers {
    /**
     * Inserts the given beat into the voice at the given index.
     * Chaining and indices are re-established by the next {@link Score.finish}.
     */
    public static insertBeatAt(voice: Voice, beat: Beat, index: number): void {
        beat.voice = voice;
        voice.beats.splice(index, 0, beat);
    }

    /**
     * Removes the beat at the given index from the voice and returns it for retention.
     */
    public static removeBeatAt(voice: Voice, index: number): Beat {
        const beat = voice.beats[index];
        voice.beats.splice(index, 1);
        return beat;
    }

    /**
     * Re-inserts a retained note into the beat at its original index,
     * keeping the string lookup in sync.
     */
    public static insertNoteAt(beat: Beat, note: Note, index: number): void {
        note.beat = beat;
        note.index = index;
        beat.notes.splice(index, 0, note);
        for (let i = index + 1; i < beat.notes.length; i++) {
            beat.notes[i].index = i;
        }
        if (note.isStringed) {
            beat.noteStringLookup.set(note.string, note);
        }
    }

    /**
     * Computes the fret needed to play the given midi value on the given string,
     * or -1 when the value cannot be played on that string.
     */
    public static fretForValue(staff: Staff, noteString: number, noteValue: number, maxFret: number): number {
        const fret = noteValue - staff.capo - Note.getStringTuning(staff, noteString) + staff.transpositionPitch;
        if (fret < 0 || fret > maxFret) {
            return -1;
        }
        return fret;
    }

    /**
     * The next shorter duration (whole -> half -> ... -> 64th), clamped at 64th.
     */
    public static nextShorterDuration(duration: Duration): Duration {
        switch (duration) {
            case Duration.QuadrupleWhole:
                return Duration.DoubleWhole;
            case Duration.DoubleWhole:
                return Duration.Whole;
            case Duration.Whole:
                return Duration.Half;
            case Duration.Half:
                return Duration.Quarter;
            case Duration.Quarter:
                return Duration.Eighth;
            case Duration.Eighth:
                return Duration.Sixteenth;
            case Duration.Sixteenth:
                return Duration.ThirtySecond;
            case Duration.ThirtySecond:
                return Duration.SixtyFourth;
            default:
                return duration;
        }
    }

    /**
     * The next longer duration (64th -> 32nd -> ... -> whole), clamped at whole.
     */
    public static nextLongerDuration(duration: Duration): Duration {
        switch (duration) {
            case Duration.SixtyFourth:
                return Duration.ThirtySecond;
            case Duration.ThirtySecond:
                return Duration.Sixteenth;
            case Duration.Sixteenth:
                return Duration.Eighth;
            case Duration.Eighth:
                return Duration.Quarter;
            case Duration.Quarter:
                return Duration.Half;
            case Duration.Half:
                return Duration.Whole;
            default:
                return duration;
        }
    }
}
