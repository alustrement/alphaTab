import { describe, expect, it } from 'vitest';
import { FretInputState } from '@coderline/alphatab/editor/FretInputState';
import { Beat } from '@coderline/alphatab/model/Beat';

describe('FretInputStateTests', () => {
    const windowMillis = 800;
    const maxFret = 24;

    it('combines-digits-within-window', () => {
        const state = new FretInputState();
        const beat = new Beat();

        const first = state.append(1, beat, 1, 1000, windowMillis, maxFret);
        expect(first.fret).toBe(1);
        expect(first.mergeWithPrevious).toBe(false);

        const second = state.append(2, beat, 1, 1500, windowMillis, maxFret);
        expect(second.fret).toBe(12);
        expect(second.mergeWithPrevious).toBe(true);
    });

    it('does-not-combine-outside-window', () => {
        const state = new FretInputState();
        const beat = new Beat();

        state.append(1, beat, 1, 1000, windowMillis, maxFret);
        const second = state.append(2, beat, 1, 2000, windowMillis, maxFret);
        expect(second.fret).toBe(2);
        expect(second.mergeWithPrevious).toBe(false);
    });

    it('does-not-combine-beyond-max-fret', () => {
        const state = new FretInputState();
        const beat = new Beat();

        state.append(2, beat, 1, 1000, windowMillis, maxFret);
        const second = state.append(5, beat, 1, 1100, windowMillis, maxFret);
        expect(second.fret).toBe(5);
        expect(second.mergeWithPrevious).toBe(false);
    });

    it('combines-up-to-max-fret', () => {
        const state = new FretInputState();
        const beat = new Beat();

        state.append(2, beat, 1, 1000, windowMillis, maxFret);
        const second = state.append(4, beat, 1, 1100, windowMillis, maxFret);
        expect(second.fret).toBe(24);
        expect(second.mergeWithPrevious).toBe(true);
    });

    it('target-change-resets-buffer', () => {
        const state = new FretInputState();
        const beat = new Beat();
        const otherBeat = new Beat();

        state.append(1, beat, 1, 1000, windowMillis, maxFret);
        const otherBeatResult = state.append(2, otherBeat, 1, 1100, windowMillis, maxFret);
        expect(otherBeatResult.fret).toBe(2);
        expect(otherBeatResult.mergeWithPrevious).toBe(false);

        state.append(1, beat, 1, 2000, windowMillis, maxFret);
        const otherStringResult = state.append(2, beat, 2, 2100, windowMillis, maxFret);
        expect(otherStringResult.fret).toBe(2);
        expect(otherStringResult.mergeWithPrevious).toBe(false);
    });

    it('reset-clears-buffer', () => {
        const state = new FretInputState();
        const beat = new Beat();

        state.append(1, beat, 1, 1000, windowMillis, maxFret);
        state.reset();
        const second = state.append(2, beat, 1, 1100, windowMillis, maxFret);
        expect(second.fret).toBe(2);
        expect(second.mergeWithPrevious).toBe(false);
    });
});
