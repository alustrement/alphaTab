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

    public constructor(command: EditCommand, kind: ScoreEditKind) {
        this.command = command;
        this.kind = kind;
    }
}
