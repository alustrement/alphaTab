import { EditCommand } from '@coderline/alphatab/editor/EditCommand';
import { EditIntent, EditIntentKind, EditIntentLocation } from '@coderline/alphatab/editor/EditIntent';
import { EditModelHelpers } from '@coderline/alphatab/editor/EditModelHelpers';
import type { Beat } from '@coderline/alphatab/model/Beat';
import type { Note } from '@coderline/alphatab/model/Note';

/**
 * Removes a note from its beat. The removed note instance is retained and
 * re-inserted at its original index on undo, keeping ids and references stable.
 * @public
 */
export class RemoveNoteCommand extends EditCommand {
    private readonly _beat: Beat;
    private readonly _note: Note;
    private _noteIndex: number = -1;
    private _intent: EditIntent | null = null;

    public constructor(note: Note) {
        super();
        this._beat = note.beat;
        this._note = note;
    }

    public get description(): string {
        return 'Remove note';
    }

    public override get intent(): EditIntent | null {
        return this._intent;
    }

    public get firstAffectedMasterBarIndex(): number {
        return this._beat.voice.bar.index;
    }

    public execute(): void {
        // captured before removal, while the indices and note links are valid.
        const intent = new EditIntent(
            EditIntentKind.RemoveNote,
            EditIntentLocation.fromBeat(this._beat, this._note.isStringed ? this._note.string : 0)
        );
        if (this._note.isPercussion) {
            // percussion notes have no pitch: noteValue carries the staff
            // display position instead (octave * 12 + tone).
            intent.noteValue = this._note.octave * 12 + this._note.tone;
            intent.percussionMidi = EditModelHelpers.percussionMidiOf(this._note);
        } else {
            intent.noteValue = EditModelHelpers.writtenValueOf(this._note);
        }
        this._intent = intent;

        this._noteIndex = this._beat.notes.indexOf(this._note);
        this._beat.removeNote(this._note);
    }

    public undo(): void {
        EditModelHelpers.insertNoteAt(this._beat, this._note, this._noteIndex);
    }
}
