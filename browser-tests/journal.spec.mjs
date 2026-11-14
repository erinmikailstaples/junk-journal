import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const existingSite = JSON.parse(readFileSync(new URL('../scripts/fixtures/site-pages.json', import.meta.url), 'utf8'));
const tutorialPath = '/building-tutorial-tinder-from-idea-to-deployed-replit-demo/';
const playerStub = `<title>Video player</title><button>Play</button><script>
    window.addEventListener('message', event => {
        if (typeof event.data !== 'string' || !event.data.startsWith('{')) return;
        const { func } = JSON.parse(event.data);
        if (func) document.body.dataset.commands = (document.body.dataset.commands || '') + func + ',';
    });
</script>`;

function stubVideo(page) {
    return page.route(/^https:\/\/www\.youtube(?:-nocookie)?\.com\/embed\//, route =>
        route.fulfill({ contentType: 'text/html', body: playerStub })
    );
}

test('portrait retains original colors and draws doodles on hover and keyboard focus', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const portrait = page.locator('.portrait-print');
    const doodles = portrait.locator('.portrait-doodles');
    await expect(portrait.locator('img')).toHaveCSS('filter', 'none');
    await expect(doodles).toHaveCSS('opacity', '0');
    await portrait.hover();
    await expect(doodles).toHaveCSS('opacity', '1');
    await expect(doodles.locator('.doodle-mustache')).toHaveCSS('stroke-dashoffset', '0px');
    await expect(doodles.locator('.doodle-stars')).toHaveCSS('stroke-dashoffset', '0px');
    await page.mouse.move(0, 0);
    await expect(doodles).toHaveCSS('opacity', '0');
    await portrait.focus();
    await expect(doodles).toHaveCSS('opacity', '1');
    await page.keyboard.press('Enter');
    await expect(page.locator('#about-title')).toBeFocused();
    await expect(page.locator('.about-portrait')).toHaveCSS('filter', 'none');
});

test('reduced motion reveals static portrait doodles without animation', async ({ page }) => {
    await page.goto('/');
    const portrait = page.locator('.portrait-print');
    await portrait.focus();
    await expect(portrait.locator('.portrait-doodles')).toHaveCSS('opacity', '1');
    for (const path of await portrait.locator('.portrait-doodles path').all()) {
        await expect(path).toHaveCSS('animation-name', 'none');
        await expect(path).toHaveCSS('stroke-dashoffset', '0px');
    }
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations).toEqual([]);
});

test('Postcrossing postcard remains readable and clear of the footer at every breakpoint', async ({ page }) => {
    for (const width of [320, 390, 700, 768, 1024, 1100, 1440, 1920]) {
        await page.setViewportSize({ width, height: 1100 });
        await page.goto('/');
        await page.evaluate(() => document.fonts.ready);
        const postcard = page.getByRole('link', { name: /Postcrossing/ });
        await expect(postcard).toHaveAttribute('href', 'https://www.postcrossing.com/user/erinmikail');
        const box = await postcard.boundingBox();
        const footer = await page.locator('.cover-page .page-bottom').boundingBox();
        const portrait = await page.locator('.portrait-print').boundingBox();
        expect(box.y, `${width}px below portrait`).toBeGreaterThan(portrait.y + portrait.height);
        if (width <= 1100) {
            const gap = box.y - portrait.y - portrait.height;
            expect(gap, `${width}px portrait-to-postcard breathing room`).toBeGreaterThanOrEqual(20);
            expect(gap, `${width}px postcard stays grouped with portrait`).toBeLessThanOrEqual(96);
            if (width >= 700) {
                const name = await page.locator('.name-collage').boundingBox();
                const caption = await page.locator('.name-note').boundingBox();
                expect(caption.y - name.y - name.height, `${width}px caption stays with name`).toBeLessThanOrEqual(24);
            }
        }
        expect(box.y + box.height + 12, `${width}px footer clearance`).toBeLessThan(footer.y);
        expect(box.x, `${width}px left edge`).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, `${width}px right edge`).toBeLessThanOrEqual(width);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await postcard.focus();
        await expect(postcard).toHaveCSS('outline-style', 'solid');
        const popup = await postcard.locator('.postcrossing-stats').boundingBox();
        expect(popup.x, `${width}px popup left edge`).toBeGreaterThanOrEqual(0);
        expect(popup.x + popup.width, `${width}px popup right edge`).toBeLessThanOrEqual(width);
        expect(popup.y + popup.height + 12, `${width}px popup footer clearance`).toBeLessThan(footer.y);
        await page.locator('.mode-toggle').click();
        await expect(postcard).toBeVisible();
        await expect(postcard.locator('.postcrossing-artwork')).toBeHidden();
        await expect(postcard.locator('.postcrossing-stats')).toBeVisible();
        await expect(postcard.locator('time')).toBeVisible();
        await page.locator('.mode-toggle').click();
    }
});

