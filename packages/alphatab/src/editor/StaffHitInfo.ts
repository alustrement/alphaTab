import type { Beat } from '@coderline/alphatab/model/Beat';

/**
 * What a position on the rendered score points at, resolved by
 * {@link ScoreEditor.getStaffPositionAt} for host note-input surfaces
 * (ghost note preview, click-to-enter).
 * @public
 */
export class StaffHitInfo {
    /**
     * The beat under the position.
     */
    public beat!: Beat;

    /**
     * Whether the hit staff is a tablature staff.
     */
    public isStringed: boolean = false;

    /**
     * The string under the position on tablature staves
     * ({@link Note.string} semantics, 1 = lowest). 0 on standard staves.
     */
    public string: number = 0;

    /**
     * The natural diatonic midi value the vertical position corresponds to on
     * standard staves (based on the bar's clef). -1 on tablature staves.
     */
    public midi: number = -1;

    /**
     * The X coordinate of the beat's visual bounds (canvas-relative).
     */
    public snapX: number = 0;

    /**
     * The Y coordinate of the staff step/string line the position snapped to
     * (canvas-relative).
     */
    public snapY: number = 0;
}
