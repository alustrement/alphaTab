import { describe, expect, it } from 'vitest';
import { Settings } from '@coderline/alphatab/Settings';
import { AddNoteCommand } from '@coderline/alphatab/editor/commands/AddNoteCommand';
import { ChangeNoteFretCommand } from '@coderline/alphatab/editor/commands/ChangeNoteFretCommand';
import { RemoveNoteCommand } from '@coderline/alphatab/editor/commands/RemoveNoteCommand';
import { ScoreLoader } from '@coderline/alphatab/importer/ScoreLoader';
import { Note } from '@coderline/alphatab/model/Note';
import type { Score } from '@coderline/alphatab/model/Score';

describe('NoteCommandsTests', () => {
    /**
     * @static
     */
    function parseTex(tex: string): Score {
        return ScoreLoader.loadAlphaTex(tex, new Settings());
    }

    it('add-note-on-rest-beat', () => {
        const settings = new Settings();
        const score = parseTex('3.3.4 r.4 r.4 r.4');
        const beat = score.tracks[0].staves[0].bars[0].voices[0].beats[1];
        expect(beat.isRest).toBe(true);

        const note = new Note();
        note.string = 2;
        note.fret = 5;
        const command = new AddNoteCommand(beat, note);
        command.execute();
        score.finish(settings);

        expect(beat.notes.length).toBe(1);
        expect(beat.isRest).toBe(false);
        expect(beat.isEmpty).toBe(false);
        expect(beat.getNoteOnString(2)).toBe(note);
        expect(note.realValue > 0).toBe(true);

        command.undo();
        score.finish(settings);
        expect(beat.notes.length).toBe(0);
        expect(beat.isRest).toBe(true);
    });

    it('add-note-id-stable-across-undo-redo', () => {
        const settings = new Settings();
        const score = parseTex('3.3.4 r.4 r.4 r.4');
        const beat = score.tracks[0].staves[0].bars[0].voices[0].beats[1];

        const note = new Note();
        note.string = 1;
        note.fret = 7;
        const noteId = note.id;
        const command = new AddNoteCommand(beat, note);

        command.execute();
        score.finish(settings);
        command.undo();
        score.finish(settings);
        command.redo();
        score.finish(settings);

        expect(beat.notes.length).toBe(1);
        expect(beat.notes[0]).toBe(note);
        expect(beat.notes[0].id).toBe(noteId);
    });

    it('remove-note-restores-same-instance-and-index', () => {
        const settings = new Settings();
        const score = parseTex('(3.3 5.2 7.1).4 3.3.4 3.3.4 3.3.4');
        const beat = score.tracks[0].staves[0].bars[0].voices[0].beats[0];
        expect(beat.notes.length).toBe(3);

        const note = beat.notes[1];
        const noteString = note.string;
        const noteId = note.id;
        const command = new RemoveNoteCommand(note);
        command.execute();
        score.finish(settings);
        expect(beat.notes.length).toBe(2);
        expect(beat.getNoteOnString(noteString)).toBe(null);

        command.undo();
        score.finish(settings);
        expect(beat.notes.length).toBe(3);
        expect(beat.notes[1]).toBe(note);
        expect(beat.notes[1].id).toBe(noteId);
        expect(beat.getNoteOnString(noteString)).toBe(note);
    });

    it('remove-last-note-makes-beat-a-rest', () => {
        const settings = new Settings();
        const score = parseTex('3.3.4 3.3.4 3.3.4 3.3.4');
        const beat = score.tracks[0].staves[0].bars[0].voices[0].beats[0];
        const note = beat.notes[0];
        const duration = beat.duration;

        const command = new RemoveNoteCommand(note);
        command.execute();
        score.finish(settings);

        expect(beat.isRest).toBe(true);
        expect(beat.duration).toBe(duration);
    });

    it('change-fret-updates-real-value', () => {
        const settings = new Settings();
        const score = parseTex('3.3.4 3.3.4 3.3.4 3.3.4');
        const note = score.tracks[0].staves[0].bars[0].voices[0].beats[0].notes[0];
        const oldRealValue = note.realValue;

        const command = new ChangeNoteFretCommand(note, 5);
        command.execute();
        score.finish(settings);
        expect(note.fret).toBe(5);
        expect(note.realValue).toBe(oldRealValue + 2);

        command.undo();
        score.finish(settings);
        expect(note.fret).toBe(3);
        expect(note.realValue).toBe(oldRealValue);
    });
});
