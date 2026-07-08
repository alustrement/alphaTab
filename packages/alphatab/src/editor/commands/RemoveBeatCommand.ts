import { AlphaTabError, AlphaTabErrorType } from '@coderline/alphatab/AlphaTabError';
import { EditCommand } from '@coderline/alphatab/editor/EditCommand';
import { EditModelHelpers } from '@coderline/alphatab/editor/EditModelHelpers';
import type { Beat } from '@coderline/alphatab/model/Beat';
import type { Voice } from '@coderline/alphatab/model/Voice';

/**
 * Removes a beat from its voice. A voice always keeps at least one beat,
 * removing the last beat is rejected (make it a rest instead).
 * The removed beat instance is retained and re-inserted on undo.
 * @public
 */
export class RemoveBeatCommand extends EditCommand {
    private readonly _voice: Voice;
    private readonly _beat: Beat;
    private _beatIndex: number = -1;

    public constructor(beat: Beat) {
        super();
        this._voice = beat.voice;
        this._beat = beat;
    }

    public get description(): string {
        return 'Remove beat';
    }

    public get firstAffectedMasterBarIndex(): number {
        const barIndex = this._voice.bar.index;
        return barIndex > 0 ? barIndex - 1 : 0;
    }

    public execute(): void {
        if (this._voice.beats.length <= 1) {
            throw new AlphaTabError(
                AlphaTabErrorType.General,
                'Cannot remove the last beat of a voice, convert it to a rest instead'
            );
        }
        this._beatIndex = this._voice.beats.indexOf(this._beat);
        EditModelHelpers.removeBeatAt(this._voice, this._beatIndex);
    }

    public undo(): void {
        EditModelHelpers.insertBeatAt(this._voice, this._beat, this._beatIndex);
    }
}
