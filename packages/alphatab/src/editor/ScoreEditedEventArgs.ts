import type { EditCommand } from '@coderline/alphatab/editor/EditCommand';

/**
 * The kind of edit which was applied to the score.
 * @public
 */
export enum ScoreEditKind {
    /**
     * A new command was executed.
     */
    Command = 0,
    /**
     * A command was undone.
     */
    Undo = 1,
    /**
     * A command was redone.
     */
    Redo = 2
}

/**
 * The information about an edit applied to the score.
 * @public
 */
export class ScoreEditedEventArgs {
    /**
     * The command which was executed, undone or redone.
     */
    public readonly command: EditCommand;

    /**
     * The kind of edit which happened.
     */
    public readonly kind: ScoreEditKind;

    /**
     * Whether this command was merged into the previous undo entry
     * (e.g. the second digit of a multi-digit fret input). Host applications
     * mirroring the edit history should merge their entries accordingly.
     */
    public readonly mergeWithPrevious: boolean;

    public constructor(command: EditCommand, kind: ScoreEditKind, mergeWithPrevious: boolean = false) {
        this.command = command;
        this.kind = kind;
        this.mergeWithPrevious = mergeWithPrevious;
    }
}
