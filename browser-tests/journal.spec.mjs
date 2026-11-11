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
