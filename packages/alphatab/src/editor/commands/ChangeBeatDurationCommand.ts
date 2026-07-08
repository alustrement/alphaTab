import { EditCommand } from '@coderline/alphatab/editor/EditCommand';
import { EditIntent, EditIntentKind, EditIntentLocation } from '@coderline/alphatab/editor/EditIntent';
import type { Beat } from '@coderline/alphatab/model/Beat';
import { Duration } from '@coderline/alphatab/model/Duration';

/**
 * Changes the duration of a beat. Tick positions of following beats
 * are recomputed on the next {@link Score.finish}.
 * @public
 */
export class ChangeBeatDurationCommand extends EditCommand {
    private readonly _beat: Beat;
    private readonly _newDuration: Duration;
    private _oldDuration: Duration = Duration.Quarter;
    private _intent: EditIntent | null = null;

    public constructor(beat: Beat, newDuration: Duration) {
        super();
        this._beat = beat;
        this._newDuration = newDuration;
    }

    public get description(): string {
        return 'Change duration';
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
        this._oldDuration = this._beat.duration;
        this._beat.duration = this._newDuration;

        const intent = new EditIntent(
            EditIntentKind.ChangeDuration,
            EditIntentLocation.fromBeat(this._beat, 0)
        );
        intent.duration = this._newDuration;
        intent.dots = this._beat.dots;
        this._intent = intent;
    }

    public undo(): void {
        this._beat.duration = this._oldDuration;
    }
}