test('Postcrossing stats reveal on hover and focus without layout shifts, and clicking opens the profile', async ({ page }) => {
    await page.goto('/');
    const postcard = page.getByRole('link', { name: 'Postcrossing', exact: true });
    const stats = postcard.locator('.postcrossing-stats');
    await expect(stats).toBeHidden();
    const idleHeight = await postcard.evaluate(element => element.offsetHeight);
    await postcard.hover();
    await expect(stats).toBeVisible();
    await expect(stats).toContainText('28 sent / 28 received');
    await expect(stats).toContainText('99,165 miles traveled by sent cards');
    await expect(stats).toHaveCSS('position', 'absolute');
    await expect(stats).toHaveCSS('border-top-width', '2px');
    expect(await postcard.evaluate(element => element.offsetHeight)).toBe(idleHeight);
    await stats.hover();
    await expect(stats).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(stats).toBeHidden();
    await page.mouse.move(0, 0);
    await postcard.hover();
    await expect(stats).toBeVisible();
    await page.mouse.move(0, 0);
    await expect(stats).toBeHidden();
    await postcard.focus();
    await expect(stats).toBeVisible();
    await expect(postcard).toHaveAccessibleDescription(/99,165 miles traveled by sent cards/);
    await page.keyboard.press('Escape');
    await expect(stats).toBeHidden();
    await expect(postcard).toBeFocused();
    await page.keyboard.press('Tab');
    await postcard.focus();
    await expect(stats).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations).toEqual([]);
    await page.route('https://www.postcrossing.com/user/erinmikail', route =>
        route.fulfill({ contentType: 'text/html', body: '<title>Postcrossing profile</title>' })
    );
    await postcard.click();
    await expect(page).toHaveURL('https://www.postcrossing.com/user/erinmikail');
});

test('Postcrossing stats stay visible on touch and a single tap opens the profile', async ({ browser }) => {
    for (const width of [390, 820]) {
        const context = await browser.newContext({
            baseURL: 'http://127.0.0.1:2468',
            viewport: { width, height: 1100 },
            isMobile: true,
            hasTouch: true
        });
        try {
            const page = await context.newPage();
            await page.goto('/');
            const postcard = page.getByRole('link', { name: 'Postcrossing', exact: true });
            const stats = postcard.locator('.postcrossing-stats');
            await expect(stats).toBeVisible();
            await expect(stats).toContainText('99,165 miles traveled by sent cards');
            await expect(stats).toHaveCSS('position', 'static');
            const box = await postcard.boundingBox();
            const footer = await page.locator('.cover-page .page-bottom').boundingBox();
            expect(box.y + box.height + 12, `${width}px touch footer clearance`).toBeLessThan(footer.y);
            await page.route('https://www.postcrossing.com/user/erinmikail', route =>
                route.fulfill({ contentType: 'text/html', body: '<title>Postcrossing profile</title>' })
            );
            await postcard.tap();
            await expect(page).toHaveURL('https://www.postcrossing.com/user/erinmikail');
        } finally {
            await context.close();
        }
    }
});

test('New York player and rain stop on hover exit and navigation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await stubVideo(page);
    await page.goto('/');
    const trigger = page.getByRole('button', { name: 'Brooklyn, NYC (play video)' });
    const panel = page.locator('#home .new-york-video-panel');
    const frame = panel.locator('iframe');
    for (let i = 0; i < 2; i++) {
        await trigger.hover();
        await expect(panel).toBeVisible();
        await expect(frame).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/0K39q4GEeVw/);
        await expect(page.locator('.new-york-rain')).toBeVisible();
        await expect(page.locator('.new-york-rain span')).toHaveCount(20);
        await page.mouse.move(0, 0);
        await expect(panel).toBeHidden();
        await expect(frame).not.toHaveAttribute('src', /./);
        await expect(page.locator('.new-york-rain')).toHaveCount(0);
    }
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(panel).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();
    await page.keyboard.press('Space');
    await page.locator('.index-tabs [data-section="about"]').click();
    await expect(panel).toBeHidden();
    await expect(page.locator('.new-york-rain')).toHaveCount(0);
});

