import { EditCommand } from '@coderline/alphatab/editor/EditCommand';
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

    public constructor(beat: Beat, note: Note) {
        super();
        this._beat = beat;
        this._note = note;
    }

    public get description(): string {
        return 'Add note';
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
    }

    public undo(): void {
        this._beat.removeNote(this._note);
        this._beat.isEmpty = this._wasEmpty;
    }
}
