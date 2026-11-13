import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Handlebars from 'handlebars';
import { JSDOM } from 'jsdom';

const hbs = Handlebars.create();
for (const name of ['resume-page', 'resume-content']) {
    hbs.registerPartial(name, await readFile(new URL(`../partials/${name}.hbs`, import.meta.url), 'utf8'));
}
hbs.registerHelper('post', function (options) { return options.fn(this); });
hbs.registerHelper('post_class', () => 'post');
hbs.registerHelper('content', function () { return new Handlebars.SafeString(this.html); });
hbs.registerHelper('match', function (value, operator, expected, options) {
    assert.equal(operator, '!=');
    return value !== expected ? options.fn(this) : options.inverse(this);
});
hbs.registerHelper('img_url', url => url);

for (const templateName of ['page-resume', 'custom-resume']) {
    const source = await readFile(new URL(`../${templateName}.hbs`, import.meta.url), 'utf8');
    const template = hbs.compile(source.replace(/\{\{!< default\}\}/g, ''));
    const data = { site: { url: 'https://example.test' }, page: { show_title_and_feature_image: true } };

    test(`${templateName} renders the résumé draft when the Ghost page body is empty`, () => {
        const document = new JSDOM(template({ title: 'Resume', html: null }, { data })).window.document;
        assert.equal(document.querySelectorAll('h1').length, 1);
        assert.equal(document.querySelector('h1').textContent, 'Erin Mikail Staples');
        assert.match(document.querySelector('.gh-content').textContent, /Tiger Data/);
        assert.match(document.querySelector('.gh-content').textContent, /Selected speaking/);
    });

    test(`${templateName} renders Ghost editor content instead of the fallback`, () => {
        const document = new JSDOM(template({ title: 'Resume', html: '<p>Updated editor résumé</p>' }, { data })).window.document;
        assert.equal(document.querySelector('h1').textContent, 'Resume');
        assert.match(document.querySelector('.gh-content').textContent, /Updated editor résumé/);
        assert.doesNotMatch(document.querySelector('.gh-content').textContent, /Tiger Data/);
    });
}
