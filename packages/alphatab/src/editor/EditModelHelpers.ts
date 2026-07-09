import type { Bar } from '@coderline/alphatab/model/Bar';
import type { Beat } from '@coderline/alphatab/model/Beat';
import { Duration } from '@coderline/alphatab/model/Duration';
import { ModelUtils } from '@coderline/alphatab/model/ModelUtils';
import { MusicFontSymbol } from '@coderline/alphatab/model/MusicFontSymbol';
import { Note } from '@coderline/alphatab/model/Note';
import { NoteAccidentalMode } from '@coderline/alphatab/model/NoteAccidentalMode';
import { PercussionMapper } from '@coderline/alphatab/model/PercussionMapper';
import type { Staff } from '@coderline/alphatab/model/Staff';
import type { Voice } from '@coderline/alphatab/model/Voice';
import { AccidentalHelper } from '@coderline/alphatab/rendering/utils/AccidentalHelper';

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

    /**
     * The WRITTEN midi value of a note — its stored (sounding) value with the
     * staff's display transposition removed; what the staff notation shows
     * and what MusicXML `<pitch>` elements contain.
     */
    public static writtenValueOf(note: Note): number {
        return note.calculateRealValue(false, false) - note.beat.voice.bar.staff.displayTranspositionPitch;
    }

    /**
     * The General MIDI number a percussion note plays back with
     * (-1 for non-percussion notes).
     */
    public static percussionMidiOf(note: Note): number {
        if (!note.isPercussion) {
            return -1;
        }
        return PercussionMapper.getArticulation(note)?.outputMidiNumber ?? -1;
    }

    /**
     * The note head symbols (default/half/whole) for a MusicXML notehead name.
     * Covers the shapes used in percussion notation; anything unknown falls
     * back to the standard round heads.
     */
    public static noteheadSymbolsFor(noteheadName: string): [MusicFontSymbol, MusicFontSymbol, MusicFontSymbol] {
        switch (noteheadName) {
            case 'x':
                return [MusicFontSymbol.NoteheadXBlack, MusicFontSymbol.NoteheadXHalf, MusicFontSymbol.NoteheadXWhole];
            case 'circle-x':
                return [
                    MusicFontSymbol.NoteheadCircleX,
                    MusicFontSymbol.NoteheadCircleXHalf,
                    MusicFontSymbol.NoteheadCircleXWhole
                ];
            case 'cross':
                return [
                    MusicFontSymbol.NoteheadPlusBlack,
                    MusicFontSymbol.NoteheadPlusHalf,
                    MusicFontSymbol.NoteheadPlusWhole
                ];
            case 'diamond':
                return [
                    MusicFontSymbol.NoteheadDiamondBlack,
                    MusicFontSymbol.NoteheadDiamondHalf,
                    MusicFontSymbol.NoteheadDiamondWhole
                ];
            case 'triangle':
                return [
                    MusicFontSymbol.NoteheadTriangleUpBlack,
                    MusicFontSymbol.NoteheadTriangleUpHalf,
                    MusicFontSymbol.NoteheadTriangleUpWhole
                ];
            case 'inverted triangle':
                return [
                    MusicFontSymbol.NoteheadTriangleDownBlack,
                    MusicFontSymbol.NoteheadTriangleDownHalf,
                    MusicFontSymbol.NoteheadTriangleDownWhole
                ];
            case 'slash':
                return [
                    MusicFontSymbol.NoteheadSlashHorizontalEnds,
                    MusicFontSymbol.NoteheadSlashWhiteHalf,
                    MusicFontSymbol.NoteheadSlashWhiteWhole
                ];
            case 'slashed':
                return [
                    MusicFontSymbol.NoteheadSlashedBlack1,
                    MusicFontSymbol.NoteheadSlashedHalf1,
                    MusicFontSymbol.NoteheadSlashedWhole1
                ];
            case 'back slashed':
                return [
                    MusicFontSymbol.NoteheadSlashedBlack2,
                    MusicFontSymbol.NoteheadSlashedHalf2,
                    MusicFontSymbol.NoteheadSlashedWhole2
                ];
            case 'square':
                return [
                    MusicFontSymbol.NoteheadSquareBlack,
                    MusicFontSymbol.NoteheadSquareWhite,
                    MusicFontSymbol.NoteheadSquareWhite
                ];
            default:
                return [MusicFontSymbol.NoteheadBlack, MusicFontSymbol.NoteheadHalf, MusicFontSymbol.NoteheadWhole];
        }
    }

    /**
     * The articulation staff line ("steps" from the top line, GP semantics)
     * for a percussion display value (octave * 12 + tone), matching the
     * MusicXML importer's placement of unpitched notes.
     */
    public static percussionStaffLine(bar: Bar, displayValue: number): number {
        let musicXmlStaffSteps: number;
        if (displayValue === 0) {
            musicXmlStaffSteps = 4; // no display pitch defined: middle of bar
        } else {
            const spelling = ModelUtils.resolveSpelling(bar.keySignature, displayValue, NoteAccidentalMode.Default);
            musicXmlStaffSteps = AccidentalHelper.calculateNoteSteps(bar.clef, spelling);
        }
        // translate 5-line steps into the staff's actual line count semantics.
        const actualSteps = bar.staff.standardNotationLineCount * 2 - 1;
        const fiveLineSteps = 5 * 2 - 1;
        return musicXmlStaffSteps - (fiveLineSteps - actualSteps);
    }
}
