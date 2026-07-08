/**
 * This interface represents the information about a keyboard event that occurred on the UI.
 * Key values follow the W3C KeyboardEvent.key naming (e.g. 'a', '1', 'ArrowLeft', 'Delete', 'Escape', '+').
 * @public
 */
export interface IKeyboardEventArgs {
    /**
     * The value of the key which was pressed (W3C KeyboardEvent.key naming).
     */
    readonly key: string;

    /**
     * Whether the Control key was held during the event.
     */
    readonly ctrlKey: boolean;

    /**
     * Whether the Meta key (e.g. Cmd on macOS) was held during the event.
     */
    readonly metaKey: boolean;

    /**
     * Whether the Shift key was held during the event.
     */
    readonly shiftKey: boolean;

    /**
     * Whether the Alt key was held during the event.
     */
    readonly altKey: boolean;

    /**
     * Prevents the default action of the UI framework for this event.
     */
    preventDefault(): void;
}
