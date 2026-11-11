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
