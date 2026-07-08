import { EditCommand } from '@coderline/alphatab/editor/EditCommand';
import type { Beat } from '@coderline/alphatab/model/Beat';

/**
 * Groups multiple edit commands into one atomic undo step.
 * Execution happens in forward order, undo in reverse order.
 * @public
 */
export class CompositeEditCommand extends EditCommand {
    private readonly _description: string;

    /**
     * The commands contained in this composite.
     */
    public readonly commands: EditCommand[] = [];

    public constructor(description: string, commands: EditCommand[]) {
        super();
        this._description = description;
        for (const c of commands) {
            this.commands.push(c);
        }
    }

    public get description(): string {
        return this._description;
    }

    public get firstAffectedMasterBarIndex(): number {
        let first = -1;
        for (const c of this.commands) {
            const candidate = c.firstAffectedMasterBarIndex;
            if (first === -1 || candidate < first) {
                first = candidate;
            }
        }
        return first === -1 ? 0 : first;
    }

    public override get lastAffectedMasterBarIndex(): number {
        let last = -1;
        for (const c of this.commands) {
            const candidate = c.lastAffectedMasterBarIndex;
            if (candidate > last) {
                last = candidate;
            }
        }
        return last === -1 ? 0 : last;
    }

    public override get audioFeedbackBeat(): Beat | null {
        for (let i = this.commands.length - 1; i >= 0; i--) {
            const beat = this.commands[i].audioFeedbackBeat;
            if (beat !== null) {
                return beat;
            }
        }
        return null;
    }

    public execute(): void {
        for (const c of this.commands) {
            c.execute();
        }
    }

    public undo(): void {
        for (let i = this.commands.length - 1; i >= 0; i--) {
            this.commands[i].undo();
        }
    }

    public override redo(): void {
        for (const c of this.commands) {
            c.redo();
        }
    }
}
