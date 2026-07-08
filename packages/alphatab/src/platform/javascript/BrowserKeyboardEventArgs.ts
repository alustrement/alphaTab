import type { IKeyboardEventArgs } from '@coderline/alphatab/platform/IKeyboardEventArgs';

/**
 * @target web
 * @internal
 */
export class BrowserKeyboardEventArgs implements IKeyboardEventArgs {
    public readonly keyboardEvent: KeyboardEvent;

    public get key(): string {
        return this.keyboardEvent.key;
    }

    public get ctrlKey(): boolean {
        return this.keyboardEvent.ctrlKey;
    }

    public get metaKey(): boolean {
        return this.keyboardEvent.metaKey;
    }

    public get shiftKey(): boolean {
        return this.keyboardEvent.shiftKey;
    }

    public get altKey(): boolean {
        return this.keyboardEvent.altKey;
    }

    public preventDefault(): void {
        this.keyboardEvent.preventDefault();
    }

    public constructor(e: KeyboardEvent) {
        this.keyboardEvent = e;
    }
}
