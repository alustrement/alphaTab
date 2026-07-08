import { EditCommand } from '@coderline/alphatab/editor/EditCommand';
import { EditModelHelpers } from '@coderline/alphatab/editor/EditModelHelpers';
import type { Beat } from '@coderline/alphatab/model/Beat';
import type { Voice } from '@coderline/alphatab/model/Voice';

/**
 * Inserts a beat into a voice at a given index. The same beat instance
 * is removed again on undo, keeping ids stable for redo.
 * @public
 */
export class AddBeatCommand extends EditCommand {
    private readonly _voice: Voice;
    private readonly _beat: Beat;
    private readonly _insertIndex: number;

    public constructor(voice: Voice, beat: Beat, insertIndex: number) {
        super();
        this._voice = voice;
        this._beat = beat;
        this._insertIndex = insertIndex;
    }

    public get description(): string {
        return 'Insert beat';
    }

    public get firstAffectedMasterBarIndex(): number {
        // the previous bar's last beat chains into this voice, re-render from there.
        const barIndex = this._voice.bar.index;
        return barIndex > 0 ? barIndex - 1 : 0;
    }

    public execute(): void {
        EditModelHelpers.insertBeatAt(this._voice, this._beat, this._insertIndex);
    }

    public undo(): void {
        EditModelHelpers.removeBeatAt(this._voice, this._insertIndex);
    }
}