test('New York player respects reduced motion and retains accessible controls', async ({ page }) => {
    await stubVideo(page);
    await page.goto('/');
    const trigger = page.getByRole('button', { name: 'Brooklyn, NYC (play video)' });
    await trigger.focus();
    await page.keyboard.press('Enter');
    const panel = page.locator('#home .new-york-video-panel');
    await expect(panel).toBeVisible();
    await expect(page.locator('.new-york-rain')).toBeHidden();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations).toEqual([]);
    await panel.getByRole('button', { name: 'Close video' }).click();
    await expect(panel).toBeHidden();
});

test('Reno hover starts at 1:47 and closes when the pointer moves away', async ({ page }) => {
    await stubVideo(page);
    await page.goto('/');
    const trigger = page.getByRole('button', { name: 'Reno, NV (play video)' });
    const panel = page.locator('#home .reno-video-panel');
    const frame = panel.locator('iframe');
    await trigger.hover();
    await expect(panel).toBeVisible();
    const source = new URL(await frame.getAttribute('src'));
    expect(source.pathname).toBe('/embed/F7F67QGlaaY');
    expect(source.searchParams.get('start')).toBe('107');
    expect(source.searchParams.get('autoplay')).toBe('1');
    expect(source.searchParams.get('mute')).toBe('0');
    const player = page.frameLocator('#home .reno-video-frame');
    await expect(player.getByRole('button', { name: 'Play' })).toBeVisible();
    const triggerBox = await trigger.boundingBox();
    await page.mouse.move(triggerBox.x - 20, triggerBox.y + triggerBox.height / 2);
    await expect(panel).toBeHidden();
    await expect(frame).not.toHaveAttribute('src', /./);

    await trigger.hover();
    const closeBox = await panel.getByRole('button', { name: 'Close video' }).boundingBox();
    await page.mouse.move(closeBox.x + closeBox.width / 2, closeBox.y + closeBox.height / 2, { steps: 20 });
    await expect(panel).toBeVisible();
    await trigger.hover();
    await trigger.click();
    await expect(player.locator('body')).toHaveAttribute('data-commands', /playVideo/);
    await expect(player.locator('body')).not.toHaveAttribute('data-commands', /unMute/);
    await panel.getByRole('button', { name: 'Play video' }).click();
    await expect(panel).toBeVisible();
    await page.mouse.move(triggerBox.x - 20, triggerBox.y + triggerBox.height / 2);
    await expect(panel).toBeHidden();
    await expect(frame).not.toHaveAttribute('src', /./);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
});

