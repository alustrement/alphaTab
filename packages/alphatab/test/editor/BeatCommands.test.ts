import { describe, expect, it } from 'vitest';
import { Settings } from '@coderline/alphatab/Settings';
import { AddBeatCommand } from '@coderline/alphatab/editor/commands/AddBeatCommand';
import { ChangeBeatDurationCommand } from '@coderline/alphatab/editor/commands/ChangeBeatDurationCommand';
import { ClearBeatNotesCommand } from '@coderline/alphatab/editor/commands/ClearBeatNotesCommand';
import { RemoveBeatCommand } from '@coderline/alphatab/editor/commands/RemoveBeatCommand';
import { ToggleBeatDotCommand } from '@coderline/alphatab/editor/commands/ToggleBeatDotCommand';
import { ToggleNoteTieCommand } from '@coderline/alphatab/editor/commands/ToggleNoteTieCommand';
import { ScoreLoader } from '@coderline/alphatab/importer/ScoreLoader';
import { Beat } from '@coderline/alphatab/model/Beat';
import { Duration } from '@coderline/alphatab/model/Duration';
import { Note } from '@coderline/alphatab/model/Note';
import type { Score } from '@coderline/alphatab/model/Score';
import type { Voice } from '@coderline/alphatab/model/Voice';

describe('BeatCommandsTests', () => {
    /**
     * @static
     */
    function parseTex(tex: string): Score {
        return ScoreLoader.loadAlphaTex(tex, new Settings());
    }

    /**
     * @static
     */
    function expectChainConsistent(voice: Voice): void {
        for (let i = 0; i < voice.beats.length; i++) {
            const beat = voice.beats[i];
            expect(beat.index).toBe(i);
            if (i > 0) {
                expect(beat.previousBeat).toBe(voice.beats[i - 1]);
            }
            if (i < voice.beats.length - 1) {
                expect(beat.nextBeat).toBe(voice.beats[i + 1]);
            }
        }
    }

    it('add-beat-mid-voice', () => {
        const settings = new Settings();
        const score = parseTex('3.3.4 3.3.4 3.3.4 3.3.4 | 3.3.4 3.3.4 3.3.4 3.3.4');
        const voice = score.tracks[0].staves[0].bars[0].voices[0];
        const followerStartBefore = voice.beats[2].playbackStart;

        const newBeat = new Beat();
        newBeat.duration = Duration.Quarter;
        const note = new Note();
        note.string = 1;
        note.fret = 0;
        newBeat.addNote(note);
        newBeat.isEmpty = false;

        const command = new AddBeatCommand(voice, newBeat, 2);
        command.execute();
        score.finish(settings);

        expect(voice.beats.length).toBe(5);
        expect(voice.beats[2]).toBe(newBeat);
        expectChainConsistent(voice);
        // the beat after the insertion shifted by a quarter.
        expect(voice.beats[3].playbackStart > followerStartBefore).toBe(true);
        // cross-bar chain: last beat of bar 0 chains into bar 1.
        const lastOfBar0 = voice.beats[voice.beats.length - 1];
        const firstOfBar1 = score.tracks[0].staves[0].bars[1].voices[0].beats[0];
        expect(lastOfBar0.nextBeat).toBe(firstOfBar1);

        command.undo();
        score.finish(settings);
        expect(voice.beats.length).toBe(4);
        expectChainConsistent(voice);
        expect(voice.beats[2].playbackStart).toBe(followerStartBefore);
    });

    it('remove-beat-throws-on-single-beat-voice', () => {
        const score = parseTex('3.3.1');
        const beat = score.tracks[0].staves[0].bars[0].voices[0].beats[0];
        const command = new RemoveBeatCommand(beat);
        expect(() => command.execute()).toThrow();
    });

    it('remove-beat-restores-same-instance', () => {
        const settings = new Settings();
        const score = parseTex('3.3.4 5.3.4 7.3.4 8.3.4');
        const voice = score.tracks[0].staves[0].bars[0].voices[0];
        const beat = voice.beats[1];
        const beatId = beat.id;

        const command = new RemoveBeatCommand(beat);
        command.execute();
        score.finish(settings);
        expect(voice.beats.length).toBe(3);
        expectChainConsistent(voice);

        command.undo();
        score.finish(settings);
        expect(voice.beats.length).toBe(4);
        expect(voice.beats[1]).toBe(beat);
        expect(voice.beats[1].id).toBe(beatId);
        expectChainConsistent(voice);
    });

    it('change-duration-shifts-following-beats', () => {
        const settings = new Settings();
        const score = parseTex('3.3.4 3.3.4 3.3.4 3.3.4');
        const voice = score.tracks[0].staves[0].bars[0].voices[0];
        const beat = voice.beats[0];
        const oldPlaybackDuration = beat.playbackDuration;
        const followerStartBefore = voice.beats[1].playbackStart;

        const command = new ChangeBeatDurationCommand(beat, Duration.Half);
        command.execute();
        score.finish(settings);
        expect(beat.duration).toBe(Duration.Half);
        expect(beat.playbackDuration).toBe(oldPlaybackDuration * 2);
        expect(voice.beats[1].playbackStart).toBe(followerStartBefore * 2);

        command.undo();
        score.finish(settings);
        expect(beat.duration).toBe(Duration.Quarter);
        expect(beat.playbackDuration).toBe(oldPlaybackDuration);
        expect(voice.beats[1].playbackStart).toBe(followerStartBefore);
    });

    it('toggle-dot-changes-playback-duration', () => {
        const settings = new Settings();
        const score = parseTex('3.3.4 3.3.4 3.3.4 3.3.4');
        const beat = score.tracks[0].staves[0].bars[0].voices[0].beats[0];
        const baseDuration = beat.playbackDuration;

        const command = new ToggleBeatDotCommand(beat, 1);
        command.execute();
        score.finish(settings);
        expect(beat.dots).toBe(1);
        expect(beat.playbackDuration).toBe((baseDuration * 3) / 2);

        command.undo();
        score.finish(settings);
        expect(beat.dots).toBe(0);
        expect(beat.playbackDuration).toBe(baseDuration);
    });

    it('clear-beat-notes-converts-to-rest-and-restores', () => {
        const settings = new Settings();
        const score = parseTex('(3.3 5.2).4 3.3.4 3.3.4 3.3.4');
        const beat = score.tracks[0].staves[0].bars[0].voices[0].beats[0];
        const firstNote = beat.notes[0];
        const secondNote = beat.notes[1];
        const duration = beat.duration;

        const command = new ClearBeatNotesCommand(beat);
        command.execute();
        score.finish(settings);
        expect(beat.notes.length).toBe(0);
        expect(beat.isRest).toBe(true);
        expect(beat.duration).toBe(duration);

        command.undo();
        score.finish(settings);
        expect(beat.notes.length).toBe(2);
        expect(beat.notes[0]).toBe(firstNote);
        expect(beat.notes[1]).toBe(secondNote);
        expect(beat.isRest).toBe(false);
    });

    it('toggle-tie-resolves-origin-after-finish', () => {
        const settings = new Settings();
        const score = parseTex('3.3.4 3.3.4 3.3.4 3.3.4');
        const voice = score.tracks[0].staves[0].bars[0].voices[0];
        const origin = voice.beats[0].notes[0];
        const destination = voice.beats[1].notes[0];

        const command = new ToggleNoteTieCommand(destination, true);
        command.execute();
        score.finish(settings);
        expect(destination.isTieDestination).toBe(true);
        expect(destination.tieOrigin).toBe(origin);
        expect(origin.isTieOrigin).toBe(true);

        command.undo();
        score.finish(settings);
        expect(destination.isTieDestination).toBe(false);
    });
});
