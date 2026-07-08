import * as alphaTab from '@coderline/alphatab';
import { NavMenu } from '../components/NavMenu';
import { type Mountable, css, html, injectStyles, parseHtml } from '../util/Dom';
import { Paths } from '../util/Paths';

injectStyles(
    'EditorApp',
    css`
    .at-wrap.at-wrap-editor {
        position: relative;
        width: 90vw;
        height: 90vh;
        margin: 0 auto;
        border: 1px solid rgba(0, 0, 0, 0.12);
        background: #fff;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
    .at-wrap-editor > .at-content {
        flex: 1 1 auto;
        overflow: hidden;
        position: relative;
        display: flex;
    }
    .at-wrap-editor .at-viewport {
        overflow-y: auto;
        flex: 1 1 auto;
        position: relative;
    }
    .at-wrap-editor .editor-help {
        flex: 0 0 260px;
        overflow-y: auto;
        border-left: 1px solid rgba(0, 0, 0, 0.12);
        padding: 12px;
        font-size: 13px;
        line-height: 1.6;
    }
    .at-wrap-editor .editor-help h3 {
        margin: 0 0 8px 0;
        font-size: 14px;
    }
    .at-wrap-editor .editor-help kbd {
        background: #eee;
        border: 1px solid #ccc;
        border-radius: 3px;
        padding: 0 4px;
        font-size: 12px;
    }
    .at-wrap-editor .editor-toolbar {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        border-top: 1px solid rgba(0, 0, 0, 0.12);
        background: #f8f8f8;
        font-size: 13px;
    }
    .at-wrap-editor .editor-toolbar button {
        padding: 4px 12px;
        cursor: pointer;
    }
    .at-wrap-editor .editor-toolbar button:disabled {
        cursor: default;
        opacity: 0.5;
    }
    .at-wrap-editor .editor-status {
        margin-left: auto;
        color: #555;
    }
    .at-wrap-editor .at-canvas .at-cursor-edit {
        background: rgba(32, 64, 255, 0.25);
        outline: 1px solid rgba(32, 64, 255, 0.6);
    }
    .at-wrap-editor .at-canvas .at-cursor-bar {
        background: rgba(255, 242, 0, 0.25);
    }
    .at-wrap-editor .at-canvas .at-cursor-beat {
        background: rgba(64, 64, 255, 0.75);
    }
    `
);

const DEMO_TEX = `\\title "Editor Demo"
.
\\track "Guitar" \\staff {score tabs}
3.3.4 5.3.4 7.3.4 8.3.4 |
r.4 3.4.4 5.4.4 r.4 |
(3.3 5.2).2 7.1.2 |
3.3.1
`;

export class EditorApp implements Mountable {
    public readonly root: HTMLElement;
    public readonly api: alphaTab.AlphaTabApi;

    private readonly _undoButton: HTMLButtonElement;
    private readonly _redoButton: HTMLButtonElement;
    private readonly _status: HTMLElement;

    constructor() {
        this.root = parseHtml(html`
            <div class="at-wrap at-wrap-editor">
                <div class="at-content">
                    <div class="at-viewport">
                        <div class="at-canvas"></div>
                    </div>
                    <div class="editor-help"></div>
                </div>
                <div class="editor-toolbar">
                    <button type="button" class="editor-undo" disabled>Undo</button>
                    <button type="button" class="editor-redo" disabled>Redo</button>
                    <span class="editor-status">Click a beat to place the edit cursor</span>
                </div>
            </div>
        `);

        // the help panel contains markup, so it is not routed through the escaping template.
        this.root.querySelector<HTMLElement>('.editor-help')!.innerHTML = `
            <h3>Keyboard Bindings</h3>
            <div><kbd>&larr;</kbd>/<kbd>&rarr;</kbd> previous/next beat &middot; <kbd>Ctrl</kbd>+<kbd>&larr;</kbd>/<kbd>&rarr;</kbd> bar</div>
            <div><kbd>&uarr;</kbd>/<kbd>&darr;</kbd> string up/down</div>
            <div><kbd>Home</kbd>/<kbd>End</kbd> first/last beat of bar</div>
            <div><kbd>0</kbd>-<kbd>9</kbd> fret (two digits within 800ms combine)</div>
            <div><kbd>a</kbd>-<kbd>g</kbd> note by name</div>
            <div><kbd>+</kbd>/<kbd>-</kbd> longer/shorter duration &middot; <kbd>Alt</kbd>+<kbd>1</kbd>-<kbd>7</kbd> explicit</div>
            <div><kbd>.</kbd> dot &middot; <kbd>Shift</kbd>+<kbd>.</kbd> double dot</div>
            <div><kbd>r</kbd> rest &middot; <kbd>t</kbd> tie</div>
            <div><kbd>Insert</kbd> insert beat &middot; <kbd>Delete</kbd>/<kbd>Backspace</kbd> remove</div>
            <div><kbd>Ctrl</kbd>+<kbd>z</kbd> undo &middot; <kbd>Ctrl</kbd>+<kbd>y</kbd> redo</div>
            <div><kbd>Esc</kbd> reset fret input</div>
        `;

        const viewport = this.root.querySelector<HTMLElement>('.at-viewport')!;
        const canvas = this.root.querySelector<HTMLElement>('.at-canvas')!;
        this._undoButton = this.root.querySelector<HTMLButtonElement>('.editor-undo')!;
        this._redoButton = this.root.querySelector<HTMLButtonElement>('.editor-redo')!;
        this._status = this.root.querySelector<HTMLElement>('.editor-status')!;

        const settings = new alphaTab.Settings();
        settings.fillFromJson({
            core: {
                fontDirectory: Paths.fontDirectory,
                includeNoteBounds: true,
                tex: true
            },
            editor: {
                enabled: true
            },
            player: {
                playerMode: alphaTab.PlayerMode.EnabledAutomatic,
                soundFont: Paths.soundFont,
                scrollElement: viewport
            }
        } satisfies alphaTab.json.SettingsJson);

        canvas.textContent = DEMO_TEX;
        this.api = new alphaTab.AlphaTabApi(canvas, settings);
        this.api.error.on(e => console.error('alphaTab error', e));

        const editor = this.api.editor!;
        this._undoButton.addEventListener('click', () => editor.undo());
        this._redoButton.addEventListener('click', () => editor.redo());
        editor.historyChanged.on(() => {
            this._undoButton.disabled = !editor.canUndo;
            this._redoButton.disabled = !editor.canRedo;
        });
        editor.cursorChanged.on(cursor => {
            const beat = cursor.beat;
            if (!beat) {
                this._status.textContent = 'No cursor';
                return;
            }
            const bar = beat.voice.bar.index + 1;
            const beatIndex = beat.index + 1;
            const stringInfo = beat.voice.bar.staff.isStringed ? `, string ${cursor.string}` : '';
            this._status.textContent = `Bar ${bar}, beat ${beatIndex}${stringInfo}`;
        });

        const nav = new NavMenu();
        document.body.appendChild(nav.root);

        if (typeof window !== 'undefined') {
            (window as unknown as Record<string, unknown>).api = this.api;
            (window as unknown as Record<string, unknown>).alphaTab = alphaTab;
        }
    }
}
