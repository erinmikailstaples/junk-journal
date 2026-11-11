import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('every journal page and plain mode pass automated WCAG AA checks', async ({ page }) => {
    await page.goto('/');
    for (const section of ['home', 'about', 'writing', 'projects', 'contact']) {
        await page.locator(`.index-tabs [data-section="${section}"]`).click();
        await expect(page.locator(`#${section}`)).toBeVisible();
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
        expect(results.violations, `${section}: ${JSON.stringify(results.violations, null, 2)}`).toEqual([]);
    }
    await page.locator('.mode-toggle').click();
    await expect(page.locator('[data-journal-page]:visible')).toHaveCount(5);
    const plain = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(plain.violations).toEqual([]);
});

test('journal fits small phones, tablets, and desktop without horizontal scrolling', async ({ page }) => {
    for (const width of [320, 390, 768, 1024, 1440, 1920]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto('/');
        for (const section of ['home', 'about', 'writing', 'projects', 'contact']) {
            await page.locator(`.index-tabs [data-section="${section}"]`).click();
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px / ${section}`).toBe(true);
        }
    }
});

test('condensed journal pages keep their scraps composed at each breakpoint', async ({ page }) => {
    for (const width of [700, 768, 1024, 1100]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/');
        await page.evaluate(() => document.fonts.ready);
        const name = await page.locator('.last-name').boundingBox();
        const portrait = await page.locator('.portrait-print').boundingBox();
        expect(portrait.x, `${width}px portrait`).toBeGreaterThan(name.x + name.width);
        expect(portrait.y, `${width}px portrait`).toBeLessThan(name.y + name.height);

        const welcome = await page.locator('.welcome-note').boundingBox();
        const note = await page.locator('.pink-note').boundingBox();
        expect(note.x, `${width}px note`).toBeGreaterThan(welcome.x + welcome.width);
        expect(note.y, `${width}px note`).toBeLessThan(welcome.y + welcome.height);
        const star = await page.locator('.foil-note').boundingBox();
        expect(Math.abs(star.y + star.height / 2 - (note.y + note.height)), `${width}px foil star`).toBeLessThan(35);
        expect(await page.locator('.welcome-note h2 em').evaluate(element => element.getClientRects().length), `${width}px headline`).toBe(1);

        for (const section of ['about', 'writing', 'projects', 'contact']) {
            await page.locator(`.index-tabs [data-section="${section}"]`).click();
            await expect(page.locator(`#${section}-title`)).toBeVisible();
            const title = await page.locator(`#${section}-title`).boundingBox();
            const artwork = await page.locator(`#${section} .section-cover img`).boundingBox();
            expect(artwork.x, `${width}px ${section} artwork`).toBeGreaterThan(title.x + title.width);
            expect(artwork.y, `${width}px ${section} artwork`).toBeLessThan(title.y + title.height);
        }
    }

    for (const width of [320, 390, 600, 699]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/');
        const name = await page.locator('.last-name').boundingBox();
        const portrait = await page.locator('.portrait-print').boundingBox();
        expect(portrait.y, `${width}px portrait`).toBeGreaterThan(name.y + name.height);
    }
});

test('small phones keep the welcome patches in one row', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const patches = await page.locator('.welcome-badges .camp-patch').all();
    const boxes = await Promise.all(patches.map(patch => patch.boundingBox()));
    expect(Math.max(...boxes.map(box => box.y)) - Math.min(...boxes.map(box => box.y))).toBeLessThan(20);
    for (const box of boxes) expect(box.width).toBeGreaterThanOrEqual(44);
    const logo = await page.locator('.wordmark').boundingBox();
    const star = await page.locator('.wordmark > span[aria-hidden]').boundingBox();
    expect(star.y).toBeLessThan(logo.y + logo.height / 2);
    for (const selector of ['.tiny-heading', '.resume-scrap']) {
        const lines = await page.locator(selector).evaluate(element => {
            const range = document.createRange();
            range.selectNodeContents(element);
            return range.getClientRects().length;
        });
        expect(lines, selector).toBe(1);
    }
});

test('condensed plain mode stays a single readable document', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto('/');
    await page.locator('.mode-toggle').click();
    await expect(page.locator('.cover-page')).toHaveCSS('display', 'block');
    await expect(page.locator('.welcome-page')).toHaveCSS('display', 'block');
    await expect(page.locator('.section-cover').first()).toHaveCSS('display', 'block');
    await expect(page.locator('.welcome-note h2')).toHaveCSS('font-size', '30px');
    const maxWidth = await page.locator('#about .section-content').evaluate(section => {
        const content = document.createElement('article');
        content.className = 'gh-content';
        section.append(content);
        return getComputedStyle(content).maxWidth;
    });
    expect(maxWidth).toBe('none');
});

test('tablet article titles do not leave their arrows on a line alone', async ({ page }) => {
    for (const width of [700, 768, 1024]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/#projects');
        await page.evaluate(() => document.fonts.ready);
        const distance = await page.locator('#projects .entry-card h3').first().evaluate(title => {
            const text = title.firstChild;
            const lastWord = text.textContent.match(/\S+\s*$/u);
            const range = document.createRange();
            range.setStart(text, lastWord.index);
            range.setEnd(text, text.textContent.length);
            return Math.abs(range.getBoundingClientRect().top - title.querySelector('span').getBoundingClientRect().top);
        });
        expect(distance, `${width}px`).toBeLessThan(8);
    }
});

