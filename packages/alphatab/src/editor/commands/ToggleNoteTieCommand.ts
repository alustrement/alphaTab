import { EditCommand } from '@coderline/alphatab/editor/EditCommand';
import { EditIntent, EditIntentKind, EditIntentLocation } from '@coderline/alphatab/editor/EditIntent';
import type { Beat } from '@coderline/alphatab/model/Beat';
import type { Note } from '@coderline/alphatab/model/Note';

/**
 * Toggles whether a note is the destination of a tie. The tie origin
 * is resolved on the next {@link Score.finish}.
 * @public
 */
export class ToggleNoteTieCommand extends EditCommand {
    private readonly _note: Note;
    private readonly _newValue: boolean;
    private _oldValue: boolean = false;
    private _intent: EditIntent | null = null;

    public constructor(note: Note, isTieDestination: boolean) {
        super();
        this._note = note;
        this._newValue = isTieDestination;
    }

    public get description(): string {
        return 'Toggle tie';
    }

    public override get intent(): EditIntent | null {
        return this._intent;
    }

    public get firstAffectedMasterBarIndex(): number {
        // the tie arc can start in the previous bar.
        const barIndex = this._note.beat.voice.bar.index;
        return barIndex > 0 ? barIndex - 1 : 0;
    }

    public override get audioFeedbackBeat(): Beat | null {
        return this._note.beat;
    }

    public execute(): void {
        this._oldValue = this._note.isTieDestination;
        this._note.isTieDestination = this._newValue;

        const intent = new EditIntent(
            EditIntentKind.ToggleTie,
            EditIntentLocation.fromBeat(this._note.beat, this._note.isStringed ? this._note.string : 0)
        );
        intent.isTieDestination = this._newValue;
        intent.noteValue = this._note.calculateRealValue(false, false);
        this._intent = intent;
    }

    public undo(): void {
        this._note.isTieDestination = this._oldValue;
    }
}
