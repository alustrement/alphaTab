import { describe, expect, it } from 'vitest';
import { Settings } from '@coderline/alphatab/Settings';
import { ScoreLoader } from '@coderline/alphatab/importer/ScoreLoader';
import { Beat } from '@coderline/alphatab/model/Beat';
import { JsonConverter } from '@coderline/alphatab/model/JsonConverter';
import { ModelUtils } from '@coderline/alphatab/model/ModelUtils';
import { Note } from '@coderline/alphatab/model/Note';

describe('IdCounterSyncTests', () => {
    it('new-objects-get-unique-ids-after-json-round-trip', () => {
        const settings = new Settings();
        const score = ScoreLoader.loadAlphaTex('3.3.4 3.3.4 3.3.4 3.3.4 | 3.3.4 3.3.4 3.3.4 3.3.4', settings);

        // the JSON round-trip restores the stored ids without resetting the global counters.
        const restored = JsonConverter.jsObjectToScore(JsonConverter.scoreToJsObject(score), settings);
        ModelUtils.syncIdCounters(restored);

        const existingBeatIds = new Set<number>();
        const existingNoteIds = new Set<number>();
        for (const track of restored.tracks) {
            for (const staff of track.staves) {
                for (const bar of staff.bars) {
                    for (const voice of bar.voices) {
                        for (const beat of voice.beats) {
                            existingBeatIds.add(beat.id);
                            for (const note of beat.notes) {
                                existingNoteIds.add(note.id);
                            }
                        }
                    }
                }
            }
        }

        const newBeat = new Beat();
        const newNote = new Note();
        expect(existingBeatIds.has(newBeat.id)).toBe(false);
        expect(existingNoteIds.has(newNote.id)).toBe(false);
    });
});
