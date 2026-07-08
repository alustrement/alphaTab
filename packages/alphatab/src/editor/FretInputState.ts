import type { Beat } from '@coderline/alphatab/model/Beat';

/**
 * The outcome of appending a fret digit.
 * @public
 */
export class FretInputResult {
    /**
     * The fret value to apply.
     */
    public fret: number = 0;

    /**
     * Whether the resulting command should be merged with the previous undo entry
     * (true when this input combined with the previous digit).
     */
    public mergeWithPrevious: boolean = false;
}

/**
 * Combines consecutive digit inputs into multi-digit frets without timers.
 * The caller provides the current time so the logic stays platform-neutral and testable.
 * @public
 */
export class FretInputState {
    private _lastBeat: Beat | null = null;
    private _lastString: number = -1;
    private _lastTime: number = 0;
    private _lastFret: number = -1;

    /**
     * Appends a typed digit targeting the given beat and string.
     * Digits combine when they target the same position, arrive within the
     * given time window, and the combined value does not exceed maxFret.
     * @param digit The typed digit (0-9).
     * @param beat The beat being edited.
     * @param noteString The string being edited.
     * @param now The current time in milliseconds (e.g. Date.now()).
     * @param windowMillis The combination time window in milliseconds.
     * @param maxFret The highest allowed fret.
     */
    public append(
        digit: number,
        beat: Beat,
        noteString: number,
        now: number,
        windowMillis: number,
        maxFret: number
    ): FretInputResult {
        const result = new FretInputResult();

        const sameTarget = this._lastBeat === beat && this._lastString === noteString;
        const inWindow = now - this._lastTime <= windowMillis;
        const combined = this._lastFret * 10 + digit;

        if (sameTarget && inWindow && this._lastFret >= 0 && combined <= maxFret) {
            result.fret = combined;
            result.mergeWithPrevious = true;
        } else {
            result.fret = digit;
            result.mergeWithPrevious = false;
        }

        this._lastBeat = beat;
        this._lastString = noteString;
        this._lastTime = now;
        this._lastFret = result.fret;

        return result;
    }

    /**
     * Resets the input buffer (e.g. on Escape or cursor movement).
     */
    public reset(): void {
        this._lastBeat = null;
        this._lastString = -1;
        this._lastTime = 0;
        this._lastFret = -1;
    }
}
