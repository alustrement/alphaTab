import { CompositeEditCommand } from '@coderline/alphatab/editor/CompositeEditCommand';
import type { EditCommand } from '@coderline/alphatab/editor/EditCommand';

/**
 * Holds the undo/redo stacks of executed edit commands.
 * @public
 */
export class EditCommandHistory {
    private _undoStack: EditCommand[] = [];
    private _redoStack: EditCommand[] = [];

    /**
     * The maximum number of undo steps kept, oldest entries are dropped beyond this.
     */
    public maxSteps: number = 100;

    /**
     * Whether there is a command which can be undone.
     */
    public get canUndo(): boolean {
        return this._undoStack.length > 0;
    }

    /**
     * Whether there is an undone command which can be re-applied.
     */
    public get canRedo(): boolean {
        return this._redoStack.length > 0;
    }

    /**
     * Executes the given command and places it on the undo stack (clearing the redo stack).
     * @param command The command to execute.
     * @param mergeWithPrevious When true, the command is folded into the current top undo entry
     * so that a single undo reverts the whole input burst (e.g. typing two digits for fret 12).
     */
    public execute(command: EditCommand, mergeWithPrevious: boolean = false): void {
        command.execute();
        this._redoStack = [];

        if (mergeWithPrevious && this._undoStack.length > 0) {
            const previous = this._undoStack[this._undoStack.length - 1];
            if (previous instanceof CompositeEditCommand) {
                previous.commands.push(command);
            } else {
                const composite = new CompositeEditCommand(command.description, [previous, command]);
                this._undoStack[this._undoStack.length - 1] = composite;
            }
        } else {
            this._undoStack.push(command);
            if (this._undoStack.length > this.maxSteps) {
                this._undoStack.splice(0, this._undoStack.length - this.maxSteps);
            }
        }
    }

    /**
     * Undoes the most recent command.
     * @returns The undone command (e.g. to derive render hints), or null if there was none.
     */
    public undo(): EditCommand | null {
        const command = this._undoStack.pop();
        if (!command) {
            return null;
        }
        command.undo();
        this._redoStack.push(command);
        return command;
    }

    /**
     * Re-applies the most recently undone command.
     * @returns The redone command, or null if there was none.
     */
    public redo(): EditCommand | null {
        const command = this._redoStack.pop();
        if (!command) {
            return null;
        }
        command.redo();
        this._undoStack.push(command);
        return command;
    }

    /**
     * Clears both the undo and redo stacks.
     */
    public clear(): void {
        this._undoStack = [];
        this._redoStack = [];
    }
}
