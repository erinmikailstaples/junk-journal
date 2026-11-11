import { mkdir, readdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

await mkdir('dist', { recursive: true });
const templates = (await readdir('.')).filter(file => file.endsWith('.hbs'));
await rm('dist/erin-junk-journal.zip', { force: true });
execFileSync('zip', ['-q', '-r', 'dist/erin-junk-journal.zip', ...templates, 'partials', 'assets', 'package.json', 'README.md', 'LICENSE', '-x', '*/.DS_Store'], { stdio: 'inherit' });
console.log('Created dist/erin-junk-journal.zip');
