import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('../', import.meta.url));

test('the deployable archive contains native Ghost templates but no development files or routing overrides', () => {
    execFileSync(process.execPath, ['scripts/package.mjs'], { cwd });
    const entries = execFileSync('unzip', ['-Z1', 'dist/erin-junk-journal.zip'], { cwd, encoding: 'utf8' }).trim().split('\n');
    for (const path of ['home.hbs', 'page.hbs', 'page-resume.hbs', 'custom-resume.hbs', 'post.hbs', 'index.hbs', 'tag.hbs', 'author.hbs', 'default.hbs', 'partials/navigation.hbs', 'partials/resume-page.hbs', 'partials/resume-content.hbs', 'assets/css/journal.css', 'assets/js/journal.js', 'package.json']) {
        assert.ok(entries.includes(path), `Missing theme file: ${path}`);
    }
    const developmentFiles = entries.filter(path => /^(?:node_modules|scripts|test|browser-tests|\.github|\.git)\//.test(path));
    assert.deepEqual(developmentFiles, []);
    assert.ok(!entries.some(path => /(?:^|\/)(?:routes\.yaml|redirects\.(?:yaml|json)|\.env(?:\..*)?)$/.test(path)));
    const output = execFileSync(process.execPath, ['scripts/check.mjs', 'dist/erin-junk-journal.zip'], { cwd, encoding: 'utf8' });
    assert.match(output, /Ghost 5: 0 errors/);
    assert.match(output, /Ghost 6: 0 errors/);
});

test('archive validation rejects both incompatible themes and unreadable archives', () => {
    const directory = mkdtempSync(join(tmpdir(), 'journal-validation-'));
    try {
        writeFileSync(join(directory, 'index.hbs'), '<h1>Missing required theme files and helpers</h1>');
        const archive = join(directory, 'invalid.zip');
        execFileSync('zip', ['-q', archive, 'index.hbs'], { cwd: directory });
        const incompatible = spawnSync(process.execPath, ['scripts/check.mjs', archive], { cwd, encoding: 'utf8' });
        assert.equal(incompatible.status, 1, incompatible.stderr);
        assert.match(incompatible.stdout, /ERROR:/);
        writeFileSync(archive, 'not a ZIP file');
        const unreadable = spawnSync(process.execPath, ['scripts/check.mjs', archive], { cwd, encoding: 'utf8' });
        assert.equal(unreadable.status, 1);
        assert.match(unreadable.stderr, /Failed to read zip file/);
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});
