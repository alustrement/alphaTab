import { EditCommand } from '@coderline/alphatab/editor/EditCommand';
import { EditModelHelpers } from '@coderline/alphatab/editor/EditModelHelpers';
import { EditIntent, EditIntentKind, EditIntentLocation } from '@coderline/alphatab/editor/EditIntent';
import type { Beat } from '@coderline/alphatab/model/Beat';
import type { Note } from '@coderline/alphatab/model/Note';

/**
 * Changes the fret of a stringed note.
 * @public
 */
export class ChangeNoteFretCommand extends EditCommand {
    private readonly _note: Note;
    private readonly _newFret: number;
    private _oldFret: number = -1;
    private _intent: EditIntent | null = null;

    public constructor(note: Note, newFret: number) {
        super();
        this._note = note;
        this._newFret = newFret;
    }

    public get description(): string {
        return 'Change fret';
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
        this._oldFret = this._note.fret;
        this._note.fret = this._newFret;

        const intent = new EditIntent(
            EditIntentKind.ChangeFret,
            EditIntentLocation.fromBeat(this._note.beat, this._note.string)
        );
        intent.fret = this._newFret;
        intent.noteValue = EditModelHelpers.writtenValueOf(this._note);
        this._intent = intent;
    }

    public undo(): void {
        this._note.fret = this._oldFret;
    }
}
