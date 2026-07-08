import type { Beat } from '@coderline/alphatab/model/Beat';

/**
 * Base class for all reversible score edit operations.
 * Commands mutate the score model structurally, derived state
 * (tick positions, beat chaining, lookups) is recomputed by the
 * editor via {@link Score.finish} after each execution.
 * @public
 */
export abstract class EditCommand {
    /**
     * A human readable description of this command (e.g. for undo menus).
     */
    public abstract get description(): string;

    /**
     * The index of the first master bar whose layout is affected by this command.
     * Used as `firstChangedMasterBar` render hint for incremental re-rendering.
     */
    public abstract get firstAffectedMasterBarIndex(): number;

    /**
     * The index of the last master bar whose layout is affected by this command.
     */
    public get lastAffectedMasterBarIndex(): number {
        return this.firstAffectedMasterBarIndex;
    }

    /**
     * The beat to use for audio feedback after execution (null means no feedback).
     */
    public get audioFeedbackBeat(): Beat | null {
        return null;
    }

    /**
     * Executes this command, applying its changes to the score model.
     */
    public abstract execute(): void;

    /**
     * Reverts the changes previously applied by {@link execute}.
     */
    public abstract undo(): void;

    /**
     * Re-applies this command after an undo. Defaults to {@link execute}.
     */
    public redo(): void {
        this.execute();
    }
}
