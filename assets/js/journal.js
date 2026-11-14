(() => {
    const root = document.documentElement;
    const toggle = document.querySelector('.mode-toggle');
    const status = document.querySelector('.mode-status');
    const pages = Array.from(document.querySelectorAll('[data-journal-page]'));
    const tabs = Array.from(document.querySelectorAll('[data-section]'));
    const videos = [];

    function setupVideos(config) {
        const videoUrl = new URL(`https://${config.host || 'www.youtube.com'}/embed/${config.id}`);
        if (config.start) videoUrl.searchParams.set('start', config.start);
        videoUrl.searchParams.set('autoplay', '1');
        videoUrl.searchParams.set('mute', '0');
        videoUrl.searchParams.set('playsinline', '1');
        videoUrl.searchParams.set('enablejsapi', '1');
        videoUrl.searchParams.set('origin', location.origin);

        document.querySelectorAll('[data-reno-introduction]').forEach((introduction, index) => {
            const paragraph = introduction.querySelector('p');
            const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
            let textNode;
            let match;
            while ((textNode = walker.nextNode())) {
                match = config.pattern.exec(textNode.data);
                if (match) break;
            }
            if (!match) return;
            const text = textNode.data;

            const trigger = document.createElement('button');
            trigger.type = 'button';
            trigger.className = `${config.name}-video-trigger`;
            trigger.textContent = match[0];
            trigger.setAttribute('aria-label', `${match[0]} (play video)`);
            trigger.setAttribute('aria-expanded', 'false');

            const panel = document.createElement('div');
            panel.className = `${config.name}-video-panel`;
            panel.id = `${config.name}-video-${index + 1}`;
            panel.hidden = true;
            trigger.setAttribute('aria-controls', panel.id);

            const head = document.createElement('div');
            head.className = 'reno-video-head';
            const title = document.createElement('strong');
            title.textContent = config.title;
            const actions = document.createElement('div');
            actions.className = 'reno-video-actions';
            const playButton = document.createElement('button');
            playButton.type = 'button';
            playButton.className = 'reno-video-play';
            playButton.textContent = 'Play';
            playButton.setAttribute('aria-label', 'Play video');
            const closeButton = document.createElement('button');
            closeButton.type = 'button';
            closeButton.className = 'reno-video-close';
            closeButton.textContent = 'Close';
            closeButton.setAttribute('aria-label', 'Close video');
            actions.append(playButton, closeButton);
            head.append(title, actions);

            const frame = document.createElement('iframe');
            frame.className = `${config.name}-video-frame`;
            frame.title = config.videoTitle;
            frame.allow = 'autoplay; encrypted-media; picture-in-picture; web-share';
            frame.referrerPolicy = 'strict-origin-when-cross-origin';
            frame.setAttribute('allowfullscreen', '');

            const help = document.createElement('p');
            help.className = 'reno-video-help';
            help.append("If the video doesn't start, press Play or ");
            const link = document.createElement('a');
            link.href = config.link;
            link.textContent = config.linkText;
            help.append(link, '.');
            panel.append(head, frame, help);
            textNode.replaceWith(text.slice(0, match.index), trigger, text.slice(match.index + match[0].length));
            introduction.append(panel);

            let pinned = false;
            let dismissOnPointerLeave = false;
            let suppressHover = false;
            let rain = null;

            function requestPlayback() {
                frame.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), videoUrl.origin);
            }

            function close({ dismiss = false, restoreFocus = false } = {}) {
                if (panel.hidden) return;
                const returnFocus = restoreFocus && panel.contains(document.activeElement) && !introduction.closest('[hidden]');
                panel.hidden = true;
                frame.removeAttribute('src');
                rain?.remove();
                rain = null;
                trigger.setAttribute('aria-expanded', 'false');
                pinned = false;
                dismissOnPointerLeave = false;
                if (dismiss) suppressHover = introduction.matches(':hover');
                if (returnFocus) trigger.focus({ preventScroll: true });
            }

            function open({ persist = false, pointer = false } = {}) {
                if (panel.hidden) {
                    videos.forEach(video => video.close({ restoreFocus: true }));
                    panel.hidden = false;
                    trigger.setAttribute('aria-expanded', 'true');
                    frame.src = videoUrl.href;
                    if (config.rain) {
                        rain = document.createElement('div');
                        rain.className = 'new-york-rain';
                        rain.setAttribute('aria-hidden', 'true');
                        const emojis = ['🥯', '🚕', '🍎', '🗽'];
                        for (let i = 0; i < 20; i++) {
                            const emoji = document.createElement('span');
                            emoji.textContent = emojis[i % emojis.length];
                            emoji.style.left = `${i * 5 + 2}%`;
                            emoji.style.animationDelay = `${-(i % 5) * 0.8}s`;
                            rain.append(emoji);
                        }
                        document.body.append(rain);
                    }
                    dismissOnPointerLeave = pointer;
                }
                if (persist) {
                    pinned = true;
                    dismissOnPointerLeave = pointer;
                    requestPlayback();
                }
            }

            function pointerIsInVideoArea(event) {
                const triggerBounds = trigger.getBoundingClientRect();
                const panelBounds = panel.getBoundingClientRect();
                const { clientX: x, clientY: y } = event;
                const within = bounds => x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
                if (within(triggerBounds) || within(panelBounds)) return true;
                if (y < triggerBounds.bottom || y > panelBounds.top || panelBounds.top <= triggerBounds.bottom) return false;

                // Keep a forgiving path between the inline trigger and the player below the paragraph.
                const progress = (y - triggerBounds.bottom) / (panelBounds.top - triggerBounds.bottom);
                const left = triggerBounds.left + (panelBounds.left - triggerBounds.left) * progress;
                const right = triggerBounds.right + (panelBounds.right - triggerBounds.right) * progress;
                return x >= left - 8 && x <= right + 8;
            }

            trigger.addEventListener('pointerenter', event => {
                if ((event.pointerType === 'mouse' || event.pointerType === 'pen') && !suppressHover) open({ pointer: true });
            });
            trigger.addEventListener('click', event => {
                if (!panel.hidden && pinned) close({ dismiss: true });
                else open({ persist: true, pointer: event.detail > 0 });
            });
            introduction.addEventListener('pointermove', event => {
                if (panel.hidden || !dismissOnPointerLeave || (event.pointerType !== 'mouse' && event.pointerType !== 'pen')) return;
                if (!pointerIsInVideoArea(event)) close({ restoreFocus: true });
            });
            introduction.addEventListener('pointerleave', event => {
                if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
                suppressHover = false;
                if (dismissOnPointerLeave) close({ restoreFocus: true });
            });
            introduction.addEventListener('focusout', event => {
                if (!pinned && !introduction.contains(event.relatedTarget) && !introduction.matches(':hover')) close();
            });
            playButton.addEventListener('click', event => {
                pinned = true;
                dismissOnPointerLeave = event.detail > 0;
                requestPlayback();
            });
            closeButton.addEventListener('click', () => close({ dismiss: true, restoreFocus: true }));
            frame.addEventListener('load', () => {
                if (pinned && !panel.hidden) requestPlayback();
            });
            document.addEventListener('keydown', event => {
                if (event.key === 'Tab' && !panel.hidden) dismissOnPointerLeave = false;
                if (event.key !== 'Escape' || panel.hidden) return;
                if (!pinned && !introduction.contains(document.activeElement) && !introduction.matches(':hover')) return;
                event.preventDefault();
                close({ dismiss: true, restoreFocus: true });
            });
            videos.push({ introduction, close });
        });
    }

    const postcard = document.querySelector('.postcrossing-postcard');
    if (postcard) {
        postcard.addEventListener('pointerleave', () => {
            if (!postcard.matches(':focus-visible')) postcard.classList.remove('postcrossing-dismissed');
        });
        postcard.addEventListener('focusout', () => {
            if (!postcard.matches(':hover')) postcard.classList.remove('postcrossing-dismissed');
        });
        postcard.addEventListener('pointerenter', () => {
            if (!postcard.matches(':focus-visible')) postcard.classList.remove('postcrossing-dismissed');
        });
        postcard.addEventListener('focus', () => {
            postcard.classList.remove('postcrossing-dismissed');
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && postcard.matches(':hover, :focus-visible')) {
                postcard.classList.add('postcrossing-dismissed');
            }
        });
    }

    const note = document.querySelector('.secret-note');

    if (note) {
        let openedByHover = false;
        note.addEventListener('pointerenter', event => {
            if (event.pointerType === 'mouse' && root.dataset.mode !== 'plain' && !note.open) {
                note.open = true;
                openedByHover = true;
            }
        });
        note.addEventListener('pointerleave', event => {
            if (event.pointerType === 'mouse' && openedByHover) {
                note.open = false;
                openedByHover = false;
            }
        });
        note.querySelector('summary').addEventListener('click', event => {
            if (openedByHover) {
                event.preventDefault();
                openedByHover = false;
            }
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && note.open && (openedByHover || note.contains(document.activeElement))) {
                note.open = false;
                openedByHover = false;
            }
        });
    }

    function showPage({ focus = false } = {}) {
        const id = location.hash.slice(1) || 'home';
        const target = pages.find(page => page.id === id);
        const plain = root.dataset.mode === 'plain';
        // Preserve native fragment links into Ghost content, including heading anchors.
        const containingPage = document.getElementById(id)?.closest('[data-journal-page]');
        const active = target || containingPage || pages[0];
        pages.forEach(page => { page.hidden = !plain && page !== active; });
        videos.forEach(video => {
            if (video.introduction.closest('[hidden]')) video.close();
        });
        tabs.forEach(tab => {
            if (active && tab.dataset.section === active.id && !plain) {
                tab.setAttribute('aria-current', 'location');
            } else {
                tab.removeAttribute('aria-current');
            }
        });
        if (focus && target) {
            const heading = target.querySelector('h1, h2');
            heading.setAttribute('tabindex', '-1');
            heading.focus({ preventScroll: true });
            target.scrollIntoView({ block: 'start' });
        } else if (containingPage && !target) {
            document.getElementById(id).scrollIntoView();
        }
    }

    function updateMode() {
        const plain = root.dataset.mode === 'plain';
        toggle.setAttribute('aria-pressed', String(plain));
        toggle.querySelector('[data-mode-label]').textContent = plain
            ? 'Fine. Bring back the glue sticks.'
            : 'Just the website, please.';
        showPage();
    }

    toggle.hidden = false;
    toggle.addEventListener('click', () => {
        const plain = root.dataset.mode !== 'plain';
        root.dataset.mode = plain ? 'plain' : 'journal';
        try {
            localStorage.setItem('ems-site-mode', plain ? 'plain' : 'journal');
        } catch {
            status.textContent = 'Your browser cannot save this preference. The mode still works for this page.';
            updateMode();
            return;
        }
        updateMode();
        status.textContent = plain ? 'Plain mode. Same content, less confetti.' : 'Journal mode. Glue sticks restored.';
    });

    window.addEventListener('hashchange', () => showPage({ focus: true }));
    document.addEventListener('click', event => {
        const link = event.target.closest('a[data-section], a[data-section-link]');
        if (!link || !pages.length || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button > 0) return;
        const url = new URL(link.href);
        if (url.origin !== location.origin || url.pathname !== location.pathname) return;
        if (!pages.some(page => `#${page.id}` === url.hash)) return;
        event.preventDefault();
        if (location.hash === url.hash) showPage({ focus: true });
        else location.hash = url.hash;
    });
    setupVideos({
        name: 'reno', id: 'F7F67QGlaaY', start: '107',
        pattern: /\bReno(?:,\s*|\s+)(?:NV|Nevada)\b/i,
        title: 'A Reno detour', videoTitle: "Overly Excited Tourist Finds Reno's Secret Wonders",
        link: 'https://www.youtube.com/watch?v=F7F67QGlaaY&t=107s', linkText: 'watch on YouTube at 1:47'
    });
    setupVideos({
        name: 'new-york', id: '0K39q4GEeVw', host: 'www.youtube-nocookie.com',
        pattern: /\b(?:Brooklyn(?:,\s*NYC)?|New York(?:,\s*NY)?)\b/i,
        title: 'A New York detour', videoTitle: 'Frank Sinatra - (Theme From) New York, New York Live in Tokyo',
        link: 'https://www.youtube.com/watch?v=0K39q4GEeVw', linkText: 'watch on YouTube', rain: true
    });
    window.addEventListener('pagehide', () => videos.forEach(video => video.close()));
    updateMode();
})();
