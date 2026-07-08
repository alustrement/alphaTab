import type { Beat } from '@coderline/alphatab/model/Beat';
import { Duration } from '@coderline/alphatab/model/Duration';
import type { Voice } from '@coderline/alphatab/model/Voice';

/**
 * The semantic kind of an edit applied to the score.
 * @public
 */
export enum EditIntentKind {
    AddNote = 0,
    RemoveNote = 1,
    ChangeFret = 2,
    ChangePitch = 3,
    AddBeat = 4,
    RemoveBeat = 5,
    ChangeDuration = 6,
    ChangeDots = 7,
    ToggleTie = 8,
    ClearNotes = 9
}

/**
 * Index-based, model-independent coordinates of an edit target within the score.
 * Host applications use these to correlate edits with an external score model
 * (e.g. the MusicXML document the score was imported from).
 * @public
 */
export class EditIntentLocation {
    /**
     * The index of the track within the score.
     */
    public trackIndex: number = 0;

    /**
     * The index of the staff within the track.
     */
    public staffIndex: number = 0;

    /**
     * The index of the bar within the staff.
     */
    public barIndex: number = 0;

    /**
     * The index of the voice within the bar.
     */
    public voiceIndex: number = 0;

    /**
     * The index of the beat within the voice.
     */
    public beatIndex: number = 0;

    /**
     * The string of the affected note ({@link Note.string} semantics,
     * 1 is the lowest string). 0 when not applicable.
     */
    public string: number = 0;

    /**
     * The number of strings of the affected staff (0 for non-stringed staves).
     * Needed to translate between alphaTab string numbering (1 = lowest)
     * and MusicXML string numbering (1 = highest).
     */
    public stringCount: number = 0;

    /**
     * Creates a location from a beat which is still part of its voice.
     */
    public static fromBeat(beat: Beat, noteString: number = 0): EditIntentLocation {
        return EditIntentLocation.fromVoice(beat.voice, beat.voice.beats.indexOf(beat), noteString);
    }

    /**
     * Creates a location from a voice and an explicit beat index
     * (for beats which are no longer, or not yet, part of the voice).
     */
    public static fromVoice(voice: Voice, beatIndex: number, noteString: number = 0): EditIntentLocation {
        const location = new EditIntentLocation();
        const bar = voice.bar;
        location.trackIndex = bar.staff.track.index;
        location.staffIndex = bar.staff.index;
        location.barIndex = bar.index;
        location.voiceIndex = voice.index;
        location.beatIndex = beatIndex;
        location.string = noteString;
        location.stringCount = bar.staff.isStringed ? bar.staff.tuning.length : 0;
        return location;
    }
}

/**
 * A model-independent description of an edit applied to the score,
 * carried on {@link ScoreEditedEventArgs} so host applications can mirror
 * the edit onto an external score model.
 * @public
 */
export class EditIntent {
    /**
     * The semantic kind of the edit.
     */
    public readonly kind: EditIntentKind;

    /**
     * The coordinates of the edit target, captured while the indices were valid.
     */
    public readonly location: EditIntentLocation;

    /**
     * The new fret for fret edits (-1 when not applicable).
     */
    public fret: number = -1;

    /**
     * The resulting midi value of the affected note, without transposition
     * or harmonics applied (-1 when not applicable).
     */
    public noteValue: number = -1;

    /**
     * The previous midi value of the affected note for pitch changes
     * (-1 when not applicable). Used to locate the note in external models.
     */
    public oldNoteValue: number = -1;

    /**
     * The new duration for duration edits and inserted beats.
     */
    public duration: Duration = Duration.Quarter;

    /**
     * The new number of dots for dot edits.
     */
    public dots: number = 0;

    /**
     * The new tie-destination state for tie edits.
     */
    public isTieDestination: boolean = false;

    public constructor(kind: EditIntentKind, location: EditIntentLocation) {
        this.kind = kind;
        this.location = location;
    }
}
