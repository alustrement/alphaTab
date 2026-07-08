import { describe, expect, it } from 'vitest';
import { Settings } from '@coderline/alphatab/Settings';
import { AddNoteCommand } from '@coderline/alphatab/editor/commands/AddNoteCommand';
import { ScoreLoader } from '@coderline/alphatab/importer/ScoreLoader';
import { AlphaSynthMidiFileHandler } from '@coderline/alphatab/midi/AlphaSynthMidiFileHandler';
import { MidiFile } from '@coderline/alphatab/midi/MidiFile';
import { MidiFileGenerator } from '@coderline/alphatab/midi/MidiFileGenerator';
import { NoteOnEvent } from '@coderline/alphatab/midi/MidiEvent';
import { Note } from '@coderline/alphatab/model/Note';
import type { Score } from '@coderline/alphatab/model/Score';

describe('EditMidiRegressionTests', () => {
    /**
     * @static
     */
    function countNoteOns(score: Score, settings: Settings): number {
        const midiFile = new MidiFile();
        const handler = new AlphaSynthMidiFileHandler(midiFile);
        const generator = new MidiFileGenerator(score, settings, handler);
        generator.generate();
        let count = 0;
        for (const track of midiFile.tracks) {
            for (const event of track.events) {
                if (event instanceof NoteOnEvent) {
                    count++;
                }
            }
        }
        return count;
    }

    it('midi-reflects-edit-and-undo', () => {
        const settings = new Settings();
        const score = ScoreLoader.loadAlphaTex('3.3.4 r.4 3.3.4 r.4', settings);
        const beat = score.tracks[0].staves[0].bars[0].voices[0].beats[1];

        const baseline = countNoteOns(score, settings);

        const note = new Note();
        note.string = 2;
        note.fret = 5;
        const command = new AddNoteCommand(beat, note);
        command.execute();
        score.finish(settings);
        expect(countNoteOns(score, settings)).toBe(baseline + 1);

        command.undo();
        score.finish(settings);
        expect(countNoteOns(score, settings)).toBe(baseline);
    });
});