test('sticky tabs leave the selected section visible', async ({ page }) => {
    for (const width of [390, 1024]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/');
        await page.locator('.index-tabs [data-section="about"]').click();
        await expect(page.locator('#about-title')).toBeFocused();
        const tabs = await page.locator('.index-tabs').boundingBox();
        const eyebrow = await page.locator('#about .page-eyebrow').boundingBox();
        expect(eyebrow.y, `${width}px section heading`).toBeGreaterThanOrEqual(tabs.y + tabs.height - 1);
    }
});

test('journal headings use the bundled font while plain headings remain plain', async ({ page }) => {
    await page.goto('/');
    const loadedFonts = await page.evaluate(async () =>
        (await document.fonts.load('800 32px "Bricolage Grotesque"', 'AĄỡ')).map(font => font.status)
    );
    expect(loadedFonts).toEqual(['loaded', 'loaded', 'loaded']);
    await expect(page.locator('.welcome-note h2')).toHaveCSS('font-family', /Bricolage Grotesque/);
    await page.evaluate(() => document.documentElement.style.setProperty('--gh-font-heading', 'Georgia, serif'));
    await expect(page.locator('.welcome-note h2')).toHaveCSS('font-family', 'Georgia, serif');
    await page.evaluate(() => document.documentElement.style.removeProperty('--gh-font-heading'));
    await page.locator('.mode-toggle').click();
    await expect(page.locator('.welcome-note h2')).toHaveCSS('font-family', 'Arial, sans-serif');
});

test('decorations do not overlap note or ticket text', async ({ page }) => {
    for (const width of [320, 390, 550, 768, 1024, 1101, 1200, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto('/');
        await page.evaluate(() => document.fonts.ready);
        const overlaps = await page.locator('.pink-note').evaluate(note => {
            const title = note.querySelector('.note-title');
            const decoration = note.querySelector('.note-doodle').getBoundingClientRect();
            return [...title.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).some(node => {
                const range = document.createRange();
                range.selectNodeContents(node);
                return [...range.getClientRects()].some(rect =>
                    rect.left < decoration.right && rect.right > decoration.left &&
                    rect.top < decoration.bottom && rect.bottom > decoration.top
                );
            });
        });
        expect(overlaps, `${width}px`).toBe(false);
        const foilOverlaps = await page.evaluate(() => {
            const decorations = [...document.querySelectorAll('.foil-note, .foil-ticket')]
                .map(element => element.getBoundingClientRect());
            const labels = document.querySelectorAll('.pink-note .note-label, .pink-note .note-title, .pink-note .note-link, .hello-ticket > span, .hello-ticket > strong');
            return [...labels].some(label => {
                const range = document.createRange();
                range.selectNodeContents(label);
                return [...range.getClientRects()].some(rect => decorations.some(decoration =>
                    rect.left < decoration.right && rect.right > decoration.left &&
                    rect.top < decoration.bottom && rect.bottom > decoration.top
                ));
            });
        });
        expect(foilOverlaps, `${width}px foil`).toBe(false);
    }
});

test('scraps, keyboard envelope, focus, history, and persisted plain mode work', async ({ page }) => {
    await page.goto('/');
    await page.locator('.portrait-print').click();
    await expect(page).toHaveURL(/#about$/);
    await expect(page.locator('#about-title')).toBeFocused();
    await page.goBack();
    await expect(page.locator('#home')).toBeVisible();
    await page.locator('.secret-note summary').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.secret-note')).toHaveAttribute('open', '');
    await expect(page.locator('.secret-note p')).toBeVisible();
    await page.locator('.mode-toggle').click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'plain');
    await page.goto('/a-place-for-things/');
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'plain');
    await expect(page.locator('.gh-content')).toContainText('sample entry');
    await page.locator('.mode-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'journal');
});

test('fabric index tabs work without patch artwork and plain mode hides decoration', async ({ page }) => {
    await page.route('**/assets/images/patch-*.png', route => route.abort());
    await page.goto('/');
    const navigation = page.getByRole('navigation', { name: 'Journal navigation' });
    for (const [section, label] of [['home', 'the journal'], ['about', 'about me'], ['writing', 'words & ideas'], ['projects', 'things I make'], ['contact', 'say hello']]) {
        const link = navigation.getByRole('link', { name: label, exact: true });
        await expect(link).toBeVisible();
        await link.focus();
        await page.keyboard.press('Enter');
        await expect(page.locator(`#${section}`)).toBeVisible();
        await expect(link).toHaveAttribute('aria-current', 'location');
    }
    await page.locator('.mode-toggle').click();
    await expect(navigation.locator('a')).toHaveCount(5);
    await expect(navigation.locator('.tab-number:visible')).toHaveCount(0);
    await expect(page.locator('.section-patch:visible')).toHaveCount(0);
    await expect(navigation.getByRole('link', { name: 'words & ideas', exact: true })).toBeVisible();
});

test('desktop index tabs have a visible backing attached to the journal edge', async ({ page }) => {
    for (const width of [1101, 1440, 1920]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto('/');
        const tabs = await page.locator('.index-tab').evaluateAll(elements => {
            const edge = document.querySelector('.journal').getBoundingClientRect().right;
            return elements.map(element => {
                const bounds = element.getBoundingClientRect();
                return {
                    left: bounds.left,
                    right: bounds.right,
                    height: bounds.height,
                    edge,
                    background: getComputedStyle(element).backgroundColor
                };
            });
        });
        for (const tab of tabs) {
            expect(tab.left).toBeLessThanOrEqual(tab.edge);
            expect(tab.right).toBeGreaterThan(tab.edge);
            expect(tab.right).toBeLessThanOrEqual(width);
            expect(tab.height).toBeGreaterThanOrEqual(44);
            expect(tab.background).not.toBe('rgba(0, 0, 0, 0)');
        }
    }
});

test('welcome patches navigate to their matching journal sections', async ({ page }) => {
    await page.goto('/');
    for (const section of ['writing', 'projects', 'contact']) {
        await page.locator(`.welcome-badges a[href="#${section}"]`).click();
        await expect(page.locator(`#${section}-title`)).toBeFocused();
        await page.locator('.index-tabs [data-section="home"]').click();
    }
    await page.locator('.mode-toggle').click();
    await expect(page.locator('.welcome-badges')).toBeHidden();
});

test('all sections remain readable without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:2468/');
    await expect(page.locator('[data-journal-page]:visible')).toHaveCount(5);
    await expect(page.locator('.mode-toggle')).toBeHidden();
    await page.locator('.index-tabs [data-section="contact"]').click();
    await expect(page).toHaveURL(/#contact$/);
    await context.close();
});