test('Reno video supports keyboard activation and stops when changing pages', async ({ page }) => {
    await stubVideo(page);
    await page.goto('/');
    const trigger = page.getByRole('button', { name: 'Reno, NV (play video)' });
    const panel = page.locator('#home .reno-video-panel');
    await trigger.focus();
    await expect(panel).toBeHidden();
    await page.keyboard.press('Enter');
    await expect(panel).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await trigger.hover();
    await page.mouse.move(0, 0);
    await expect(panel).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations).toEqual([]);
    await page.keyboard.press('Tab');
    await expect(panel.getByRole('button', { name: 'Play video' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(panel.getByRole('button', { name: 'Close video' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();
    await page.keyboard.press('Space');
    await page.locator('.index-tabs [data-section="about"]').click();
    await expect(panel).toBeHidden();
    await expect(panel.locator('iframe')).not.toHaveAttribute('src', /./);
    await expect(page.locator('#about-title')).toBeFocused();
});

test('Reno video fits a small phone in journal and plain modes', async ({ page }) => {
    await stubVideo(page);
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto('/');
    for (const mode of ['journal', 'plain']) {
        if (mode === 'plain') await page.locator('.mode-toggle').click();
        const trigger = page.locator('#home .reno-video-trigger');
        await trigger.click();
        const panel = page.locator('#home .reno-video-panel');
        await expect(panel).toBeVisible();
        const box = await panel.boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(320);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (mode === 'plain') {
            const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
            expect(results.violations).toEqual([]);
        }
        await panel.getByRole('button', { name: 'Close video' }).click();
    }
});

test('Reno video opens and closes with touch', async ({ browser }) => {
    const context = await browser.newContext({
        baseURL: 'http://127.0.0.1:2468',
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true
    });
    try {
        const page = await context.newPage();
        await stubVideo(page);
        await page.goto('/');
        await page.locator('#home .reno-video-trigger').tap();
        const panel = page.locator('#home .reno-video-panel');
        await expect(panel).toBeVisible();
        const player = page.frameLocator('#home .reno-video-frame');
        await expect(player.getByRole('button', { name: 'Play' })).toBeVisible();
        await panel.getByRole('button', { name: 'Play video' }).tap();
        await expect(player.locator('body')).toHaveAttribute('data-commands', /playVideo/);
        await panel.getByRole('button', { name: 'Close video' }).tap();
        await expect(panel).toBeHidden();
        await expect(panel.locator('iframe')).not.toHaveAttribute('src', /./);
    } finally {
        await context.close();
    }
});

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
    await expect(page.locator('.welcome-note h2')).toHaveCSS('font-size', '24px');
    const maxWidth = await page.locator('#about .section-content').evaluate(section => {
        const content = document.createElement('article');
        content.className = 'gh-content';
        section.append(content);
        return getComputedStyle(content).maxWidth;
    });
    expect(maxWidth).toMatch(/^\d+(?:\.\d+)?px$/);
    expect(parseFloat(maxWidth)).toBeLessThan(650);
});

test('plain hierarchy, reading measure, and focus order hold at every size', async ({ page }) => {
    for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/');
        if (await page.locator('html').getAttribute('data-mode') !== 'plain') {
            await page.locator('.mode-toggle').click();
        }
        const layout = await page.evaluate(() => {
            const nav = document.querySelector('.index-tabs');
            const main = document.querySelector('main');
            const name = document.querySelector('.name-text');
            const mission = document.querySelector('.welcome-note h2');
            const introduction = document.querySelector('.reno-introduction > p');
            return {
                navBeforeMain: Boolean(nav.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING),
                nameSize: parseFloat(getComputedStyle(name).fontSize),
                missionSize: parseFloat(getComputedStyle(mission).fontSize),
                introductionWidth: introduction.getBoundingClientRect().width,
                introductionMeasure: parseFloat(getComputedStyle(introduction).maxWidth),
                overflowing: document.documentElement.scrollWidth > innerWidth,
                headingCount: document.querySelectorAll('h1').length
            };
        });
        expect(layout.navBeforeMain).toBe(true);
        expect(layout.nameSize).toBeGreaterThan(layout.missionSize * 1.4);
        expect(layout.introductionWidth).toBeLessThanOrEqual(layout.introductionMeasure + 1);
        expect(layout.overflowing, `${width}px overflow`).toBe(false);
        expect(layout.headingCount).toBe(1);
        await expect(page.locator('[data-journal-page]:visible')).toHaveCount(5);

        await page.locator('.mode-toggle').focus();
        await page.keyboard.press('Tab');
        await expect(page.locator('.index-tabs a').first()).toBeFocused();
        await page.locator('.index-tabs a').last().focus();
        await page.keyboard.press('Tab');
        await expect(page.locator('.postcrossing-postcard')).toBeFocused();
        await expect(page.locator('.postcrossing-postcard')).toHaveCSS('outline-width', '3px');
        const ticket = page.locator('.hello-ticket');
        await ticket.focus();
        await expect(ticket).toHaveCSS('outline-style', 'solid');
        await expect(ticket).toHaveCSS('outline-width', '3px');
    }
    await page.locator('.index-tabs [data-section="writing"]').click();
    await expect(page.locator('#writing-title')).toBeFocused();
    await page.locator('.skip-link').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#site-main')).toBeFocused();
    await expect(page.locator('#site-main')).toHaveCSS('outline-width', '3px');
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

test('scraps, keyboard note, focus, history, and persisted plain mode work', async ({ page }) => {
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
    await page.goto(tutorialPath);
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'plain');
    await expect(page.locator('.gh-content')).toContainText('sample entry');
    await page.locator('.mode-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'journal');
});

test('lightbulb note opens on hover, stays hoverable, and can be dismissed', async ({ page }) => {
    await page.goto('/');
    const note = page.locator('.secret-note');
    const summary = note.locator('summary');
    const message = note.locator('p');
    await expect(note.locator('.lightbulb-doodle')).toBeVisible();
    await expect(summary).toHaveAccessibleName('Open note');
    await expect(summary.locator('.handwritten')).toHaveCount(0);
    await summary.hover();
    await expect(message).toBeVisible();

    const summaryBox = await summary.boundingBox();
    const messageBox = await message.boundingBox();
    expect(messageBox.y + messageBox.height).toBeGreaterThanOrEqual(summaryBox.y);
    const x = Math.min(summaryBox.x + summaryBox.width / 2, messageBox.x + messageBox.width - 5);
    await page.mouse.move(x, summaryBox.y + 2);
    await page.mouse.move(x, messageBox.y + messageBox.height / 2, { steps: 10 });
    await expect(message).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(note).not.toHaveAttribute('open', '');

    await page.mouse.move(0, 0);
    await summary.hover();
    await expect(message).toBeVisible();
    await page.mouse.move(0, 0);
    await expect(note).not.toHaveAttribute('open', '');
});

test('click pins the hovered note and plain mode keeps a native disclosure', async ({ page }) => {
    await page.goto('/');
    const note = page.locator('.secret-note');
    const summary = note.locator('summary');
    await summary.hover();
    await summary.click();
    await page.mouse.move(0, 0);
    await expect(note).toHaveAttribute('open', '');
    await summary.click();
    await expect(note).not.toHaveAttribute('open', '');

    await page.locator('.mode-toggle').click();
    await expect(note.locator('.lightbulb-doodle')).toBeHidden();
    const labelBox = await summary.getByText('Open note').boundingBox();
    expect(labelBox.width).toBeGreaterThan(1);
    expect(labelBox.height).toBeGreaterThan(1);
    await summary.hover();
    await expect(note).not.toHaveAttribute('open', '');
    await summary.click();
    await expect(note.locator('p')).toBeVisible();
});

test.describe('lightbulb note on touch', () => {
    test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

    test('opens and closes by tapping without overflowing the viewport', async ({ page }) => {
        await page.goto('/');
        const note = page.locator('.secret-note');
        const summary = note.locator('summary');
        await summary.tap();
        const message = note.locator('p');
        await expect(message).toBeVisible();
        const box = await message.boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(390);
        await summary.tap();
        await expect(note).not.toHaveAttribute('open', '');
    });
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
    await page.locator('.secret-note summary').click();
    await expect(page.locator('.secret-note p')).toBeVisible();
    await page.locator('.index-tabs [data-section="contact"]').click();
    await expect(page).toHaveURL(/#contact$/);
    await context.close();
});

test('article and archive templates render and are accessible', async ({ page }) => {
    for (const path of [tutorialPath, '/page/2/', '/about/', '/resume/', '/tag/all-posts/', '/author/erin/', '/not-a-page/']) {
        const response = await page.goto(path);
        expect(response.status()).toBe(path === '/not-a-page/' ? 404 : 200);
        await expect(page.locator('h1')).toBeVisible();
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(results.violations, `${path}: ${JSON.stringify(results.violations, null, 2)}`).toEqual([]);
    }
});

test('existing sitemap pages render as pages in journal and plain mode', async ({ page }) => {
    for (const mode of ['journal', 'plain']) {
        await page.goto('/');
        if (mode === 'plain') await page.locator('.mode-toggle').click();
        for (const fixture of existingSite.pages) {
            const response = await page.goto(`/${fixture.slug}/`);
            expect(response.status(), fixture.slug).toBe(200);
            await expect(page.locator('body')).toHaveClass('page-template');
            await expect(page.locator('.article h1')).toHaveText(fixture.slug === 'resume' ? 'Erin Mikail Staples' : fixture.title);
            expect(await page.evaluate(() => document.documentElement.dataset.mode ?? 'journal')).toBe(mode);
            if (fixture.slug === 'resume') await expect(page.locator('.gh-content')).toContainText('Selected speaking');
            else if (fixture.empty) await expect(page.locator('.gh-content')).toBeEmpty();
            else await expect(page.locator('.gh-content')).toContainText('sample page');
        }
    }
});

test('existing navigation and resume links stay on the current Ghost site', async ({ page }) => {
    await page.goto('/#about');
    const navigation = page.locator('#about .extra-links .nav');
    await expect(navigation.getByRole('link')).toHaveCount(existingSite.navigation.length);
    await navigation.getByRole('link', { name: 'All Posts', exact: true }).click();
    await expect(page).toHaveURL(/\/tag\/all-posts\/$/);
    await expect(page.locator('.archive h1')).toHaveText('all posts');
    await page.goto('/#about');
    await navigation.getByRole('link', { name: 'Now', exact: true }).click();
    await expect(page).toHaveURL(/\/now\/$/);
    await expect(page.locator('.article h1')).toHaveText('now');
    await page.goto('/');
    await page.locator('.resume-scrap').click();
    await expect(page).toHaveURL('http://127.0.0.1:2468/resume/');
    await expect(page.locator('.article h1')).toHaveText('Erin Mikail Staples');
    await page.goto('/#about');
    await expect(page.locator('#about a', { hasText: 'formal version' })).toHaveAttribute('href', 'http://127.0.0.1:2468/resume/');
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
