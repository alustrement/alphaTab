import { EditCommand } from '@coderline/alphatab/editor/EditCommand';
import { EditModelHelpers } from '@coderline/alphatab/editor/EditModelHelpers';
import { EditIntent, EditIntentKind, EditIntentLocation } from '@coderline/alphatab/editor/EditIntent';
import type { Beat } from '@coderline/alphatab/model/Beat';
import type { Note } from '@coderline/alphatab/model/Note';

/**
 * Adds a note to a beat. If the beat was an empty placeholder it becomes a real beat.
 * @public
 */
export class AddNoteCommand extends EditCommand {
    private readonly _beat: Beat;
    private readonly _note: Note;
    private _wasEmpty: boolean = false;
    private _intent: EditIntent | null = null;

    public constructor(beat: Beat, note: Note) {
        super();
        this._beat = beat;
        this._note = note;
    }

    public get description(): string {
        return 'Add note';
    }

    public override get intent(): EditIntent | null {
        return this._intent;
    }

    public get firstAffectedMasterBarIndex(): number {
        return this._beat.voice.bar.index;
    }

    public override get audioFeedbackBeat(): Beat | null {
        return this._beat;
    }

    public execute(): void {
        this._wasEmpty = this._beat.isEmpty;
        this._beat.isEmpty = false;
        this._beat.addNote(this._note);

        const intent = new EditIntent(
            EditIntentKind.AddNote,
            EditIntentLocation.fromBeat(this._beat, this._note.isStringed ? this._note.string : 0)
        );
        intent.fret = this._note.isStringed ? this._note.fret : -1;
        intent.noteValue = EditModelHelpers.writtenValueOf(this._note);
        this._intent = intent;
    }

    public undo(): void {
        this._beat.removeNote(this._note);
        this._beat.isEmpty = this._wasEmpty;
    }
}
