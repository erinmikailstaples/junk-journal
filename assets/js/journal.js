(() => {
    const root = document.documentElement;
    const toggle = document.querySelector('.mode-toggle');
    const status = document.querySelector('.mode-status');
    const pages = Array.from(document.querySelectorAll('[data-journal-page]'));
    const tabs = Array.from(document.querySelectorAll('[data-section]'));
    const renoVideos = [];

    function setupRenoVideos() {
        const videoUrl = new URL('https://www.youtube.com/embed/F7F67QGlaaY');
        videoUrl.searchParams.set('start', '107');
        videoUrl.searchParams.set('autoplay', '1');
        videoUrl.searchParams.set('mute', '0');
        videoUrl.searchParams.set('playsinline', '1');
        videoUrl.searchParams.set('enablejsapi', '1');
        videoUrl.searchParams.set('origin', location.origin);

        document.querySelectorAll('[data-reno-introduction]').forEach((introduction, index) => {
            const paragraph = introduction.querySelector('p');
            const text = paragraph.textContent;
            const match = /\bReno(?:,\s*|\s+)(?:NV|Nevada)\b/i.exec(text);
            if (!match) return;

            const trigger = document.createElement('button');
            trigger.type = 'button';
            trigger.className = 'reno-video-trigger';
            trigger.textContent = match[0];
            trigger.setAttribute('aria-label', `${match[0]} (play video)`);
            trigger.setAttribute('aria-expanded', 'false');

            const panel = document.createElement('div');
            panel.className = 'reno-video-panel';
            panel.id = `reno-video-${index + 1}`;
            panel.hidden = true;
            trigger.setAttribute('aria-controls', panel.id);

            const head = document.createElement('div');
            head.className = 'reno-video-head';
            const title = document.createElement('strong');
            title.textContent = 'A Reno detour';
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
            frame.className = 'reno-video-frame';
            frame.title = "Overly Excited Tourist Finds Reno's Secret Wonders";
            frame.allow = 'autoplay; encrypted-media; picture-in-picture; web-share';
            frame.referrerPolicy = 'strict-origin-when-cross-origin';
            frame.setAttribute('allowfullscreen', '');

            const help = document.createElement('p');
            help.className = 'reno-video-help';
            help.append("If the video doesn't start, press Play or ");
            const link = document.createElement('a');
            link.href = 'https://www.youtube.com/watch?v=F7F67QGlaaY&t=107s';
            link.textContent = 'watch on YouTube at 1:47';
            help.append(link, '.');
            panel.append(head, frame, help);
            paragraph.replaceChildren(text.slice(0, match.index), trigger, text.slice(match.index + match[0].length));
            introduction.append(panel);

            let pinned = false;
            let dismissOnPointerLeave = false;
            let suppressHover = false;

            function requestPlayback() {
                frame.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), videoUrl.origin);
            }

            function close({ dismiss = false, restoreFocus = false } = {}) {
                if (panel.hidden) return;
                const returnFocus = restoreFocus && panel.contains(document.activeElement) && !introduction.closest('[hidden]');
                panel.hidden = true;
                frame.removeAttribute('src');
                trigger.setAttribute('aria-expanded', 'false');
                pinned = false;
                dismissOnPointerLeave = false;
                if (dismiss) suppressHover = introduction.matches(':hover');
                if (returnFocus) trigger.focus({ preventScroll: true });
            }

            function open({ persist = false, pointer = false } = {}) {
                if (panel.hidden) {
                    renoVideos.forEach(video => video.close({ restoreFocus: true }));
                    panel.hidden = false;
                    trigger.setAttribute('aria-expanded', 'true');
                    frame.src = videoUrl.href;
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
                if (!introduction.contains(document.activeElement) && !introduction.matches(':hover')) return;
                event.preventDefault();
                close({ dismiss: true, restoreFocus: true });
            });
            renoVideos.push({ introduction, close });
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
        renoVideos.forEach(video => {
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
    setupRenoVideos();
    updateMode();
})();
