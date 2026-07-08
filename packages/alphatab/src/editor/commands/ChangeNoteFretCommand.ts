import { EditCommand } from '@coderline/alphatab/editor/EditCommand';
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

    public constructor(note: Note, newFret: number) {
        super();
        this._note = note;
        this._newFret = newFret;
    }

    public get description(): string {
        return 'Change fret';
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
    }

    public undo(): void {
        this._note.fret = this._oldFret;
    }
}
