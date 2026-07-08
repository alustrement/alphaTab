import { EditCommand } from '@coderline/alphatab/editor/EditCommand';
import { EditIntent, EditIntentKind, EditIntentLocation } from '@coderline/alphatab/editor/EditIntent';
import type { Beat } from '@coderline/alphatab/model/Beat';
import type { Note } from '@coderline/alphatab/model/Note';

/**
 * Changes the pitch (octave and tone) of a non-stringed (piano-like) note.
 * For stringed notes use {@link ChangeNoteFretCommand}.
 * @public
 */
export class ChangeNotePitchCommand extends EditCommand {
    private readonly _note: Note;
    private readonly _newOctave: number;
    private readonly _newTone: number;
    private _oldOctave: number = -1;
    private _oldTone: number = -1;
    private _intent: EditIntent | null = null;

    public constructor(note: Note, newOctave: number, newTone: number) {
        super();
        this._note = note;
        this._newOctave = newOctave;
        this._newTone = newTone;
    }

    public get description(): string {
        return 'Change pitch';
    }

    public override get intent(): EditIntent | null {
        return this._intent;
    }

    public get firstAffectedMasterBarIndex(): number {
        return this._note.beat.voice.bar.index;
    }

    public override get audioFeedbackBeat(): Beat | null {
        return this._note.beat;
    }

    public execute(): void {
        const intent = new EditIntent(
            EditIntentKind.ChangePitch,
            EditIntentLocation.fromBeat(this._note.beat, 0)
        );
        intent.oldNoteValue = this._note.calculateRealValue(false, false);

        this._oldOctave = this._note.octave;
        this._oldTone = this._note.tone;
        this._note.octave = this._newOctave;
        this._note.tone = this._newTone;

        intent.noteValue = this._note.calculateRealValue(false, false);
        this._intent = intent;
    }

    public undo(): void {
        this._note.octave = this._oldOctave;
        this._note.tone = this._oldTone;
    }
}
