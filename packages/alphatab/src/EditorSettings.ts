/**
 * All settings related to the interactive score editing features.
 * @json
 * @json_declaration
 * @public
 */
export class EditorSettings {
    /**
     * Whether the interactive score editor is enabled.
     * @since 1.8.0
     * @defaultValue `false`
     * @category Editor
     */
    public enabled: boolean = false;

    /**
     * Whether edited notes are played via the player for audible feedback.
     * @since 1.8.0
     * @defaultValue `true`
     * @category Editor
     */
    public audioFeedback: boolean = true;

    /**
     * The maximum number of undo steps kept in the edit history.
     * @since 1.8.0
     * @defaultValue `100`
     * @category Editor
     */
    public maxUndoSteps: number = 100;

    /**
     * The time window (in milliseconds) in which consecutive fret digit inputs
     * are combined into one multi-digit fret (e.g. 1 followed by 2 becomes fret 12).
     * @since 1.8.0
     * @defaultValue `800`
     * @category Editor
     */
    public fretInputWindow: number = 800;

    /**
     * The highest fret accepted via keyboard fret input.
     * @since 1.8.0
     * @defaultValue `24`
     * @category Editor
     */
    public maxFret: number = 24;
}
