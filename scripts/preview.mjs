import http from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';

const root = fileURLToPath(new URL('../', import.meta.url));
const hbs = Handlebars.create();
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const safe = value => new Handlebars.SafeString(value);
const sample = {
    title: 'Building Tutorial Tinder: from idea to deployed Replit demo',
    slug: 'a-place-for-things',
    url: '/a-place-for-things/',
    html: '<p>This is a sample entry for the local theme preview. The title is from Erin’s existing site; this placeholder is not the original article.</p><p><a href="https://www.erinmikailstaples.com/building-tutorial-tinder-from-idea-to-deployed-replit-demo/">Read the original Tutorial Tinder article ↗</a></p><h2>Start with curiosity.</h2><p>This page demonstrates the reading layout. A live Ghost installation supplies the real article content.</p><blockquote>Leave room in the margins.</blockquote>',
    excerpt: 'From idea to deployed Replit demo. A tutorial from the existing notebook.',
    primary_tag: { name: 'Replit / How to' },
    date: '13 NOV 2025',
    access: true
};
const project = {
    ...sample,
    title: 'What building a Reactigotchi can teach you about an applications “memory”',
    url: '/an-experiment/',
    html: '<p>This is a sample entry for the local theme preview, using a real title from Erin’s existing site.</p><p><a href="https://www.erinmikailstaples.com/what-building-a-reactigotchi-can-teach-you-about-an-applications-memory/">Read the original Reactigotchi tutorial ↗</a></p>',
    excerpt: 'React, state, and developer education — by way of a digital pet.',
    primary_tag: { name: 'React / How to' },
    date: '05 NOV 2025'
};
const samples = [sample, project];

hbs.registerHelper('asset', path => `/assets/${path}`);
hbs.registerHelper('meta_title', () => 'Erin Mikail Staples — the notebook');
hbs.registerHelper('body_class', () => 'home-template');
hbs.registerHelper('post_class', () => 'post');
hbs.registerHelper('ghost_head', () => '');
hbs.registerHelper('ghost_foot', () => '');
hbs.registerHelper('date', function (value, options) {
    const format = (options || value)?.hash?.format;
    return format === 'YYYY' ? String(new Date().getFullYear()) : this.date || '11 NOV 2026';
});
hbs.registerHelper('foreach', function (items, options) {
    if (!items?.length) return options.inverse(this);
    return items.map((item, index) => options.fn(item, { data: { ...options.data, index, first: index === 0, last: index === items.length - 1 } })).join('');
});
hbs.registerHelper('get', function (resource, options) {
    let result = {};
    if (resource === 'pages') result = { pages: [] };
    if (resource === 'posts') result = { posts: [sample, project] };
    return options.fn(result);
});
hbs.registerHelper('post', function (options) { return options.fn(this.previewPost || sample); });
hbs.registerHelper('match', function (value, operator, expected, options) {
    if (operator !== '!=') throw new Error(`Unsupported preview match operator: ${operator}`);
    return value !== expected ? options.fn(this) : options.inverse(this);
});
hbs.registerHelper('tag', options => options.fn({ name: 'Field notes', description: 'Ideas worth keeping.' }));
hbs.registerHelper('author', options => options.fn({ name: 'Erin Mikail Staples' }));
hbs.registerHelper('url', function () { return this.url; });
hbs.registerHelper('content', function () { return safe(this.html || ''); });
hbs.registerHelper('excerpt', function () { return this.excerpt; });
hbs.registerHelper('reading_time', () => '2 min read');
hbs.registerHelper('authors', () => 'Erin Mikail Staples');
hbs.registerHelper('tags', () => 'Field notes');
hbs.registerHelper('img_url', url => url);
hbs.registerHelper('pagination', () => safe('<nav class="pagination" aria-label="Pagination"><span>Page 1 of 1</span></nav>'));
hbs.registerHelper('navigation', () => '');
hbs.registerHelper('comments', () => '');
for (const file of await readdir(resolve(root, 'partials'))) {
    if (file.endsWith('.hbs')) hbs.registerPartial(file.slice(0, -4), await readFile(resolve(root, 'partials', file), 'utf8'));
}
const data = {
    site: { title: 'Erin Mikail Staples', url: `http://127.0.0.1:${process.env.PORT || 2368}`, locale: 'en', navigation: false },
    page: { show_title_and_feature_image: true },
    custom: { introduction: pkg.config.custom.introduction.default, contact_email: pkg.config.custom.contact_email.default }
};
const mime = { '.css': 'text/css', '.js': 'application/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer(async (req, res) => {
    try {
        const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        if (path.startsWith('/assets/')) {
            const file = resolve(root, `.${path}`);
            if (!file.startsWith(`${resolve(root, 'assets')}${sep}`)) {
                res.writeHead(403).end('Forbidden');
                return;
            }
            const content = await readFile(file);
            res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' }).end(content);
            return;
        }
        let template = 'error';
        if (path === '/') template = 'home';
        else if (path.startsWith('/page/')) template = 'index';
        else if (path.startsWith('/tag/')) template = 'tag';
        else if (path.startsWith('/author/')) template = 'author';
        else if (['/about/', '/contact/'].includes(path)) template = 'page';
        else if (samples.some(post => post.url === path)) template = 'post';
        const templateText = (await readFile(resolve(root, `${template}.hbs`), 'utf8')).replace(/\{\{!< default\}\}/g, '');
        const context = {
            posts: samples,
            previewPost: samples.find(post => post.url === path),
            statusCode: 404,
            message: 'We could not find that page.'
        };
        const body = hbs.compile(templateText)(context, { data });
        const layout = await readFile(resolve(root, 'default.hbs'), 'utf8');
        res.writeHead(template === 'error' ? 404 : 200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(hbs.compile(layout)({ ...context, body }, { data }));
    } catch (error) {
        if (error.code === 'ENOENT') res.writeHead(404).end('Not found');
        else {
            console.error(error);
            res.writeHead(500).end('Preview rendering failed. See terminal output.');
        }
    }
});
server.listen(Number(process.env.PORT || 2368), '127.0.0.1', () => {
    console.log(`Journal preview: http://127.0.0.1:${server.address().port}`);
    console.log('Local fixtures only. Use Ghost for publishing, members, and editor cards.');
});
