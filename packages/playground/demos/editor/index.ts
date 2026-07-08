import { EditorApp } from '../../src/apps/EditorApp';

const root = document.getElementById('app');
if (!root) {
    throw new Error('#app element not found');
}
const app = new EditorApp();
root.appendChild(app.root);
