import { describe, expect, it } from 'vitest';
import { CompositeEditCommand } from '@coderline/alphatab/editor/CompositeEditCommand';
import { EditCommand } from '@coderline/alphatab/editor/EditCommand';
import { EditCommandHistory } from '@coderline/alphatab/editor/EditCommandHistory';

/**
 * @internal
 */
class CounterCommand extends EditCommand {
    public value: number = 0;
    public readonly delta: number;

    public constructor(delta: number) {
        super();
        this.delta = delta;
    }

    public get description(): string {
        return 'Counter';
    }

    public get firstAffectedMasterBarIndex(): number {
        return 0;
    }

    public execute(): void {
        this.value += this.delta;
    }

    public undo(): void {
        this.value -= this.delta;
    }
}

describe('EditCommandHistoryTests', () => {
    it('execute-undo-redo', () => {
        const history = new EditCommandHistory();
        const command = new CounterCommand(1);

        history.execute(command);
        expect(command.value).toBe(1);
        expect(history.canUndo).toBe(true);
        expect(history.canRedo).toBe(false);

        const undone = history.undo();
        expect(undone).toBe(command);
        expect(command.value).toBe(0);
        expect(history.canUndo).toBe(false);
        expect(history.canRedo).toBe(true);

        const redone = history.redo();
        expect(redone).toBe(command);
        expect(command.value).toBe(1);
        expect(history.canUndo).toBe(true);
        expect(history.canRedo).toBe(false);
    });

    it('undo-redo-empty', () => {
        const history = new EditCommandHistory();
        expect(history.undo()).toBe(null);
        expect(history.redo()).toBe(null);
    });

    it('execute-clears-redo', () => {
        const history = new EditCommandHistory();
        history.execute(new CounterCommand(1));
        history.undo();
        expect(history.canRedo).toBe(true);
        history.execute(new CounterCommand(1));
        expect(history.canRedo).toBe(false);
    });

    it('max-steps-drops-oldest', () => {
        const history = new EditCommandHistory();
        history.maxSteps = 2;
        history.execute(new CounterCommand(1));
        history.execute(new CounterCommand(1));
        history.execute(new CounterCommand(1));
        expect(history.undo()).not.toBe(null);
        expect(history.undo()).not.toBe(null);
        expect(history.undo()).toBe(null);
    });

    it('merge-with-previous-single-undo', () => {
        const history = new EditCommandHistory();
        const first = new CounterCommand(1);
        const second = new CounterCommand(10);

        history.execute(first);
        history.execute(second, true);
        expect(first.value).toBe(1);
        expect(second.value).toBe(10);

        const undone = history.undo();
        expect(undone instanceof CompositeEditCommand).toBe(true);
        expect(first.value).toBe(0);
        expect(second.value).toBe(0);
        expect(history.canUndo).toBe(false);

        history.redo();
        expect(first.value).toBe(1);
        expect(second.value).toBe(10);
    });

    it('merge-extends-existing-composite', () => {
        const history = new EditCommandHistory();
        const first = new CounterCommand(1);
        const second = new CounterCommand(10);
        const third = new CounterCommand(100);

        history.execute(first);
        history.execute(second, true);
        history.execute(third, true);

        history.undo();
        expect(first.value).toBe(0);
        expect(second.value).toBe(0);
        expect(third.value).toBe(0);
        expect(history.canUndo).toBe(false);
    });

    it('clear-resets-both-stacks', () => {
        const history = new EditCommandHistory();
        history.execute(new CounterCommand(1));
        history.undo();
        history.execute(new CounterCommand(1));
        history.clear();
        expect(history.canUndo).toBe(false);
        expect(history.canRedo).toBe(false);
    });
});
