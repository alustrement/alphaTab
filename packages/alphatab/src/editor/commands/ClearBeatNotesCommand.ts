import { EditCommand } from '@coderline/alphatab/editor/EditCommand';
import { EditModelHelpers } from '@coderline/alphatab/editor/EditModelHelpers';
import type { Beat } from '@coderline/alphatab/model/Beat';
import type { Note } from '@coderline/alphatab/model/Note';

/**
 * Removes all notes from a beat, turning it into a rest of unchanged duration.
 * The removed note instances are retained and restored in order on undo.
 * @public
 */
export class ClearBeatNotesCommand extends EditCommand {
    private readonly _beat: Beat;
    private _removedNotes: Note[] = [];

    public constructor(beat: Beat) {
        super();
        this._beat = beat;
    }

    public get description(): string {
        return 'Convert to rest';
    }

    public get firstAffectedMasterBarIndex(): number {
        return this._beat.voice.bar.index;
    }

    public execute(): void {
        this._removedNotes = [];
        while (this._beat.notes.length > 0) {
            const note = this._beat.notes[this._beat.notes.length - 1];
            this._removedNotes.push(note);
            this._beat.removeNote(note);
        }
    }

    public undo(): void {
        for (let i = this._removedNotes.length - 1; i >= 0; i--) {
            const note = this._removedNotes[i];
            EditModelHelpers.insertNoteAt(this._beat, note, this._beat.notes.length);
        }
    }
}
