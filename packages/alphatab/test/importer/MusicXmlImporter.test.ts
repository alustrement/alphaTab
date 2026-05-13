import { describe, expect, it } from 'vitest';
import { BendType } from '@coderline/alphatab/model/BendType';
import { Clef } from '@coderline/alphatab/model/Clef';
import { JsonConverter } from '@coderline/alphatab/model/JsonConverter';
import { Ottavia } from '@coderline/alphatab/model/Ottavia';
import { BarNumberDisplay } from '@coderline/alphatab/model/RenderStylesheet';
import type { Score } from '@coderline/alphatab/model/Score';
import { MusicXmlImporterTestHelper } from 'test/importer/MusicXmlImporterTestHelper';

describe('MusicXmlImporterTests', () => {
    it('track-volume', async () => {
        const score: Score = await MusicXmlImporterTestHelper.testReferenceFile(
            'test-data/musicxml3/track-volume-balance.musicxml'
        );

        expect(score.tracks[0].playbackInfo.volume).toBe(16);
        expect(score.tracks[1].playbackInfo.volume).toBe(12);
        expect(score.tracks[2].playbackInfo.volume).toBe(8);
        expect(score.tracks[3].playbackInfo.volume).toBe(4);
        expect(score.tracks[4].playbackInfo.volume).toBe(0);
    });

    it('track-balance', async () => {
        const score: Score = await MusicXmlImporterTestHelper.testReferenceFile(
            'test-data/musicxml3/track-volume-balance.musicxml'
        );

        expect(score.tracks[0].playbackInfo.balance).toBe(0);
        expect(score.tracks[1].playbackInfo.balance).toBe(4);
        expect(score.tracks[2].playbackInfo.balance).toBe(8);
        expect(score.tracks[3].playbackInfo.balance).toBe(12);
        expect(score.tracks[4].playbackInfo.balance).toBe(16);
    });

    it('full-bar-rest', async () => {
        const score: Score = await MusicXmlImporterTestHelper.testReferenceFile(
            'test-data/musicxml3/full-bar-rest.musicxml'
        );

        expect(score.tracks[0].staves[0].bars[0].voices[0].beats[0].isFullBarRest).toBe(true);
        expect(score.tracks[0].staves[0].bars[1].voices[0].beats[0].isFullBarRest).toBe(true);
        expect(score.tracks[0].staves[0].bars[2].voices[0].beats[0].isFullBarRest).toBe(true);
    });

    it('first-bar-tempo', async () => {
        const score: Score = await MusicXmlImporterTestHelper.testReferenceFile(
            'test-data/musicxml3/first-bar-tempo.musicxml'
        );

        expect(score.tempo).toBe(60);
        expect(score.masterBars[0].tempoAutomations.length).toBe(1);
        expect(score.masterBars[0].tempoAutomations[0]?.value).toBe(60);
        expect(score.masterBars[1].tempoAutomations.length).toBe(1);
        expect(score.masterBars[1].tempoAutomations[0].value).toBe(60);
    });
    it('tie-destination', async () => {
        let score: Score = await MusicXmlImporterTestHelper.testReferenceFile(
            'test-data/musicxml3/tie-destination.musicxml'
        );

        expect(score.tracks[0].staves[0].bars[0].voices[0].beats[1].notes[0].isTieOrigin).toBe(true);
        expect(score.tracks[0].staves[0].bars[0].voices[0].beats[1].notes[0].tieDestination).toBeTruthy();

        expect(score.tracks[0].staves[0].bars[0].voices[0].beats[2].notes[0].isTieDestination).toBe(true);
        expect(score.tracks[0].staves[0].bars[0].voices[0].beats[2].notes[0].tieOrigin).toBeTruthy();

        score = JsonConverter.jsObjectToScore(JsonConverter.scoreToJsObject(score));

        expect(score.tracks[0].staves[0].bars[0].voices[0].beats[1].notes[0].isTieOrigin).toBe(true);
        expect(score.tracks[0].staves[0].bars[0].voices[0].beats[1].notes[0].tieDestination).toBeTruthy();

        expect(score.tracks[0].staves[0].bars[0].voices[0].beats[2].notes[0].isTieDestination).toBe(true);
        expect(score.tracks[0].staves[0].bars[0].voices[0].beats[2].notes[0].tieOrigin).toBeTruthy();
    });
    it('chord-diagram', async () => {
        let score: Score = await MusicXmlImporterTestHelper.testReferenceFile(
            'test-data/musicxml3/chord-diagram.musicxml'
        );

        expect(score.tracks[0].staves[0].bars[0].voices[0].beats[0].chord).toBeTruthy();
        expect(score.tracks[0].staves[0].bars[0].voices[0].beats[0].chord!.name).toBe('C');
        expect(score.tracks[0].staves[0].bars[0].voices[0].beats[0].chord!.strings[0]).toBe(0);
        expect(score.tracks[0].staves[0].bars[0].voices[0].beats[0].chord!.strings[1]).toBe(1);
        expect(score.tracks[0].staves[0].bars[0].voices[0].beats[0].chord!.strings[2]).toBe(0);
        expect(score.tracks[0].staves[0].bars[0].voices[0].beats[0].chord!.strings[3]).toBe(2);
        expect(score.tracks[0].staves[0].bars[0].voices[0].beats[0].chord!.strings[4]).toBe(3);
        expect(score.tracks[0].staves[0].bars[0].voices[0].beats[0].chord!.strings[5]).toBe(-1);

        score = JsonConverter.jsObjectToScore(JsonConverter.scoreToJsObject(score));

        expect(score.tracks[0].staves[0].bars[0].voices[0].beats[0].chord).toBeTruthy();
        expect(score.tracks[0].staves[0].bars[0].voices[0].beats[0].chord!.name).toBe('C');
        expect(score.tracks[0].staves[0].bars[0].voices[0].beats[0].chord!.strings[0]).toBe(0);
        expect(score.tracks[0].staves[0].bars[0].voices[0].beats[0].chord!.strings[1]).toBe(1);
        expect(score.tracks[0].staves[0].bars[0].voices[0].beats[0].chord!.strings[2]).toBe(0);
        expect(score.tracks[0].staves[0].bars[0].voices[0].beats[0].chord!.strings[3]).toBe(2);
        expect(score.tracks[0].staves[0].bars[0].voices[0].beats[0].chord!.strings[4]).toBe(3);
        expect(score.tracks[0].staves[0].bars[0].voices[0].beats[0].chord!.strings[5]).toBe(-1);
    });
    it('compressed', async () => {
        const score: Score = await MusicXmlImporterTestHelper.testReferenceFile('test-data/musicxml3/compressed.mxl');

        expect(score.title).toBe('Title');
        expect(score.tracks.length).toBe(1);
        expect(score.masterBars.length).toBe(1);
    });
    it('bend', async () => {
        const score: Score = await MusicXmlImporterTestHelper.testReferenceFile('test-data/musicxml4/bends.xml');
        let note = score.tracks[0].staves[0].bars[0].voices[0].beats[0].notes[0];
        expect(note.bendType).toBe(BendType.Bend);
        expect(note.bendPoints!.length).toBe(2);
        expect(note.bendPoints![0].offset).toBe(0);
        expect(note.bendPoints![0].value).toBe(0);
        expect(note.bendPoints![1].offset).toBe(60);
        expect(note.bendPoints![1].value).toBe(2);

        note = score.tracks[0].staves[0].bars[0].voices[0].beats[1].notes[0];
        expect(note.bendType).toBe(BendType.Prebend);
        expect(note.bendPoints!.length).toBe(2);
        expect(note.bendPoints![0].offset).toBe(0);
        expect(note.bendPoints![0].value).toBe(4);
        expect(note.bendPoints![1].offset).toBe(60);
        expect(note.bendPoints![1].value).toBe(4);

        note = score.tracks[0].staves[0].bars[0].voices[0].beats[2].notes[0];
        expect(note.bendType).toBe(BendType.BendRelease);
        expect(note.bendPoints!.length).toBe(4);
        expect(note.bendPoints![0].offset).toBe(0);
        expect(note.bendPoints![0].value).toBe(0);
        expect(note.bendPoints![1].offset).toBe(30);
        expect(note.bendPoints![1].value).toBe(4);
        expect(note.bendPoints![2].offset).toBe(30);
        expect(note.bendPoints![2].value).toBe(4);
        expect(note.bendPoints![3].offset).toBe(60);
        expect(note.bendPoints![3].value).toBe(0);

        note = score.tracks[0].staves[0].bars[0].voices[0].beats[3].notes[0];
        expect(note.bendType).toBe(BendType.PrebendRelease);
        expect(note.bendPoints!.length).toBe(2);
        expect(note.bendPoints![0].offset).toBe(0);
        expect(note.bendPoints![0].value).toBe(2);
        expect(note.bendPoints![1].offset).toBe(60);
        expect(note.bendPoints![1].value).toBe(0);

        note = score.tracks[0].staves[0].bars[0].voices[0].beats[4].notes[0];
        expect(note.bendType).toBe(BendType.PrebendBend);
        expect(note.bendPoints!.length).toBe(2);
        expect(note.bendPoints![0].offset).toBe(0);
        expect(note.bendPoints![0].value).toBe(2);
        expect(note.bendPoints![1].offset).toBe(60);
        expect(note.bendPoints![1].value).toBe(4);

        note = score.tracks[0].staves[0].bars[1].voices[0].beats[0].notes[0];
        expect(note.bendType).toBe(BendType.BendRelease);
        expect(note.bendPoints!.length).toBe(4);
        expect(note.bendPoints![0].offset).toBe(0);
        expect(note.bendPoints![0].value).toBe(0);
        expect(note.bendPoints![1].offset).toBe(30);
        expect(note.bendPoints![1].value).toBe(2);
        expect(note.bendPoints![2].offset).toBe(30);
        expect(note.bendPoints![2].value).toBe(2);
        expect(note.bendPoints![3].offset).toBe(60);
        expect(note.bendPoints![3].value).toBe(0);

        note = score.tracks[0].staves[0].bars[1].voices[0].beats[0].notes[1];
        expect(note.bendType).toBe(BendType.BendRelease);
        expect(note.bendPoints!.length).toBe(4);
        expect(note.bendPoints![0].offset).toBe(0);
        expect(note.bendPoints![0].value).toBe(0);
        expect(note.bendPoints![1].offset).toBe(30);
        expect(note.bendPoints![1].value).toBe(2);
        expect(note.bendPoints![2].offset).toBe(30);
        expect(note.bendPoints![2].value).toBe(2);
        expect(note.bendPoints![3].offset).toBe(60);
        expect(note.bendPoints![3].value).toBe(0);

        note = score.tracks[0].staves[0].bars[1].voices[0].beats[0].notes[2];
        expect(note.bendType).toBe(BendType.None);

        note = score.tracks[0].staves[0].bars[1].voices[0].beats[1].notes[0];
        expect(note.bendType).toBe(BendType.Custom);
        expect(note.bendPoints!.length).toBe(12);
        expect(note.bendPoints![0].offset).toBe(0);
        expect(note.bendPoints![0].value).toBe(1);
        expect(note.bendPoints![1].offset).toBe(10);
        expect(note.bendPoints![1].value).toBe(1);
        expect(note.bendPoints![2].offset).toBe(10);
        expect(note.bendPoints![2].value).toBe(1);
        expect(note.bendPoints![3].offset).toBe(20);
        expect(note.bendPoints![3].value).toBe(3);
        expect(note.bendPoints![4].offset).toBe(20);
        expect(note.bendPoints![4].value).toBe(3);
        expect(note.bendPoints![5].offset).toBe(30);
        expect(note.bendPoints![5].value).toBe(4);
        expect(note.bendPoints![6].offset).toBe(30);
        expect(note.bendPoints![6].value).toBe(4);
        expect(note.bendPoints![7].offset).toBe(40);
        expect(note.bendPoints![7].value).toBe(8);
        expect(note.bendPoints![8].offset).toBe(40);
        expect(note.bendPoints![8].value).toBe(8);
        expect(note.bendPoints![9].offset).toBe(50);
        expect(note.bendPoints![9].value).toBe(4);
        expect(note.bendPoints![10].offset).toBe(50);
        expect(note.bendPoints![10].value).toBe(4);
        expect(note.bendPoints![11].offset).toBe(60);
        expect(note.bendPoints![11].value).toBe(8);

        note = score.tracks[0].staves[0].bars[1].voices[0].beats[2].notes[0];
        expect(note.bendType).toBe(BendType.PrebendRelease);
        expect(note.bendPoints!.length).toBe(2);
        expect(note.bendPoints![0].offset).toBe(0);
        expect(note.bendPoints![0].value).toBe(8);
        expect(note.bendPoints![1].offset).toBe(60);
        expect(note.bendPoints![1].value).toBe(0);

        note = score.tracks[0].staves[0].bars[1].voices[0].beats[3].notes[0];
        expect(note.bendType).toBe(BendType.Bend);
        expect(note.bendPoints!.length).toBe(2);
        expect(note.bendPoints![0].offset).toBe(0);
        expect(note.bendPoints![0].value).toBe(0);
        expect(note.bendPoints![1].offset).toBe(30);
        expect(note.bendPoints![1].value).toBe(2);
    });

    it('partwise-basic', async () => {
        const score = await MusicXmlImporterTestHelper.loadFile('test-data/musicxml4/partwise-basic.xml');
        expect(score).toMatchSnapshot();
    });

    it('timewise-basic', async () => {
        const score = await MusicXmlImporterTestHelper.loadFile('test-data/musicxml4/timewise-basic.xml');
        expect(score).toMatchSnapshot();
    });

    it('partwise-anacrusis', async () => {
        const score = await MusicXmlImporterTestHelper.loadFile('test-data/musicxml4/partwise-anacrusis.xml');
        expect(score).toMatchSnapshot();
    });

    it('timewise-anacrusis', async () => {
        const score = await MusicXmlImporterTestHelper.loadFile('test-data/musicxml4/timewise-anacrusis.xml');
        expect(score).toMatchSnapshot();
    });

    it('partwise-complex-measures', async () => {
        const score = await MusicXmlImporterTestHelper.loadFile('test-data/musicxml4/partwise-complex-measures.xml');
        expect(score).toMatchSnapshot();
    });

    it('partwise-staff-change', async () => {
        const score = await MusicXmlImporterTestHelper.loadFile('test-data/musicxml4/partwise-staff-change.xml');
        expect(score).toMatchSnapshot();
    });

    it('barlines', async () => {
        const score = await MusicXmlImporterTestHelper.loadFile('test-data/musicxml4/barlines.xml');
        expect(score).toMatchSnapshot();
    });

    it('2102-corrupt-direction', async () => {
        const score = await MusicXmlImporterTestHelper.loadFile('test-data/musicxml4/2102-corrupt-direction.xml');
        expect(score).toMatchSnapshot();
    });

    it('bank', async () => {
        const score = await MusicXmlImporterTestHelper.loadFile('test-data/musicxml4/midi-bank.xml');

        expect(score.tracks[0].playbackInfo.program).toBe(0);
        expect(score.tracks[0].playbackInfo.bank).toBe(0);

        expect(score.tracks[1].playbackInfo.program).toBe(1);
        expect(score.tracks[1].playbackInfo.bank).toBe(77);
    });

    it('buzzroll', async () => {
        const score = await MusicXmlImporterTestHelper.loadFile('test-data/musicxml4/buzzroll.xml');
        expect(score).toMatchSnapshot();
    });

    // MusicXML 4.0 clefs are assigned per staff via the clef@number attribute.
    // A clef declared for one staff must not propagate to another staff.
    // Spec: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/clef/
    it('percussion-clef-on-one-staff-does-not-propagate-to-another-staff', async () => {
        const xml = `
            <?xml version="1.0" encoding="UTF-8"?>
            <score-partwise version="3.1">
                <part-list>
                    <score-part id="P1">
                        <part-name>Drums</part-name>
                        <score-instrument id="P1-I1"><instrument-name>Drumset</instrument-name></score-instrument>
                        <midi-instrument id="P1-I1">
                            <midi-channel>10</midi-channel>
                            <midi-program>1</midi-program>
                            <midi-unpitched>38</midi-unpitched>
                        </midi-instrument>
                    </score-part>
                </part-list>
                <part id="P1">
                    <measure number="1">
                        <attributes>
                            <divisions>1</divisions>
                            <key><fifths>0</fifths></key>
                            <time><beats>4</beats><beat-type>4</beat-type></time>
                            <staves>2</staves>
                            <clef number="2"><sign>percussion</sign></clef>
                        </attributes>
                        <note>
                            <instrument id="P1-I1"/>
                            <pitch><step>D</step><octave>2</octave></pitch>
                            <duration>1</duration>
                            <voice>1</voice>
                            <type>quarter</type>
                            <staff>1</staff>
                        </note>
                        <backup><duration>1</duration></backup>
                        <note>
                            <instrument id="P1-I1"/>
                            <pitch><step>D</step><octave>2</octave></pitch>
                            <duration>1</duration>
                            <voice>1</voice>
                            <type>quarter</type>
                            <staff>2</staff>
                        </note>
                    </measure>
                </part>
            </score-partwise>`;

        const importer = MusicXmlImporterTestHelper.prepareImporterWithBytes(new TextEncoder().encode(xml));
        const score = importer.readScore();

        expect(score.tracks[0].staves[0].isPercussion).toBe(false);
        expect(score.tracks[0].staves[1].isPercussion).toBe(true);
        expect(score.tracks[0].staves[0].bars[0].clef).toBe(Clef.G2);
        expect(score.tracks[0].staves[1].bars[0].clef).toBe(Clef.Neutral);
    });

    // MusicXML defaults an unspecified clef to the G clef.
    // Spec: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/clef/
    it('missing-initial-clef-defaults-to-g-clef', async () => {
        const xml = `
            <?xml version="1.0" encoding="UTF-8"?>
            <score-partwise version="3.1">
                <part-list>
                    <score-part id="P1">
                        <part-name>Music</part-name>
                    </score-part>
                </part-list>
                <part id="P1">
                    <measure number="1">
                        <attributes>
                            <divisions>1</divisions>
                            <key><fifths>0</fifths></key>
                            <time><beats>4</beats><beat-type>4</beat-type></time>
                        </attributes>
                        <note>
                            <pitch><step>C</step><octave>4</octave></pitch>
                            <duration>1</duration>
                            <voice>1</voice>
                            <type>quarter</type>
                        </note>
                    </measure>
                </part>
            </score-partwise>`;

        const importer = MusicXmlImporterTestHelper.prepareImporterWithBytes(new TextEncoder().encode(xml));
        const score = importer.readScore();

        expect(score.tracks[0].staves[0].bars[0].clef).toBe(Clef.G2);
        expect(score.tracks[0].staves[0].bars[0].clefOttava).toBe(Ottavia.Regular);
    });

    // MusicXML clef state, including clef-octave-change, is carried on the same staff
    // until another clef is specified for that staff.
    // Spec: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/clef/
    // Spec: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/clef-octave-change/
    it('clef-and-ottava-are-inherited-on-the-same-staff-across-measures', async () => {
        const xml = `
            <?xml version="1.0" encoding="UTF-8"?>
            <score-partwise version="3.1">
                <part-list>
                    <score-part id="P1">
                        <part-name>Music</part-name>
                    </score-part>
                </part-list>
                <part id="P1">
                    <measure number="1">
                        <attributes>
                            <divisions>1</divisions>
                            <key><fifths>0</fifths></key>
                            <time><beats>4</beats><beat-type>4</beat-type></time>
                            <clef>
                                <sign>F</sign>
                                <line>4</line>
                                <clef-octave-change>-1</clef-octave-change>
                            </clef>
                        </attributes>
                        <note>
                            <pitch><step>C</step><octave>3</octave></pitch>
                            <duration>1</duration>
                            <voice>1</voice>
                            <type>quarter</type>
                        </note>
                    </measure>
                    <measure number="2">
                        <note>
                            <pitch><step>D</step><octave>3</octave></pitch>
                            <duration>1</duration>
                            <voice>1</voice>
                            <type>quarter</type>
                        </note>
                    </measure>
                </part>
            </score-partwise>`;

        const importer = MusicXmlImporterTestHelper.prepareImporterWithBytes(new TextEncoder().encode(xml));
        const score = importer.readScore();

        expect(score.tracks[0].staves[0].bars[0].clef).toBe(Clef.F4);
        expect(score.tracks[0].staves[0].bars[0].clefOttava).toBe(Ottavia._8vb);
        expect(score.tracks[0].staves[0].bars[1].clef).toBe(Clef.F4);
        expect(score.tracks[0].staves[0].bars[1].clefOttava).toBe(Ottavia._8vb);
    });

    // MusicXML percussion clefs indicate unpitched percussion notation.
    // This importer additionally maps pitched input on a percussion staff to known percussion articulations.
    // The percussion-staff part is grounded in the clef spec; articulation mapping is importer-specific behavior.
    // Spec: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/clef/
    it('pitched-percussion-without-instrument-tag-uses-known-articulation', async () => {
        const xml = `
            <?xml version="1.0" encoding="UTF-8"?>
            <score-partwise version="3.1">
                <part-list>
                    <score-part id="P1">
                        <part-name>Drums</part-name>
                    </score-part>
                </part-list>
                <part id="P1">
                    <measure number="1">
                        <attributes>
                            <divisions>1</divisions>
                            <key><fifths>0</fifths></key>
                            <time><beats>4</beats><beat-type>4</beat-type></time>
                            <clef><sign>percussion</sign></clef>
                        </attributes>
                        <note>
                            <pitch><step>D</step><octave>2</octave></pitch>
                            <duration>1</duration>
                            <voice>1</voice>
                            <type>quarter</type>
                        </note>
                        <note>
                            <pitch><step>C</step><alter>1</alter><octave>3</octave></pitch>
                            <duration>1</duration>
                            <voice>1</voice>
                            <type>quarter</type>
                        </note>
                    </measure>
                </part>
            </score-partwise>`;

        const importer = MusicXmlImporterTestHelper.prepareImporterWithBytes(new TextEncoder().encode(xml));
        const score = importer.readScore();
        const notes = score.tracks[0].staves[0].bars[0].voices[0].beats.flatMap(b => b.notes);

        expect(notes[0].displayValue).toBe(38);
        expect(notes[0].isPercussion).toBe(true);
        expect(notes[0].percussionArticulation).toBe(38);

        expect(notes[1].displayValue).toBe(49);
        expect(notes[1].isPercussion).toBe(true);
        expect(notes[1].percussionArticulation).toBe(49);
    });

    // MusicXML percussion clefs indicate unpitched percussion notation.
    // This importer additionally maps pitched chord members on a percussion staff to known percussion articulations.
    // The percussion-staff part is grounded in the clef spec; chord articulation mapping is importer-specific behavior.
    // Spec: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/clef/
    it('pitched-percussion-chord-without-instrument-tag-uses-known-articulation', async () => {
        const xml = `
            <?xml version="1.0" encoding="UTF-8"?>
            <score-partwise version="3.1">
                <part-list>
                    <score-part id="P1">
                        <part-name>Drums</part-name>
                    </score-part>
                </part-list>
                <part id="P1">
                    <measure number="1">
                        <attributes>
                            <divisions>1</divisions>
                            <key><fifths>0</fifths></key>
                            <time><beats>4</beats><beat-type>4</beat-type></time>
                            <clef><sign>percussion</sign></clef>
                        </attributes>
                        <note>
                            <pitch><step>D</step><octave>2</octave></pitch>
                            <duration>1</duration>
                            <voice>1</voice>
                            <type>quarter</type>
                        </note>
                        <note>
                            <chord/>
                            <pitch><step>C</step><alter>1</alter><octave>3</octave></pitch>
                            <duration>1</duration>
                            <voice>1</voice>
                            <type>quarter</type>
                        </note>
                    </measure>
                </part>
            </score-partwise>`;

        const importer = MusicXmlImporterTestHelper.prepareImporterWithBytes(new TextEncoder().encode(xml));
        const score = importer.readScore();
        const notes = score.tracks[0].staves[0].bars[0].voices[0].beats[0].notes;

        expect(notes[0].isPercussion).toBe(true);
        expect(notes[0].percussionArticulation).toBe(38);
        expect(notes[1].isPercussion).toBe(true);
        expect(notes[1].percussionArticulation).toBe(49);
    });

    describe('barnumberdisplay', async () => {
        async function testPartwise(filename: string, display: BarNumberDisplay) {
            const score = await MusicXmlImporterTestHelper.loadFile(`test-data/musicxml4/${filename}`);
            expect(score.tracks[0].staves[0].bars[1].barNumberDisplay).toBe(display);
            expect(score.tracks[1].staves[0].bars[2].barNumberDisplay).toBe(display);
        }

        async function testTimewise(filename: string, display: BarNumberDisplay) {
            const score = await MusicXmlImporterTestHelper.loadFile(`test-data/musicxml4/${filename}`);
            expect(score.tracks[0].staves[0].bars[1].barNumberDisplay).toBe(display);
            expect(score.tracks[1].staves[0].bars[1].barNumberDisplay).toBe(display);
        }

        it('partwise-none', async () =>
            await testPartwise('partwise-measure-numbering-none.xml', BarNumberDisplay.Hide));
        it('partwise-measure', async () =>
            await testPartwise('partwise-measure-numbering-measure.xml', BarNumberDisplay.AllBars));
        it('partwise-system', async () =>
            await testPartwise('partwise-measure-numbering-system.xml', BarNumberDisplay.FirstOfSystem));
        it('partwise-implicit', async () => {
            const score = await MusicXmlImporterTestHelper.loadFile('test-data/musicxml4/partwise-anacrusis.xml');
            expect(score.tracks[0].staves[0].bars[0].barNumberDisplay).toBe(BarNumberDisplay.Hide);
            expect(score.tracks[0].staves[0].bars[1].barNumberDisplay).toBeUndefined();
            expect(score.tracks[0].staves[0].bars[3].barNumberDisplay).toBe(BarNumberDisplay.Hide);
            expect(score.tracks[1].staves[0].bars[0].barNumberDisplay).toBe(BarNumberDisplay.Hide);
            expect(score.tracks[1].staves[0].bars[1].barNumberDisplay).toBeUndefined();
            expect(score.tracks[1].staves[0].bars[3].barNumberDisplay).toBe(BarNumberDisplay.Hide);
        });

        it('timewise-none', async () =>
            await testTimewise('timewise-measure-numbering-none.xml', BarNumberDisplay.Hide));
        it('timewise-measure', async () =>
            await testTimewise('timewise-measure-numbering-measure.xml', BarNumberDisplay.AllBars));
        it('timewise-system', async () =>
            await testTimewise('timewise-measure-numbering-system.xml', BarNumberDisplay.FirstOfSystem));
        it('timewise-implicit', async () => {
            const score = await MusicXmlImporterTestHelper.loadFile('test-data/musicxml4/timewise-anacrusis.xml');
            expect(score.tracks[0].staves[0].bars[0].barNumberDisplay).toBe(BarNumberDisplay.Hide);
            expect(score.tracks[0].staves[0].bars[1].barNumberDisplay).toBeUndefined();
            expect(score.tracks[0].staves[0].bars[3].barNumberDisplay).toBe(BarNumberDisplay.Hide);
            expect(score.tracks[1].staves[0].bars[0].barNumberDisplay).toBe(BarNumberDisplay.Hide);
            expect(score.tracks[1].staves[0].bars[1].barNumberDisplay).toBeUndefined();
            expect(score.tracks[1].staves[0].bars[3].barNumberDisplay).toBe(BarNumberDisplay.Hide);
        });
    });
});
