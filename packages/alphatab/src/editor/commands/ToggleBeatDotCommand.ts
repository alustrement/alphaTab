import { EditCommand } from '@coderline/alphatab/editor/EditCommand';
import { EditIntent, EditIntentKind, EditIntentLocation } from '@coderline/alphatab/editor/EditIntent';
import type { Beat } from '@coderline/alphatab/model/Beat';

/**
 * Sets the number of dots on a beat (0, 1 or 2).
 * @public
 */
export class ToggleBeatDotCommand extends EditCommand {
    private readonly _beat: Beat;
    private readonly _newDots: number;
    private _oldDots: number = 0;
    private _intent: EditIntent | null = null;

    public constructor(beat: Beat, newDots: number) {
        super();
        this._beat = beat;
        this._newDots = newDots;
    }

    public get description(): string {
        return 'Change dots';
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
        this._oldDots = this._beat.dots;
        this._beat.dots = this._newDots;

        const intent = new EditIntent(
            EditIntentKind.ChangeDots,
            EditIntentLocation.fromBeat(this._beat, 0)
        );
        intent.dots = this._newDots;
        intent.duration = this._beat.duration;
        this._intent = intent;
    }

    public undo(): void {
        this._beat.dots = this._oldDots;
    }
}