test('article and archive templates render and are accessible', async ({ page }) => {
    for (const path of ['/a-place-for-things/', '/page/2/', '/about/', '/tag/notes/', '/author/erin/', '/not-a-page/']) {
        const response = await page.goto(path);
        expect(response.status()).toBe(path === '/not-a-page/' ? 404 : 200);
        await expect(page.locator('h1')).toBeVisible();
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(results.violations, `${path}: ${JSON.stringify(results.violations, null, 2)}`).toEqual([]);
    }
});

test('capture journal and plain-mode previews', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.screenshot({ path: testInfo.outputPath('journal-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: testInfo.outputPath('journal-mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.locator('.mode-toggle').click();
    await page.screenshot({ path: testInfo.outputPath('plain-desktop.png'), fullPage: true });
});

test('visitors can stick, move, keep, and peel metallic stickers with a keyboard', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Sticker sheet', exact: true });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('button', { name: 'Add gold star' })).toBeFocused();
    const sheetScan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(sheetScan.violations).toEqual([]);

    await page.keyboard.press('Enter');
    const sticker = page.getByRole('button', { name: 'Gold star sticker' });
    await expect(sticker).toBeFocused();
    const before = await sticker.evaluate(el => parseFloat(el.style.left));
    await page.keyboard.press('Shift+ArrowRight');
    expect(await sticker.evaluate(el => parseFloat(el.style.left))).toBeGreaterThan(before);

    await page.reload();
    await expect(page.getByRole('button', { name: 'Gold star sticker' })).toBeVisible();
    await page.locator('.index-tabs [data-section="about"]').click();
    await expect(page.locator('.placed-sticker')).toHaveCount(0);
    await page.locator('.index-tabs [data-section="home"]').click();
    await page.getByRole('button', { name: 'Gold star sticker' }).focus();
    await page.keyboard.press('Delete');
    await expect(page.locator('.placed-sticker')).toHaveCount(0);

    await page.getByRole('button', { name: 'Sticker sheet', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(page.locator('#sticker-sheet')).toBeHidden();
    await expect(toggle).toBeFocused();
    await page.locator('.mode-toggle').click();
    await expect(toggle).toBeHidden();
    await expect(page.locator('.foil-sticker').first()).toBeHidden();
});

test('stickers can be dragged straight off the sheet onto the journal', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sticker sheet', exact: true }).click();
    const choice = await page.getByRole('button', { name: 'Add silver moon' }).boundingBox();
    const journal = await page.locator('.journal').boundingBox();
    const drop = { x: journal.x + 200, y: journal.y + 300 };
    await page.mouse.move(choice.x + choice.width / 2, choice.y + choice.height / 2);
    await page.mouse.down();
    await page.mouse.move(drop.x, drop.y, { steps: 8 });
    await expect(page.locator('.sticker-ghost')).toBeVisible();
    await page.mouse.up();
    const sticker = page.getByRole('button', { name: 'Silver moon sticker' });
    await expect(sticker).toHaveCount(1);
    await expect(page.locator('.sticker-ghost')).toHaveCount(0);
    const box = await sticker.boundingBox();
    expect(Math.abs(box.x + box.width / 2 - drop.x)).toBeLessThan(6);
    expect(Math.abs(box.y + box.height / 2 - drop.y)).toBeLessThan(6);
});
